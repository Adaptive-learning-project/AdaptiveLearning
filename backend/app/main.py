from __future__ import annotations

import datetime
import threading
from typing import Optional, List

from bson import ObjectId
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import ASCENDING

from app.llm_generator import generate_all, generate_fallback

from app.groq_handler import (
    generate_learning_explanation,
    generate_question,
    generate_diagnostic_questions,
    generate_hybrid_content,
)

from app.schemas import (
    AnswerRequest,
    QuestionGenerationRequest,
    DiagnosticRequest,
    HybridRequest,
    StudentSubmitRequest,
    UnitCreateRequest,
    ApproveSubtopicRequest,
    ResolveEscalationRequest,
    DiagnosticSubmitRequest,
    DiagnosticAnswer,
)

from app.database import (
    client,
    content_versions_collection,
    questions_collection,
    mastery_state_collection,
    attempts_collection,
    decisions_collection,
    db,
)

from app.bkt import (
    full_update,
    diagnostic_init,
    apply_prerequisite_gating,
    get_zone,
    is_mastered as bkt_is_mastered,
    DEFAULT_P_L0,
    DEFAULT_P_T,
    DEFAULT_P_G,
    DEFAULT_P_S,
    MASTERY_THRESHOLD,
)

from app.decision import create_decision

from app.adaptive_engine import (
    NodeState,
    decide,
    compute_post_submission_state,
    ESCALATION_THRESHOLD,
)

from app.dag import CurriculumDAG


# ============================================================
# COLLECTION SHORTCUTS  (new adaptive flow)
# ============================================================

units_col          = db["units"]
subtopics_col      = db["subtopics"]
content_col        = db["content"]
bkt_states_col     = db["bkt_states"]
dag_config_col     = db["dag_config"]
student_mastery_col = db["student_mastery"]
escalations_col    = db["escalations"]


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Adaptive Learning Platform",
    description="BKT + DAG + Groq Adaptive Learning API",
    version="6.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HELPERS
# ============================================================

def _oid(value) -> ObjectId:
    """Convert string or ObjectId to ObjectId, raise 400 on failure."""
    try:
        return ObjectId(value) if not isinstance(value, ObjectId) else value
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid id: {value}")


def _load_dag(unit_id: ObjectId) -> CurriculumDAG:
    """
    Load CurriculumDAG for a unit from dag_config_col.
    Falls back to a linear chain from subtopics_col order if no DAG config exists.
    """
    dag = CurriculumDAG()
    config = dag_config_col.find_one({"unit_id": unit_id})
    if config:
        dag.load_from_config(config)
        return dag

    # Fallback: linear chain from subtopics ordered by 'order' field
    subtopics = list(
        subtopics_col.find(
            {"unit_id": unit_id, "content_approved": True},
            {"_id": 1, "name": 1, "order": 1, "is_prerequisite_for": 1},
        ).sort("order", ASCENDING)
    )
    if not subtopics:
        return dag

    for i, sub in enumerate(subtopics):
        prereqs = []
        if i > 0:
            prereqs = [str(subtopics[i - 1]["_id"])]
        dag.add_node(
            subtopic_id=str(sub["_id"]),
            name=sub.get("name", ""),
            prerequisites=prereqs,
        )
    return dag


def _get_bkt_state(student_id: str, subtopic_id: ObjectId, unit_id: ObjectId) -> NodeState:
    """Load or initialise BKT state for a student/subtopic pair."""
    doc = bkt_states_col.find_one(
        {"student_id": student_id, "subtopic_id": subtopic_id}
    )
    if doc:
        return NodeState(
            subtopic_id=str(subtopic_id),
            p_l=doc.get("p_l", DEFAULT_P_L0),
            consecutive_wrong=doc.get("consecutive_wrong", 0),
            hint_dependent=doc.get("hint_dependent", False),
            easy_pass_count=doc.get("easy_pass_count", 0),
            standard_fail_count=doc.get("standard_fail_count", 0),
        )
    # First time — insert default state
    bkt_states_col.insert_one(
        {
            "student_id": student_id,
            "subtopic_id": subtopic_id,
            "unit_id": unit_id,
            "p_l": DEFAULT_P_L0,
            "p_g": DEFAULT_P_G,
            "p_s": DEFAULT_P_S,
            "p_t": DEFAULT_P_T,
            "consecutive_wrong": 0,
            "easy_pass_count": 0,
            "hint_dependent": False,
            "standard_fail_count": 0,
            "status": "active",
            "updated_at": datetime.datetime.utcnow(),
        }
    )
    return NodeState(subtopic_id=str(subtopic_id), p_l=DEFAULT_P_L0)


def _save_bkt_state(student_id: str, subtopic_id: ObjectId, unit_id: ObjectId, state: NodeState):
    """Upsert BKT state back to the database."""
    bkt_states_col.update_one(
        {"student_id": student_id, "subtopic_id": subtopic_id},
        {
            "$set": {
                "p_l": state.p_l,
                "consecutive_wrong": state.consecutive_wrong,
                "hint_dependent": state.hint_dependent,
                "easy_pass_count": state.easy_pass_count,
                "standard_fail_count": state.standard_fail_count,
                "unit_id": unit_id,
                "status": get_zone(state.p_l),
                "updated_at": datetime.datetime.utcnow(),
            }
        },
        upsert=True,
    )


def _get_mastery_map(student_id: str, unit_id: ObjectId) -> dict:
    """Return {subtopic_id_str: p_l} for all subtopics in this unit."""
    states = bkt_states_col.find(
        {"student_id": student_id, "unit_id": unit_id}, {"subtopic_id": 1, "p_l": 1}
    )
    return {str(s["subtopic_id"]): s.get("p_l", DEFAULT_P_L0) for s in states}


def _get_content(subtopic_id: ObjectId, content_type: str) -> Optional[dict]:
    """Fetch approved content of a given type for a subtopic."""
    doc = content_col.find_one(
        {"subtopic_id": subtopic_id, "type": content_type, "approved": True},
        {"data": 1},
    )
    return doc["data"] if doc else None


def _mastery_score(p_l: float) -> int:
    """Convert BKT probability to 0-100 display score."""
    return round(p_l * 100)


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {"message": "Adaptive Learning API is running"}


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():
    try:
        client.admin.command("ping")
        return {"status": "healthy", "mongodb": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "mongodb": "disconnected", "error": str(e)}


# ============================================================
# STUDENT — GET TOPICS
# GET /api/student/topics
# ============================================================

@app.get("/api/student/topics")
def get_student_topics():
    """
    Return all units that have at least one content_approved subtopic.
    Shape expected by the frontend:
      { topics: [ { unit_id, topic, approved_subtopics } ] }
    """
    units = list(units_col.find({}, {"_id": 1, "topic": 1, "status": 1}))
    result = []
    for unit in units:
        uid = unit["_id"]
        approved_count = subtopics_col.count_documents(
            {"unit_id": uid, "content_approved": True}
        )
        if approved_count > 0:
            result.append(
                {
                    "unit_id": str(uid),
                    "topic": unit.get("topic", ""),
                    "approved_subtopics": approved_count,
                }
            )
    return {"topics": result}


# ============================================================
# STUDENT — GET NEXT ACTIVITY
# GET /api/student/next-activity?student_id=...&unit_id=...
# ============================================================

@app.get("/api/student/next-activity")
def get_next_activity(
    student_id: str = Query(...),
    unit_id: str = Query(...),
):
    """
    Use the BKT + DAG adaptive engine to decide what the student sees next.
    Returns content + question for the selected subtopic.
    """
    uid = _oid(unit_id)

    # ── Load DAG ─────────────────────────────────────────────────────────────
    dag = _load_dag(uid)
    if len(dag) == 0:
        raise HTTPException(status_code=404, detail="No approved subtopics for this unit")

    # ── Build mastery map ─────────────────────────────────────────────────────
    mastery_map = _get_mastery_map(student_id, uid)

    # ── Check if all subtopics are mastered ───────────────────────────────────
    all_nodes = dag.all_node_ids()
    if all(mastery_map.get(sid, DEFAULT_P_L0) >= MASTERY_THRESHOLD for sid in all_nodes):
        # Compute per-subtopic summary for the completion screen
        subtopic_summaries = []
        for sid in all_nodes:
            sub = subtopics_col.find_one({"_id": _oid(sid)}, {"name": 1})
            p_l = mastery_map.get(sid, DEFAULT_P_L0)
            bkt_doc = bkt_states_col.find_one(
                {"student_id": student_id, "subtopic_id": _oid(sid)},
                {"status": 1},
            )
            subtopic_summaries.append(
                {
                    "subtopic": sub["name"] if sub else sid,
                    "mastery_score": _mastery_score(p_l),
                    "status": bkt_doc.get("status", "mastered") if bkt_doc else "mastered",
                }
            )
        avg = round(sum(s["mastery_score"] for s in subtopic_summaries) / len(subtopic_summaries)) if subtopic_summaries else 0
        return {
            "completed": True,
            "message": "🎉 You've mastered all topics in this unit!",
            "avg_mastery": avg,
            "subtopics": subtopic_summaries,
        }

    # ── Select active subtopic via DAG ────────────────────────────────────────
    # Start with the first unlocked unmastered node
    unlocked = dag.get_unlocked_nodes(mastery_map)
    if not unlocked:
        # All unlocked nodes are mastered — shouldn't happen after check above,
        # but guard against DAG edge cases
        raise HTTPException(status_code=404, detail="No available subtopic found")

    active_sid_str = unlocked[0]
    active_sid = _oid(active_sid_str)

    # ── Load BKT state ────────────────────────────────────────────────────────
    state = _get_bkt_state(student_id, active_sid, uid)

    # ── Run engine decision ───────────────────────────────────────────────────
    decision = decide(
        current_subtopic_id=active_sid_str,
        state=state,
        dag=dag,
        mastery_map=mastery_map,
    )

    # If engine redirected to a different subtopic (forward/backward), update
    if decision.subtopic_id != active_sid_str:
        active_sid_str = decision.subtopic_id
        active_sid = _oid(active_sid_str)
        state = _get_bkt_state(student_id, active_sid, uid)

    # ── Fetch content ─────────────────────────────────────────────────────────
    content_data = _get_content(active_sid, decision.content_type)
    if content_data is None:
        # Fallback to main_explanation
        content_data = _get_content(active_sid, "main_explanation")
    if content_data is None:
        content_data = {"text": "Content coming soon.", "emoji": "📖"}

    # ── Fetch question ────────────────────────────────────────────────────────
    question_data = _get_content(active_sid, decision.question_type)
    if question_data is None:
        question_data = _get_content(active_sid, "question")
    if question_data is None:
        question_data = {
            "text": "No question available yet for this subtopic.",
            "options": ["A", "B", "C", "D"],
            "correct": 0,
            "explanation": "",
        }

    # ── Fetch hint ────────────────────────────────────────────────────────────
    hint_text = None
    if decision.show_hint:
        hint_doc = _get_content(active_sid, "hint")
        if hint_doc:
            hint_text = hint_doc.get("text", "")

    # ── Progress info ─────────────────────────────────────────────────────────
    done = sum(
        1 for sid in all_nodes if mastery_map.get(sid, DEFAULT_P_L0) >= MASTERY_THRESHOLD
    )

    # ── Subtopic name ─────────────────────────────────────────────────────────
    sub_doc = subtopics_col.find_one({"_id": active_sid}, {"name": 1})
    subtopic_name = sub_doc["name"] if sub_doc else active_sid_str

    return {
        "completed": False,
        "subtopic_id": active_sid_str,
        "subtopic_name": subtopic_name,
        "unit_id": unit_id,
        "mastery_score": _mastery_score(state.p_l),
        "consecutive_wrong": state.consecutive_wrong,
        "show_hint": decision.show_hint,
        "hint": hint_text,
        "message": decision.message,
        "action": decision.action,
        "zone": decision.zone,
        "content": content_data,
        "question": {
            "text": question_data.get("text", ""),
            "options": question_data.get("options", []),
            "correct": question_data.get("correct", 0),   # used server-side only
            "type": decision.question_type,
        },
        "progress": {"done": done, "total": len(all_nodes)},
    }


# ============================================================
# STUDENT — SUBMIT ANSWER
# POST /api/student/submit-answer
# ============================================================

@app.post("/api/student/submit-answer")
def submit_student_answer(request: StudentSubmitRequest):
    """
    Grade the student's answer, run BKT update, persist state.
    Returns feedback + updated mastery.
    """
    uid_str = request.unit_id if request.unit_id else None

    # ── Resolve subtopic ──────────────────────────────────────────────────────
    subtopic_id = _oid(request.subtopic_id)
    sub_doc = subtopics_col.find_one({"_id": subtopic_id}, {"unit_id": 1, "name": 1})
    if sub_doc is None:
        raise HTTPException(status_code=404, detail="Subtopic not found")

    uid = sub_doc["unit_id"]
    subtopic_name = sub_doc.get("name", request.subtopic_id)

    # ── Fetch question to find correct answer ─────────────────────────────────
    # question_type is derived from current BKT state / last shown
    # We check all three question types for this subtopic
    correct_option_index = None
    question_explanation = ""
    for qtype in ("question", "easy_question", "hard_question"):
        q_doc = content_col.find_one(
            {"subtopic_id": subtopic_id, "type": qtype, "approved": True},
            {"data": 1},
        )
        if q_doc:
            correct_option_index = q_doc["data"].get("correct", 0)
            question_explanation = q_doc["data"].get("explanation", "")
            break

    if correct_option_index is None:
        raise HTTPException(status_code=404, detail="No question found for subtopic")

    correct = request.selected_option == correct_option_index

    # ── Load BKT state ────────────────────────────────────────────────────────
    state = _get_bkt_state(request.student_id, subtopic_id, uid)
    old_p_l = state.p_l
    old_mastery_score = _mastery_score(old_p_l)

    # ── BKT update ────────────────────────────────────────────────────────────
    new_p_l = full_update(old_p_l, correct, hint_used=request.hint_used)

    # Determine question type that was shown (for hybrid layer)
    # Derive from current consecutive_wrong / zone
    zone = get_zone(old_p_l)
    if zone == "challenge":
        q_type_shown = "hard_question"
    elif zone == "scaffold":
        # scaffold sequence
        step = min(state.consecutive_wrong, 3)
        q_type_shown = "easy_question" if step >= 1 else "question"
    else:
        q_type_shown = "question"

    # ── Update state ──────────────────────────────────────────────────────────
    mastery_map = _get_mastery_map(request.student_id, uid)
    dag = _load_dag(uid)
    transitioning = new_p_l >= MASTERY_THRESHOLD and old_p_l < MASTERY_THRESHOLD

    state = compute_post_submission_state(
        state=state,
        correct=correct,
        question_type_shown=q_type_shown,
        new_p_l=new_p_l,
        transitioning_node=transitioning,
    )

    # ── Persist BKT state ─────────────────────────────────────────────────────
    _save_bkt_state(request.student_id, subtopic_id, uid, state)

    # ── Escalation check ──────────────────────────────────────────────────────
    escalated = state.consecutive_wrong >= ESCALATION_THRESHOLD

    # ── Groq explanation (best-effort) ────────────────────────────────────────
    explanation = question_explanation  # use pre-generated explanation as default
    try:
        q_doc = content_col.find_one(
            {"subtopic_id": subtopic_id, "type": "question", "approved": True},
            {"data": 1},
        )
        if q_doc:
            ai_exp = generate_learning_explanation(
                question=q_doc["data"].get("text", ""),
                student_answer=str(request.selected_option),
                correct_answer=str(correct_option_index),
                correct=correct,
                mastery_probability=new_p_l,
                difficulty=get_zone(new_p_l),
            )
            if ai_exp and "Unable to generate" not in ai_exp:
                explanation = ai_exp
    except Exception:
        pass  # fall back to stored explanation

    # ── Record attempt ────────────────────────────────────────────────────────
    attempts_collection.insert_one(
        {
            "student_id": request.student_id,
            "subtopic_id": subtopic_id,
            "selected_option": request.selected_option,
            "correct": correct,
            "hint_used": request.hint_used,
            "mastery_before": old_p_l,
            "mastery_after": new_p_l,
            "timestamp": datetime.datetime.utcnow(),
        }
    )

    new_mastery_score = _mastery_score(new_p_l)
    mastery_delta = new_mastery_score - old_mastery_score
    status = get_zone(new_p_l)

    return {
        "correct": correct,
        "correct_option": correct_option_index,
        "explanation": explanation,
        "mastery_score": new_mastery_score,
        "mastery_delta": mastery_delta,
        "previous_mastery": old_mastery_score,
        "p_l": new_p_l,
        "status": status,
        "zone": status,
        "consecutive_wrong": state.consecutive_wrong,
        "escalated": escalated,
        "subtopic_name": subtopic_name,
    }


# ============================================================
# SUBMIT ANSWER (legacy — POST /api/submit)
# ============================================================

@app.post("/api/submit")
def submit_adaptive_answer(request: AnswerRequest):
    question = questions_collection.find_one({"question_id": request.question_id})
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    correct_answer = str(question.get("correct_answer", "")).strip().lower()
    student_answer = str(request.answer).strip().lower()
    correct = student_answer == correct_answer

    content = content_versions_collection.find_one(
        {"content_version_id": question.get("content_version_id")}
    )
    if content is None:
        raise HTTPException(status_code=404, detail="Content version not found")

    subtopic_id = content.get("subtopic_id")
    if subtopic_id is None:
        raise HTTPException(status_code=500, detail="subtopic_id missing in content")

    mastery = mastery_state_collection.find_one(
        {"student_id": request.student_id, "subtopic_id": subtopic_id}
    )

    if mastery is None:
        previous_mastery = DEFAULT_P_L0
        mastery_state_collection.insert_one(
            {
                "student_id": request.student_id,
                "subtopic_id": subtopic_id,
                "mastery_probability": previous_mastery,
            }
        )
    else:
        previous_mastery = mastery.get("mastery_probability", DEFAULT_P_L0)

    new_mastery = full_update(previous_mastery, correct)

    mastery_state_collection.update_one(
        {"student_id": request.student_id, "subtopic_id": subtopic_id},
        {"$set": {"mastery_probability": new_mastery}},
    )

    attempts_collection.insert_one(
        {
            "student_id": request.student_id,
            "question_id": request.question_id,
            "subtopic_id": subtopic_id,
            "correct": correct,
            "previous_mastery": previous_mastery,
            "new_mastery": new_mastery,
        }
    )

    decision = create_decision(
        student_id=request.student_id,
        subtopic_id=subtopic_id,
        mastery_probability=new_mastery,
    )
    decisions_collection.insert_one(decision)

    try:
        explanation = generate_learning_explanation(
            question=question.get("question", ""),
            student_answer=request.answer,
            correct_answer=question.get("correct_answer", ""),
            correct=correct,
            mastery_probability=new_mastery,
            difficulty=decision["difficulty"],
        )
    except Exception as e:
        explanation = "Unable to generate AI explanation: " + str(e)

    return {
        "student_id": request.student_id,
        "question_id": request.question_id,
        "subtopic_id": subtopic_id,
        "student_answer": request.answer,
        "correct_answer": question.get("correct_answer"),
        "correct": correct,
        "previous_mastery": previous_mastery,
        "new_mastery": new_mastery,
        "mastery_percentage": round(new_mastery * 100, 2),
        "status": decision["status"],
        "difficulty": decision["difficulty"],
        "reason": decision["reason"],
        "ai_explanation": explanation,
        "decision": decision,
    }


# ============================================================
# GENERATE PERSONALIZED QUESTION
# ============================================================

@app.post("/api/generate-question")
def generate_adaptive_question(request: QuestionGenerationRequest):
    try:
        result = generate_question(
            topic=request.topic,
            subtopic=request.subtopic,
            difficulty=request.difficulty,
            mastery_probability=request.mastery_probability,
            interest=request.interest,
        )
        return {
            "success": True,
            "source": "Groq Personalized Question Generator",
            "topic": request.topic,
            "subtopic": request.subtopic,
            "mastery_probability": request.mastery_probability,
            "mastery_percentage": round(request.mastery_probability * 100, 2),
            "difficulty": request.difficulty,
            "interest": request.interest,
            "generated_question": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# STUDENT — GET DIAGNOSTIC QUESTIONS
# GET /api/student/diagnostic?student_id=...&unit_id=...
# ============================================================

@app.get("/api/student/diagnostic")
def get_diagnostic_questions(
    student_id: str = Query(...),
    unit_id: str = Query(...),
):
    """
    Return one diagnostic question per approved subtopic for a unit.
    Only served if the student has NOT already completed the diagnostic
    for this unit (i.e., no bkt_states seeded from diagnostic).

    Response shape:
      {
        "already_completed": bool,
        "unit_id": str,
        "topic": str,
        "questions": [
          { "subtopic_id", "subtopic_name", "order",
            "text", "options": [...], "correct_answer_index": int }
        ]
      }

    NOTE: correct_answer_index is included here so the submit endpoint
    can grade without a second DB lookup — the frontend must NOT expose it.
    """
    uid = _oid(unit_id)

    # Check if student already completed diagnostic for this unit
    existing = bkt_states_col.find_one(
        {"student_id": student_id, "unit_id": uid, "seeded_by_diagnostic": True}
    )
    if existing:
        return {"already_completed": True, "unit_id": unit_id}

    # Fetch approved subtopics in order
    subtopics = list(
        subtopics_col.find(
            {"unit_id": uid, "content_approved": True},
            {"_id": 1, "name": 1, "order": 1},
        ).sort("order", ASCENDING)
    )
    if not subtopics:
        raise HTTPException(status_code=404, detail="No approved subtopics for this unit")

    unit = units_col.find_one({"_id": uid}, {"topic": 1})
    topic = unit.get("topic", "") if unit else ""

    questions = []
    for sub in subtopics:
        sub_id = sub["_id"]
        # Fetch the pre-generated diagnostic_question content piece
        doc = content_col.find_one(
            {"subtopic_id": sub_id, "type": "diagnostic_question", "approved": True},
            {"data": 1},
        )
        if doc is None:
            # Fallback: use easy_question if no diagnostic_question exists yet
            doc = content_col.find_one(
                {"subtopic_id": sub_id, "type": "easy_question", "approved": True},
                {"data": 1},
            )
        if doc is None:
            continue

        data = doc.get("data", {})
        questions.append({
            "subtopic_id":        str(sub_id),
            "subtopic_name":      sub.get("name", ""),
            "order":              sub.get("order", 0),
            "text":               data.get("text", ""),
            "options":            data.get("options", []),
            "correct_answer_index": data.get("correct", 0),  # server-side only
        })

    return {
        "already_completed": False,
        "unit_id": unit_id,
        "topic": topic,
        "questions": questions,
    }


# ============================================================
# STUDENT — SUBMIT DIAGNOSTIC ANSWERS
# POST /api/student/diagnostic/submit
# ============================================================

@app.post("/api/student/diagnostic/submit")
def submit_diagnostic_answers(request: DiagnosticSubmitRequest):
    """
    Grade all diagnostic answers for a unit and seed BKT states via
    diagnostic_init() + apply_prerequisite_gating().

    Algorithm:
      1. For each subtopic answer, grade correct/wrong.
      2. Run bkt.diagnostic_init(correct) to get initial P(L1).
      3. Build DAG and apply bkt.apply_prerequisite_gating() to child nodes
         whose parents were answered incorrectly.
      4. Upsert all bkt_states with seeded_by_diagnostic=True.
      5. Return per-subtopic results so the frontend can show a summary.
    """
    uid = _oid(request.unit_id)

    # Check already done
    existing = bkt_states_col.find_one(
        {"student_id": request.student_id, "unit_id": uid, "seeded_by_diagnostic": True}
    )
    if existing:
        return {"already_completed": True, "unit_id": request.unit_id}

    # ── Fetch correct answers from DB ─────────────────────────────────────────
    answer_map: dict = {}          # subtopic_id_str → selected_option (int)
    correct_map: dict = {}         # subtopic_id_str → bool
    correct_answer_map: dict = {}  # subtopic_id_str → correct index

    for ans in request.answers:
        sub_id = _oid(ans.subtopic_id)
        # Find the diagnostic_question (or fallback easy_question) correct answer
        doc = content_col.find_one(
            {"subtopic_id": sub_id, "type": "diagnostic_question", "approved": True},
            {"data.correct": 1},
        )
        if doc is None:
            doc = content_col.find_one(
                {"subtopic_id": sub_id, "type": "easy_question", "approved": True},
                {"data.correct": 1},
            )
        if doc is None:
            continue

        correct_idx = doc["data"].get("correct", 0)
        is_correct = (ans.selected_option == correct_idx)

        answer_map[ans.subtopic_id]        = ans.selected_option
        correct_map[ans.subtopic_id]       = is_correct
        correct_answer_map[ans.subtopic_id] = correct_idx

    if not correct_map:
        raise HTTPException(status_code=400, detail="No gradeable answers found")

    # ── Build DAG for prerequisite gating ────────────────────────────────────
    dag = _load_dag(uid)

    # ── Run diagnostic_init per subtopic ─────────────────────────────────────
    seeded_p_l: dict = {}  # subtopic_id_str → p_l after diagnostic_init
    for sid, is_correct in correct_map.items():
        seeded_p_l[sid] = diagnostic_init(correct=is_correct)

    # ── Apply prerequisite gating ─────────────────────────────────────────────
    # For every subtopic, walk its prerequisites. If a parent was answered
    # wrong in the diagnostic, gate the child back to scaffold zone.
    gated_p_l: dict = dict(seeded_p_l)

    topo_order = dag.topological_sort() if len(dag) > 0 else list(correct_map.keys())

    for sid in topo_order:
        if sid not in gated_p_l:
            continue
        prereqs = dag.get_prerequisites(sid)
        for parent_sid in prereqs:
            parent_correct = correct_map.get(parent_sid, True)
            gated_p_l[sid] = apply_prerequisite_gating(
                child_p_l=gated_p_l[sid],
                parent_correct_in_diagnostic=parent_correct,
            )

    # ── Upsert bkt_states ─────────────────────────────────────────────────────
    now = datetime.datetime.utcnow()
    results = []

    for sid, p_l in gated_p_l.items():
        sub_id_obj = _oid(sid)
        zone = get_zone(p_l)

        bkt_states_col.update_one(
            {"student_id": request.student_id, "subtopic_id": sub_id_obj},
            {
                "$set": {
                    "student_id":           request.student_id,
                    "subtopic_id":          sub_id_obj,
                    "unit_id":              uid,
                    "p_l":                  p_l,
                    "p_g":                  DEFAULT_P_G,
                    "p_s":                  DEFAULT_P_S,
                    "p_t":                  DEFAULT_P_T,
                    "consecutive_wrong":    0,
                    "easy_pass_count":      0,
                    "hint_dependent":       False,
                    "standard_fail_count":  0,
                    "status":               zone,
                    "seeded_by_diagnostic": True,
                    "diagnostic_correct":   correct_map.get(sid, False),
                    "updated_at":           now,
                }
            },
            upsert=True,
        )

        # Look up subtopic name for response
        sub_doc = subtopics_col.find_one({"_id": sub_id_obj}, {"name": 1})

        results.append({
            "subtopic_id":    sid,
            "subtopic_name":  sub_doc["name"] if sub_doc else sid,
            "correct":        correct_map.get(sid, False),
            "p_l":            round(p_l, 4),
            "mastery_score":  _mastery_score(p_l),
            "zone":           zone,
            "gated":          gated_p_l[sid] < seeded_p_l[sid],  # True if prereq pulled it down
        })

    # Sort by subtopic order for display
    results.sort(key=lambda r: r.get("subtopic_id", ""))

    correct_count = sum(1 for r in results if r["correct"])
    total_count   = len(results)

    return {
        "student_id":    request.student_id,
        "unit_id":       request.unit_id,
        "total":         total_count,
        "correct_count": correct_count,
        "score_pct":     round(correct_count / total_count * 100) if total_count else 0,
        "results":       results,
        "message":       (
            f"Diagnostic complete! {correct_count}/{total_count} correct. "
            f"Learning path has been personalised."
        ),
    }


# ============================================================
# DIAGNOSTIC QUESTIONS (legacy — stateless, no BKT)
# ============================================================

@app.post("/api/diagnostic")
def generate_diagnostic(request: DiagnosticRequest):
    try:
        result = generate_diagnostic_questions(
            topic=request.topic,
            subtopic=request.subtopic,
            number_of_questions=request.number_of_questions,
            interest=request.interest,
        )
        questions = result.get("questions", [])
        if not isinstance(questions, list):
            questions = []
        questions = questions[: request.number_of_questions]
        return {
            "success": True,
            "source": "Groq Personalized Diagnostic Generator",
            "topic": request.topic,
            "subtopic": request.subtopic,
            "number_of_questions": request.number_of_questions,
            "interest": request.interest,
            "generated_question_count": len(questions),
            "diagnostic": {
                "topic": request.topic,
                "subtopic": request.subtopic,
                "interest": request.interest,
                "questions": questions,
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Diagnostic question generation failed: " + str(e),
        )


# ============================================================
# HYBRID ADAPTIVE CONTENT
# ============================================================

@app.post("/api/hybrid")
def hybrid_adaptive_content(request: HybridRequest):
    try:
        result = generate_hybrid_content(
            topic=request.topic,
            subtopic=request.subtopic,
            mastery_probability=request.mastery_probability,
            previous_question=request.previous_question,
            interest=request.interest,
        )
        return {
            "success": True,
            "architecture": "BKT + Rule-based Decision + Groq",
            "hybrid_result": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# GET MASTERY
# ============================================================

@app.get("/mastery/{student_id}")
def get_student_mastery(student_id: int):
    records = list(
        mastery_state_collection.find({"student_id": student_id}, {"_id": 0})
    )
    return {"student_id": student_id, "mastery_records": records}


# ============================================================
# GET ATTEMPTS
# ============================================================

@app.get("/attempts/{student_id}")
def get_student_attempts(student_id: int):
    records = list(
        attempts_collection.find({"student_id": student_id}, {"_id": 0})
    )
    return {"student_id": student_id, "attempts": records}


# ============================================================
# GET DECISIONS
# ============================================================

@app.get("/decisions/{student_id}")
def get_student_decisions(student_id: int):
    records = list(
        decisions_collection.find({"student_id": student_id}, {"_id": 0})
    )
    return {"student_id": student_id, "decisions": records}



# ============================================================
# STUDENT — MASTERY SUMMARY
# GET /api/student/mastery?student_id=...&unit_id=...
# ============================================================

@app.get("/api/student/mastery")
def get_student_mastery_summary(
    student_id: str = Query(...),
    unit_id: str = Query(...),
):
    """
    Return per-subtopic mastery scores for a student in a unit.
    """
    uid = _oid(unit_id)
    mastery_map = _get_mastery_map(student_id, uid)

    subtopics = list(
        subtopics_col.find(
            {"unit_id": uid},
            {"_id": 1, "name": 1, "order": 1},
        ).sort("order", ASCENDING)
    )

    result = []
    for sub in subtopics:
        sid = str(sub["_id"])
        p_l = mastery_map.get(sid, 0.0)
        result.append({
            "subtopic_id": sid,
            "subtopic_name": sub.get("name", sid),
            "order": sub.get("order", 0),
            "p_l": p_l,
            "mastery_score": _mastery_score(p_l),
            "zone": get_zone(p_l),
        })

    avg = round(sum(r["mastery_score"] for r in result) / len(result)) if result else 0

    return {
        "student_id": student_id,
        "unit_id": unit_id,
        "avg_mastery": avg,
        "subtopics": result,
    }


# ============================================================
# TEACHER — LIST / CREATE UNITS
# GET  /api/teacher/units?teacher_id=...
# POST /api/teacher/units
# ============================================================

@app.get("/api/teacher/units")
def list_teacher_units(teacher_id: str = Query(...)):
    """Return all units created by this teacher."""
    units = list(
        units_col.find(
            {"teacher_id": teacher_id},
            {"_id": 1, "topic": 1, "status": 1, "created_at": 1},
        ).sort("created_at", -1)
    )
    return {
        "units": [
            {
                "_id": str(u["_id"]),
                "topic": u.get("topic", ""),
                "status": u.get("status", "pending"),
                "created_at": u.get("created_at", "").isoformat()
                if isinstance(u.get("created_at"), datetime.datetime)
                else str(u.get("created_at", "")),
            }
            for u in units
        ]
    }


@app.post("/api/teacher/units")
def create_teacher_unit(request: UnitCreateRequest):
    """
    Create a new unit with subtopics (no content yet).
    The teacher calls generate next to trigger LLM content generation.
    """
    now = datetime.datetime.utcnow()

    # Create unit document
    unit_doc = {
        "teacher_id": request.teacher_id,
        "topic": request.topic,
        "reference_text": request.reference_text or "",
        "status": "pending",       # pending → generating → ready
        "created_at": now,
        "updated_at": now,
    }
    unit_result = units_col.insert_one(unit_doc)
    unit_id = unit_result.inserted_id

    # Create subtopic documents in order
    for i, name in enumerate(request.subtopics):
        subtopics_col.insert_one({
            "unit_id": unit_id,
            "name": name,
            "order": i,
            "content_approved": False,
            "created_at": now,
        })

    return {
        "unit_id": str(unit_id),
        "topic": request.topic,
        "subtopic_count": len(request.subtopics),
        "status": "pending",
    }


# ============================================================
# TEACHER — TRIGGER LLM CONTENT GENERATION
# POST /api/teacher/units/{unit_id}/generate
# ============================================================

def _run_generation(unit_id: ObjectId, topic: str, reference_text: str):
    """
    Background thread: generate all content for every subtopic in the unit.
    Each content piece is stored in content_col with approved=False.
    Unit status is set to 'ready' when all subtopics are done.
    """
    now = datetime.datetime.utcnow()

    # Mark as generating
    units_col.update_one(
        {"_id": unit_id},
        {"$set": {"status": "generating", "updated_at": now}},
    )

    subtopics = list(
        subtopics_col.find(
            {"unit_id": unit_id},
            {"_id": 1, "name": 1, "order": 1},
        ).sort("order", ASCENDING)
    )

    for sub in subtopics:
        sub_id = sub["_id"]
        sub_name = sub.get("name", "")

        print(f"[LLM] Generating content for subtopic: {sub_name}")

        try:
            pieces = generate_all(
                topic=topic,
                subtopic=sub_name,
                reference_text=reference_text,
            )
        except Exception as exc:
            print(f"[LLM] generate_all failed for '{sub_name}': {exc} — using fallback")
            pieces = generate_fallback(topic=topic, subtopic=sub_name)

        # Store each content piece
        for content_type, data in pieces.items():
            # Remove any existing draft for this subtopic+type
            content_col.delete_many(
                {"subtopic_id": sub_id, "type": content_type, "approved": False}
            )
            content_col.insert_one({
                "subtopic_id": sub_id,
                "unit_id": unit_id,
                "type": content_type,
                "data": data,
                "approved": False,
                "created_at": datetime.datetime.utcnow(),
            })

    # Mark unit ready for review
    units_col.update_one(
        {"_id": unit_id},
        {"$set": {"status": "ready", "updated_at": datetime.datetime.utcnow()}},
    )
    print(f"[LLM] Unit {unit_id} generation complete → status: ready")


@app.post("/api/teacher/units/{unit_id}/generate")
def generate_unit_content(unit_id: str):
    """
    Trigger LLM generation for all subtopics in a unit.
    Runs in a background thread; poll /status to check progress.
    """
    uid = _oid(unit_id)
    unit = units_col.find_one({"_id": uid}, {"topic": 1, "reference_text": 1, "status": 1})
    if unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")

    if unit.get("status") == "generating":
        return {"message": "Already generating", "status": "generating"}

    topic = unit.get("topic", "")
    reference_text = unit.get("reference_text", "")

    # Fire and forget in background thread so the endpoint returns immediately
    t = threading.Thread(
        target=_run_generation,
        args=(uid, topic, reference_text),
        daemon=True,
    )
    t.start()

    return {"message": "Content generation started", "unit_id": unit_id, "status": "generating"}


# ============================================================
# TEACHER — UNIT STATUS
# GET /api/teacher/units/{unit_id}/status
# ============================================================

@app.get("/api/teacher/units/{unit_id}/status")
def get_unit_status(unit_id: str):
    """Poll generation status: pending | generating | ready"""
    uid = _oid(unit_id)
    unit = units_col.find_one({"_id": uid}, {"status": 1, "topic": 1})
    if unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {
        "unit_id": unit_id,
        "topic": unit.get("topic", ""),
        "status": unit.get("status", "pending"),
    }


# ============================================================
# TEACHER — REVIEW CONTENT
# GET /api/teacher/units/{unit_id}/review
# ============================================================

@app.get("/api/teacher/units/{unit_id}/review")
def review_unit_content(unit_id: str):
    """
    Return all subtopics with their generated content for teacher review.
    """
    uid = _oid(unit_id)
    unit = units_col.find_one({"_id": uid}, {"topic": 1, "status": 1})
    if unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")

    subtopics = list(
        subtopics_col.find(
            {"unit_id": uid},
            {"_id": 1, "name": 1, "order": 1, "content_approved": 1},
        ).sort("order", ASCENDING)
    )

    result = []
    for sub in subtopics:
        sub_id = sub["_id"]
        content_pieces = list(
            content_col.find(
                {"subtopic_id": sub_id},
                {"type": 1, "data": 1, "approved": 1},
            )
        )
        result.append({
            "subtopic_id": str(sub_id),
            "name": sub.get("name", ""),
            "order": sub.get("order", 0),
            "content_approved": sub.get("content_approved", False),
            "content": [
                {
                    "type": c["type"],
                    "data": c.get("data", {}),
                    "approved": c.get("approved", False),
                }
                for c in content_pieces
            ],
        })

    return {
        "unit_id": unit_id,
        "topic": unit.get("topic", ""),
        "status": unit.get("status", "pending"),
        "subtopics": result,
    }


# ============================================================
# TEACHER — APPROVE SUBTOPIC (publishes content to students)
# POST /api/teacher/approve
# ============================================================

@app.post("/api/teacher/approve")
def approve_subtopic(request: ApproveSubtopicRequest):
    """
    Approve all content for a subtopic — makes it visible to students.
    Sets content_approved=True on the subtopic and approved=True on all content pieces.
    """
    sub_id = _oid(request.subtopic_id)
    sub = subtopics_col.find_one({"_id": sub_id}, {"unit_id": 1, "name": 1})
    if sub is None:
        raise HTTPException(status_code=404, detail="Subtopic not found")

    # Approve all content pieces for this subtopic
    content_col.update_many(
        {"subtopic_id": sub_id},
        {"$set": {"approved": True}},
    )

    # Mark subtopic as approved
    subtopics_col.update_one(
        {"_id": sub_id},
        {"$set": {"content_approved": True, "approved_at": datetime.datetime.utcnow()}},
    )

    return {
        "subtopic_id": request.subtopic_id,
        "name": sub.get("name", ""),
        "content_approved": True,
    }


# ============================================================
# TEACHER — LIST ESCALATIONS
# GET /api/teacher/escalations
# ============================================================

@app.get("/api/teacher/escalations")
def get_escalations():
    """
    Return all unresolved student escalations.
    An escalation is created when a student hits consecutive_wrong >= 5.
    """
    # Derive escalations from bkt_states_col where consecutive_wrong >= ESCALATION_THRESHOLD
    # Also check manual escalation docs in escalations_col
    raw_escalations = list(
        escalations_col.find(
            {"resolved": {"$ne": True}},
            {"_id": 1, "student_id": 1, "subtopic_id": 1, "subtopic_name": 1,
             "mastery_score": 1, "attempt_count": 1, "created_at": 1},
        ).sort("created_at", -1)
    )

    # Also pull from bkt_states where consecutive_wrong >= threshold and no escalation doc yet
    stuck_states = list(
        bkt_states_col.find(
            {"consecutive_wrong": {"$gte": ESCALATION_THRESHOLD}},
            {"_id": 0, "student_id": 1, "subtopic_id": 1, "unit_id": 1,
             "p_l": 1, "consecutive_wrong": 1},
        )
    )

    # Merge: create escalation docs for stuck states that don't have one yet
    for state in stuck_states:
        existing = escalations_col.find_one({
            "student_id": state["student_id"],
            "subtopic_id": state["subtopic_id"],
            "resolved": {"$ne": True},
        })
        if existing:
            continue

        # Look up subtopic name
        sub = subtopics_col.find_one({"_id": state["subtopic_id"]}, {"name": 1})
        sub_name = sub["name"] if sub else str(state["subtopic_id"])

        # Count attempts
        attempt_count = attempts_collection.count_documents({
            "student_id": state["student_id"],
            "subtopic_id": state["subtopic_id"],
        })

        doc = {
            "student_id": state["student_id"],
            "subtopic_id": state["subtopic_id"],
            "unit_id": state.get("unit_id"),
            "subtopic_name": sub_name,
            "mastery_score": _mastery_score(state.get("p_l", 0.0)),
            "attempt_count": attempt_count,
            "resolved": False,
            "created_at": datetime.datetime.utcnow(),
        }
        result = escalations_col.insert_one(doc)
        doc["_id"] = result.inserted_id
        raw_escalations.append(doc)

    return {
        "escalations": [
            {
                "_id": str(e["_id"]),
                "student_id": e.get("student_id", ""),
                "subtopic_name": e.get("subtopic_name", ""),
                "mastery_score": e.get("mastery_score", 0),
                "attempt_count": e.get("attempt_count", 0),
                "created_at": e.get("created_at", "").isoformat()
                if isinstance(e.get("created_at"), datetime.datetime)
                else str(e.get("created_at", "")),
            }
            for e in raw_escalations
        ]
    }


# ============================================================
# TEACHER — RESOLVE ESCALATION  (unblocks student)
# POST /api/teacher/escalations/resolve
# ============================================================

@app.post("/api/teacher/escalations/resolve")
def resolve_escalation(request: ResolveEscalationRequest):
    """
    Resolve an escalation: marks it resolved and resets the student's
    consecutive_wrong counter so they can continue.
    Optionally skips the subtopic by advancing their mastery past threshold.
    """
    esc_id = _oid(request.escalation_id)
    esc = escalations_col.find_one({"_id": esc_id})
    if esc is None:
        raise HTTPException(status_code=404, detail="Escalation not found")

    student_id = esc.get("student_id")
    subtopic_id = esc.get("subtopic_id")

    # Reset consecutive_wrong in bkt_states so student is unblocked
    if student_id and subtopic_id:
        bkt_states_col.update_one(
            {"student_id": student_id, "subtopic_id": subtopic_id},
            {
                "$set": {
                    "consecutive_wrong": 0,
                    "status": "active",
                    "updated_at": datetime.datetime.utcnow(),
                }
            },
        )

    # Mark escalation resolved
    escalations_col.update_one(
        {"_id": esc_id},
        {
            "$set": {
                "resolved": True,
                "resolved_at": datetime.datetime.utcnow(),
                "teacher_note": request.teacher_note or "",
            }
        },
    )

    return {
        "escalation_id": request.escalation_id,
        "resolved": True,
        "student_id": student_id,
        "teacher_note": request.teacher_note or "",
    }
