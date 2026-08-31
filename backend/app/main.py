from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId
from datetime import datetime, timezone
import traceback

from app.database import (
    units_col, subtopics_col, content_col,
    mastery_col, attempts_col, escalations_col,
    bkt_states_col, dag_config_col, student_profiles_col,
)
from app.schemas import (
    CreateUnitRequest, ApproveContentRequest,
    SubmitAnswerRequest, ResolveEscalationRequest,
    OnboardingRequest, DiagnosticSubmitRequest,
)
from app.bkt import (
    full_update, diagnostic_init, apply_prerequisite_gating,
    get_zone, is_mastered as bkt_is_mastered,
    DEFAULT_P_L0, DEFAULT_P_T, DEFAULT_P_G, DEFAULT_P_S,
    MASTERY_THRESHOLD,
)
from app.dag import CurriculumDAG
from app.adaptive_engine import (
    decide, compute_post_submission_state, select_next_node,
    NodeState, Reason,
)

app = FastAPI(title="Adaptive Learning API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Utilities ──────────────────────────────────────────────────────────────────

def _oid(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def _now():
    return datetime.now(timezone.utc)

def _mastery_score_from_p_l(p_l: float) -> int:
    """Convert P(L) to legacy integer mastery score for frontend compatibility."""
    return int(round(p_l * 100))

def _load_dag(unit_id: str) -> CurriculumDAG:
    """
    Load the CurriculumDAG for a unit from dag_config_col.
    Falls back to a linear DAG built from subtopics order if no config exists.
    """
    dag = CurriculumDAG()
    config = dag_config_col.find_one({"unit_id": unit_id})
    if config:
        dag.load_from_config(config)
    else:
        # Fallback: build a linear chain from subtopics in order
        subs = list(subtopics_col.find(
            {"unit_id": unit_id, "content_approved": True}
        ).sort("order", 1))
        prev_id = None
        for sub in subs:
            sid = str(sub["_id"])
            dag.add_node(
                subtopic_id=sid,
                name=sub["name"],
                prerequisites=[prev_id] if prev_id else [],
            )
            prev_id = sid
    return dag

def _load_bkt_states(student_id: str, unit_id: str) -> dict:
    """
    Load all BKT states for a student in a unit.
    Returns dict: subtopic_id → NodeState.
    Missing nodes default to P(L0)=0.10.
    """
    subs = list(subtopics_col.find({"unit_id": unit_id}))
    states = {}
    for sub in subs:
        sid = str(sub["_id"])
        doc = bkt_states_col.find_one({"student_id": student_id, "subtopic_id": sid})
        if doc:
            states[sid] = NodeState(
                subtopic_id=sid,
                p_l=doc.get("p_l", DEFAULT_P_L0),
                consecutive_wrong=doc.get("consecutive_wrong", 0),
                hint_dependent=doc.get("hint_dependent", False),
                easy_pass_count=doc.get("easy_pass_count", 0),
                standard_fail_count=doc.get("standard_fail_count", 0),
            )
        else:
            states[sid] = NodeState(subtopic_id=sid, p_l=DEFAULT_P_L0)
    return states

def _save_bkt_state(student_id: str, unit_id: str, state: NodeState) -> None:
    """Persist a single NodeState to bkt_states_col."""
    bkt_states_col.update_one(
        {"student_id": student_id, "subtopic_id": state.subtopic_id},
        {"$set": {
            "student_id":          student_id,
            "unit_id":             unit_id,
            "subtopic_id":         state.subtopic_id,
            "p_l":                 state.p_l,
            "p_t":                 DEFAULT_P_T,
            "p_g":                 DEFAULT_P_G,
            "p_s":                 DEFAULT_P_S,
            "consecutive_wrong":   state.consecutive_wrong,
            "hint_dependent":      state.hint_dependent,
            "easy_pass_count":     state.easy_pass_count,
            "standard_fail_count": state.standard_fail_count,
            "status":              "mastered" if bkt_is_mastered(state.p_l) else "active",
            "updated_at":          _now(),
        }},
        upsert=True,
    )

def _mastery_map(states: dict) -> dict:
    """Extract subtopic_id → P(L) float map from NodeState dict."""
    return {sid: s.p_l for sid, s in states.items()}


# ── HEALTH ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    try:
        from app.database import client
        client.admin.command("ping")
        return {"status": "healthy", "mongodb": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# TEACHER — CREATE UNIT
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/teacher/units")
def create_unit(req: CreateUnitRequest):
    unit = {
        "teacher_id":     req.teacher_id,
        "topic":          req.topic,
        "reference_text": req.reference_text,
        "status":         "generating",
        "created_at":     _now(),
    }
    unit_id = str(units_col.insert_one(unit).inserted_id)

    subtopic_ids = []
    for i, name in enumerate(req.subtopics):
        sub = {
            "unit_id":    unit_id,
            "topic":      req.topic,
            "name":       name,
            "order":      i,
            "content_approved": False,
            "created_at": _now(),
        }
        sub_id = str(subtopics_col.insert_one(sub).inserted_id)
        subtopic_ids.append(sub_id)

    # Build a default linear DAG config and persist it
    # Teachers can override via /api/teacher/units/{unit_id}/dag
    dag = CurriculumDAG()
    prev_id = None
    subs_docs = list(subtopics_col.find({"unit_id": unit_id}).sort("order", 1))
    for sub in subs_docs:
        sid = str(sub["_id"])
        dag.add_node(sid, sub["name"], prerequisites=[prev_id] if prev_id else [])
        prev_id = sid

    dag_config_col.update_one(
        {"unit_id": unit_id},
        {"$set": dag.to_config(unit_id)},
        upsert=True,
    )

    return {
        "unit_id":      unit_id,
        "subtopic_ids": subtopic_ids,
        "message":      f"Unit created with {len(subtopic_ids)} subtopics.",
    }


# ── TRIGGER LLM GENERATION ────────────────────────────────────────────────────

@app.post("/api/teacher/units/{unit_id}/generate")
def generate_content(unit_id: str, background_tasks: BackgroundTasks):
    unit = units_col.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(404, "Unit not found")
    reference_text = unit.get("reference_text", "") or ""
    background_tasks.add_task(_generate_all_content, unit_id, unit["topic"], reference_text)
    return {"message": "Generation started."}


def _generate_all_content(unit_id: str, topic: str, reference_text: str = ""):
    from app.llm_generator import generate_all, generate_fallback

    subs = list(subtopics_col.find({"unit_id": unit_id}))
    for sub in subs:
        sub_id = str(sub["_id"])
        try:
            generated = generate_all(topic, sub["name"], reference_text)
        except Exception:
            traceback.print_exc()
            generated = generate_fallback(topic, sub["name"])

        for ctype, cdata in generated.items():
            content_col.update_one(
                {"subtopic_id": sub_id, "type": ctype},
                {"$set": {
                    "subtopic_id":    sub_id,
                    "unit_id":        unit_id,
                    "topic":          topic,
                    "subtopic_name":  sub["name"],
                    "type":           ctype,
                    "data":           cdata,
                    "approved":       False,
                    "updated_at":     _now(),
                }},
                upsert=True,
            )
        subtopics_col.update_one(
            {"_id": ObjectId(sub_id)},
            {"$set": {"generation_status": "done"}}
        )

    units_col.update_one(
        {"_id": ObjectId(unit_id)},
        {"$set": {"status": "ready"}}
    )


# ── UNIT STATUS & REVIEW ──────────────────────────────────────────────────────

@app.get("/api/teacher/units/{unit_id}/status")
def unit_status(unit_id: str):
    unit = units_col.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(404, "Unit not found")
    return {"status": unit.get("status", "unknown"), "topic": unit["topic"]}


@app.get("/api/teacher/units/{unit_id}/review")
def review_content(unit_id: str):
    subs = list(subtopics_col.find(
        {"unit_id": unit_id},
        {"_id": 1, "name": 1, "order": 1, "content_approved": 1}
    ))
    result = []
    for sub in subs:
        sub_id = str(sub["_id"])
        pieces = list(content_col.find({"subtopic_id": sub_id}))
        result.append({
            "subtopic_id":      sub_id,
            "name":             sub["name"],
            "order":            sub["order"],
            "content_approved": sub.get("content_approved", False),
            "content": [
                {"type": p["type"], "data": p["data"], "approved": p.get("approved", False)}
                for p in pieces
            ],
        })
    result.sort(key=lambda x: x["order"])
    return {"unit_id": unit_id, "subtopics": result}


@app.post("/api/teacher/approve")
def approve_subtopic(req: ApproveContentRequest):
    content_col.update_many(
        {"subtopic_id": req.subtopic_id},
        {"$set": {"approved": True}}
    )
    subtopics_col.update_one(
        {"_id": ObjectId(req.subtopic_id)},
        {"$set": {"content_approved": True}}
    )
    return {"message": "Subtopic approved and live for students."}


@app.get("/api/teacher/units")
def list_units(teacher_id: str):
    units = list(units_col.find({"teacher_id": teacher_id}))
    return {"units": [_oid(u) for u in units]}


# ── ESCALATION DASHBOARD ──────────────────────────────────────────────────────

@app.get("/api/teacher/escalations")
def get_escalations():
    escs = list(escalations_col.find({"resolved": False}).sort("created_at", -1))
    return {"escalations": [_oid(e) for e in escs]}


@app.post("/api/teacher/escalations/resolve")
def resolve_escalation(req: ResolveEscalationRequest):
    esc = escalations_col.find_one({"_id": ObjectId(req.escalation_id)})
    if not esc:
        raise HTTPException(404, "Escalation not found")
    escalations_col.update_one(
        {"_id": ObjectId(req.escalation_id)},
        {"$set": {"resolved": True, "teacher_note": req.teacher_note, "resolved_at": _now()}}
    )
    # Reset BKT state so student can continue
    bkt_states_col.update_one(
        {"student_id": esc["student_id"], "subtopic_id": esc["subtopic_id"]},
        {"$set": {
            "consecutive_wrong":   0,
            "hint_dependent":      False,
            "easy_pass_count":     0,
            "standard_fail_count": 0,
            "status":              "active",
            "updated_at":          _now(),
        }}
    )
    # Also reset legacy mastery record
    mastery_col.update_one(
        {"student_id": esc["student_id"], "subtopic_id": esc["subtopic_id"]},
        {"$set": {"consecutive_wrong": 0, "escalated": False, "status": "skipped"}}
    )
    return {"message": "Student unblocked."}


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT — ONBOARDING
# Stores interest tag; must be called before diagnostic.
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/student/onboarding")
def student_onboarding(req: OnboardingRequest):
    """
    Store the student's interest tag (gaming / sports / music / cartoon).
    Used by the adaptive engine as the w4 interest_match tiebreaker during
    candidate scoring and to contextualize examples in the scaffold zone.
    """
    student_profiles_col.update_one(
        {"student_id": req.student_id},
        {"$set": {
            "student_id":   req.student_id,
            "interest_tag": req.interest_tag,
            "onboarded_at": _now(),
        }},
        upsert=True,
    )
    return {
        "student_id":   req.student_id,
        "interest_tag": req.interest_tag,
        "message":      "Onboarding complete. Ready for diagnostic.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT — DIAGNOSTIC
# Initializes P(L) for every concept node in a unit using BKT Option 2.
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/student/diagnostic")
def submit_diagnostic(req: DiagnosticSubmitRequest):
    """
    Process diagnostic answers and initialize BKT states.

    For each answer:
      - Runs bkt.diagnostic_init(correct) — standard BKT update from P(L0)=0.10
      - Diagnostic correct → P(L1) ≈ 0.4667 (Standard Zone)
      - Diagnostic wrong   → P(L1) ≈ 0.2110 (Scaffold Zone)

    After all answers are processed, applies prerequisite gating:
      - If child was answered correctly but parent was answered incorrectly,
        child P(L1) is overridden to the parent's wrong-answer value (≈ 0.2110).

    No hard-coded jumps. Same BKT formula runs everywhere.
    """
    # Build answer lookup: subtopic_id → correct bool
    answer_map: dict = {item.subtopic_id: item.correct for item in req.answers}

    # Step 1: compute raw P(L1) for every answered node
    raw_p_l: dict = {}
    for subtopic_id, correct in answer_map.items():
        raw_p_l[subtopic_id] = diagnostic_init(correct)

    # Step 2: load DAG to apply prerequisite gating
    dag = _load_dag(req.unit_id)

    # Step 3: apply prerequisite gating overrides
    gated_p_l: dict = {}
    for subtopic_id, p_l in raw_p_l.items():
        prereqs = dag.get_prerequisites(subtopic_id)
        if prereqs:
            # Check if ALL parents were correct in diagnostic
            all_parents_correct = all(
                answer_map.get(parent_id, False) for parent_id in prereqs
            )
            gated_p_l[subtopic_id] = apply_prerequisite_gating(
                child_p_l=p_l,
                parent_correct_in_diagnostic=all_parents_correct,
            )
        else:
            gated_p_l[subtopic_id] = p_l

    # Step 4: persist initial BKT states
    initialized = []
    for subtopic_id, p_l in gated_p_l.items():
        # Look up subtopic name for the response
        sub = subtopics_col.find_one({"_id": ObjectId(subtopic_id)})
        sub_name = sub["name"] if sub else subtopic_id

        state = NodeState(subtopic_id=subtopic_id, p_l=p_l)
        _save_bkt_state(req.student_id, req.unit_id, state)

        # Also initialise legacy mastery record so the old next-activity
        # endpoint still works during the transition period
        mastery_col.update_one(
            {"student_id": req.student_id, "subtopic_id": subtopic_id},
            {"$set": {
                "student_id":       req.student_id,
                "subtopic_id":      subtopic_id,
                "unit_id":          req.unit_id,
                "mastery_score":    _mastery_score_from_p_l(p_l),
                "consecutive_wrong": 0,
                "attempt_number":   1,
                "hint_used_count":  0,
                "status":           "active",
                "escalated":        False,
                "created_at":       _now(),
            }},
            upsert=True,
        )

        initialized.append({
            "subtopic_id":   subtopic_id,
            "subtopic_name": sub_name,
            "answered":      answer_map.get(subtopic_id),
            "p_l":           round(p_l, 4),
            "zone":          get_zone(p_l),
            "mastered":      bkt_is_mastered(p_l),
        })

    return {
        "student_id": req.student_id,
        "unit_id":    req.unit_id,
        "initialized": initialized,
        "message":    "Diagnostic complete. Learning path initialized.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT — TOPICS LIST
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/student/topics")
def get_topics():
    units = list(units_col.find({"status": "ready"}))
    result = []
    for u in units:
        unit_id = str(u["_id"])
        sub_count = subtopics_col.count_documents({"unit_id": unit_id, "content_approved": True})
        result.append({
            "unit_id":             unit_id,
            "topic":               u["topic"],
            "approved_subtopics":  sub_count,
        })
    return {"topics": result}


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT — NEXT ACTIVITY  (BKT + DAG engine)
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/student/next-activity")
def next_activity(student_id: str, unit_id: str):
    """
    Determine the next learning activity for a student using the BKT + DAG engine.

    Decision order (in adaptive_engine.decide()):
      1. Escalation check (consecutive_wrong >= 5)
      2. Mastery check (P(L) >= 0.85) — advance DAG forward
      3. Prerequisite gap check — backward remediation
      4. Hybrid layer check — hint_dependent
      5. P(L) zone routing — challenge / standard / scaffold
    """
    # Load all approved subtopics
    subs = list(subtopics_col.find(
        {"unit_id": unit_id, "content_approved": True}
    ).sort("order", 1))

    if not subs:
        raise HTTPException(404, "No approved content yet — teacher needs to approve subtopics.")

    total = len(subs)

    # Load DAG and BKT states
    dag    = _load_dag(unit_id)
    states = _load_bkt_states(student_id, unit_id)
    mmap   = _mastery_map(states)

    # Load student interest tag
    profile = student_profiles_col.find_one({"student_id": student_id})
    interest_tag = profile["interest_tag"] if profile else None

    # Count mastered nodes for progress
    done = sum(1 for p_l in mmap.values() if bkt_is_mastered(p_l))

    # Select the best next node using candidate scoring
    next_node_id = select_next_node(dag, mmap, interest_tag)

    if next_node_id is None:
        # All nodes mastered — build summary
        return _build_bkt_summary(student_id, unit_id, subs, mmap)

    # Get the NodeState for the selected node
    current_state = states.get(next_node_id)
    if current_state is None:
        current_state = NodeState(subtopic_id=next_node_id, p_l=DEFAULT_P_L0)

    # Run engine decision
    decision = decide(
        current_subtopic_id=next_node_id,
        state=current_state,
        dag=dag,
        mastery_map=mmap,
        interest_tag=interest_tag,
    )

    # Resolve actual subtopic to serve (may be remediation target)
    serve_id = decision.subtopic_id
    sub = subtopics_col.find_one({"_id": ObjectId(serve_id)})
    if not sub:
        raise HTTPException(404, f"Subtopic '{serve_id}' not found.")

    # Initialise BKT state if this is the student's first visit
    if bkt_states_col.find_one({"student_id": student_id, "subtopic_id": serve_id}) is None:
        init_state = NodeState(subtopic_id=serve_id, p_l=DEFAULT_P_L0)
        _save_bkt_state(student_id, unit_id, init_state)

    # Fetch content pieces
    content_type   = decision.content_type
    question_type  = decision.question_type

    content_piece  = content_col.find_one({"subtopic_id": serve_id, "type": content_type, "approved": True})
    question_piece = content_col.find_one({"subtopic_id": serve_id, "type": question_type, "approved": True})
    hint_piece     = content_col.find_one({"subtopic_id": serve_id, "type": "hint", "approved": True})

    # Fallbacks for missing content types
    if not content_piece:
        content_piece = content_col.find_one({"subtopic_id": serve_id, "type": "main_explanation", "approved": True})
    if not question_piece:
        question_piece = content_col.find_one({"subtopic_id": serve_id, "type": "question", "approved": True})

    if not content_piece or not question_piece:
        raise HTTPException(404, f"Content not found for '{sub['name']}'.")

    # Serve state values for the served node
    served_state = states.get(serve_id, NodeState(subtopic_id=serve_id, p_l=DEFAULT_P_L0))

    return {
        # ── Existing fields (backward compatible) ─────────────────────────
        "subtopic_id":       serve_id,
        "subtopic_name":     sub["name"],
        "topic":             sub["topic"],
        "mastery_score":     _mastery_score_from_p_l(served_state.p_l),
        "consecutive_wrong": served_state.consecutive_wrong,
        "progress":          {"done": done, "total": total},
        "action":            decision.action,
        "message":           decision.message,
        "show_hint":         decision.show_hint,
        "content":           content_piece["data"],
        "content_type":      content_type,
        "question":          question_piece["data"],
        "question_type":     question_type,
        "hint":              hint_piece["data"]["text"] if hint_piece else "",

        # ── New BKT + DAG fields ──────────────────────────────────────────
        "p_l":               round(served_state.p_l, 4),
        "zone":              get_zone(served_state.p_l),
        "support_level":     decision.support_level,
        "reason":            decision.reason,
        "hint_dependent":    decision.hint_dependent,
        "dag_action":        decision.dag_action,
        "remediation_target": decision.remediation_target,
    }


def _build_bkt_summary(student_id: str, unit_id: str, subs: list, mmap: dict) -> dict:
    """Build completion summary when all nodes are mastered."""
    records  = []
    total_pl = 0.0
    for sub in subs:
        sid   = str(sub["_id"])
        p_l   = mmap.get(sid, 0.0)
        total_pl += p_l
        records.append({
            "subtopic":      sub["name"],
            "p_l":           round(p_l, 4),
            "mastery_score": _mastery_score_from_p_l(p_l),
            "zone":          get_zone(p_l),
            "mastered":      bkt_is_mastered(p_l),
        })
    avg_pl = total_pl / len(subs) if subs else 0.0
    return {
        "completed":    True,
        "avg_p_l":      round(avg_pl, 4),
        "avg_mastery":  _mastery_score_from_p_l(avg_pl),
        "subtopics":    records,
        "progress":     {"done": len(subs), "total": len(subs)},
        "message":      "🎉 You've mastered all subtopics!" if avg_pl >= 0.60 else "Great effort! Keep practising.",
        "reason":       Reason.UNIT_COMPLETE,
    }


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT — SUBMIT ANSWER  (BKT + DAG engine)
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/student/submit-answer")
def submit_answer(req: SubmitAnswerRequest):
    """
    Grade the student's answer, run BKT update, update DAG traversal state.

    Steps:
      1. Load BKT state for this subtopic
      2. Find and grade the question
      3. Run bkt.full_update() to get new P(L)
      4. Check if P(L) >= 0.85 → mastery, advance DAG
      5. Check if P(L) < 0.85 and backward remediation needed
      6. Update NodeState (reset consecutive_wrong on correct/transition)
      7. Persist BKT state + legacy mastery record + attempt
      8. Handle escalation at consecutive_wrong >= 5
    """
    sub = subtopics_col.find_one({"_id": ObjectId(req.subtopic_id)})
    if not sub:
        raise HTTPException(404, "Subtopic not found")

    sub_id  = req.subtopic_id
    unit_id = sub.get("unit_id", "")

    # Load current BKT state
    bkt_doc = bkt_states_col.find_one({"student_id": req.student_id, "subtopic_id": sub_id})
    if bkt_doc:
        state = NodeState(
            subtopic_id=sub_id,
            p_l=bkt_doc.get("p_l", DEFAULT_P_L0),
            consecutive_wrong=bkt_doc.get("consecutive_wrong", 0),
            hint_dependent=bkt_doc.get("hint_dependent", False),
            easy_pass_count=bkt_doc.get("easy_pass_count", 0),
            standard_fail_count=bkt_doc.get("standard_fail_count", 0),
        )
    else:
        state = NodeState(subtopic_id=sub_id, p_l=DEFAULT_P_L0)

    p_l_before = state.p_l

    # Load per-node BKT parameters (use stored values if available for Phase 2 compat)
    p_g = bkt_doc.get("p_g", DEFAULT_P_G) if bkt_doc else DEFAULT_P_G
    p_s = bkt_doc.get("p_s", DEFAULT_P_S) if bkt_doc else DEFAULT_P_S
    p_t = bkt_doc.get("p_t", DEFAULT_P_T) if bkt_doc else DEFAULT_P_T

    # Find the question that was shown (infer from current state/engine)
    # Determine question_type based on P(L) zone (mirrors decide() logic)
    from app.bkt import get_zone as _zone
    current_zone = _zone(p_l_before)
    if state.consecutive_wrong >= 5:
        q_type = "easy_question"
    elif current_zone == "challenge":
        q_type = "hard_question"
    elif current_zone == "scaffold":
        # Use scaffold sequence step
        from app.adaptive_engine import SCAFFOLD_SEQUENCE
        step   = min(state.consecutive_wrong, max(SCAFFOLD_SEQUENCE.keys()))
        q_type = SCAFFOLD_SEQUENCE[step]["question_type"]
    else:
        q_type = "question"

    question_piece = content_col.find_one({"subtopic_id": sub_id, "type": q_type, "approved": True})
    if not question_piece:
        question_piece = content_col.find_one({"subtopic_id": sub_id, "type": "question", "approved": True})
    if not question_piece:
        raise HTTPException(404, "Question not found")

    q_data  = question_piece["data"]
    correct = (req.selected_option == q_data["correct"])

    # Run BKT update
    new_p_l = full_update(
        p_l=p_l_before,
        correct=correct,
        hint_used=req.hint_used,
        p_g=p_g,
        p_s=p_s,
        p_t=p_t,
    )

    # Check if mastery crossed threshold → DAG node transition
    just_mastered = bkt_is_mastered(new_p_l) and not bkt_is_mastered(p_l_before)
    transitioning_node = just_mastered  # also True on backward remediation (handled below)

    # Update NodeState (consecutive_wrong reset, hybrid counters)
    state = compute_post_submission_state(
        state=state,
        correct=correct,
        question_type_shown=q_type,
        new_p_l=new_p_l,
        transitioning_node=transitioning_node,
    )

    # Persist BKT state
    _save_bkt_state(req.student_id, unit_id, state)

    # Record attempt
    legacy_score    = _mastery_score_from_p_l(p_l_before)
    new_score       = _mastery_score_from_p_l(new_p_l)

    attempts_col.insert_one({
        "student_id":      req.student_id,
        "subtopic_id":     sub_id,
        "unit_id":         unit_id,
        "selected_option": req.selected_option,
        "correct":         correct,
        "hint_used":       req.hint_used,
        "p_l_before":      p_l_before,
        "p_l_after":       new_p_l,
        "mastery_before":  legacy_score,
        "mastery_after":   new_score,
        "question_type":   q_type,
        "timestamp":       _now(),
    })

    # Escalation check
    escalated  = False
    new_status = "mastered" if bkt_is_mastered(new_p_l) else "active"

    if state.consecutive_wrong >= 5:
        escalated  = True
        new_status = "escalated"
        existing   = escalations_col.find_one({
            "student_id":  req.student_id,
            "subtopic_id": sub_id,
            "resolved":    False,
        })
        if not existing:
            escalations_col.insert_one({
                "student_id":    req.student_id,
                "subtopic_id":   sub_id,
                "unit_id":       unit_id,
                "subtopic_name": sub["name"],
                "p_l":           new_p_l,
                "mastery_score": new_score,
                "resolved":      False,
                "created_at":    _now(),
            })

    # Update legacy mastery record for frontend backward compatibility
    mastery_col.update_one(
        {"student_id": req.student_id, "subtopic_id": sub_id},
        {"$set": {
            "mastery_score":     new_score,
            "consecutive_wrong": state.consecutive_wrong,
            "attempt_number":    (bkt_doc.get("attempt_number", 0) if bkt_doc else 0) + 1,
            "hint_used_count":   (bkt_doc.get("hint_used_count", 0) if bkt_doc else 0) + (1 if req.hint_used else 0),
            "status":            new_status,
            "escalated":         escalated,
            "last_updated":      _now(),
        }},
        upsert=True,
    )

    return {
        "correct":           correct,
        "correct_option":    q_data["correct"],
        "explanation":       q_data.get("explanation", ""),

        # BKT state
        "p_l_before":        round(p_l_before, 4),
        "p_l_after":         round(new_p_l, 4),
        "zone_after":        get_zone(new_p_l),
        "just_mastered":     just_mastered,

        # Legacy score (backward compat)
        "mastery_score":     new_score,
        "mastery_delta":     new_score - legacy_score,

        # Engine state
        "consecutive_wrong": state.consecutive_wrong,
        "hint_dependent":    state.hint_dependent,
        "status":            new_status,
        "escalated":         escalated,
    }


# ── STUDENT MASTERY SUMMARY ───────────────────────────────────────────────────

@app.get("/api/student/mastery")
def get_mastery(student_id: str, unit_id: str):
    subs = list(subtopics_col.find({"unit_id": unit_id}).sort("order", 1))
    records = []
    for sub in subs:
        sid     = str(sub["_id"])
        bkt_doc = bkt_states_col.find_one({"student_id": student_id, "subtopic_id": sid})
        p_l     = bkt_doc["p_l"] if bkt_doc else DEFAULT_P_L0
        records.append({
            "subtopic_id":   sid,
            "name":          sub["name"],
            "p_l":           round(p_l, 4),
            "mastery_score": _mastery_score_from_p_l(p_l),
            "zone":          get_zone(p_l),
            "mastered":      bkt_is_mastered(p_l),
            "consecutive_wrong": bkt_doc.get("consecutive_wrong", 0) if bkt_doc else 0,
        })
    return {"student_id": student_id, "unit_id": unit_id, "subtopics": records}
