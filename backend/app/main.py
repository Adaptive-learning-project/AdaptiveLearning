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
def get_node_state(student_id: int, subtopic_id: str) -> NodeState:
    doc = mastery_state_collection.find_one({"student_id": student_id, "subtopic_id": subtopic_id})
    if not doc:
        return NodeState(subtopic_id=subtopic_id, p_l=DEFAULT_P_L0)
    return NodeState(
        subtopic_id=subtopic_id,
        p_l=doc.get("mastery_probability", DEFAULT_P_L0),
        consecutive_wrong=doc.get("consecutive_wrong", 0),
        hint_dependent=doc.get("hint_dependent", False),
        easy_pass_count=doc.get("easy_pass_count", 0),
        standard_fail_count=doc.get("standard_fail_count", 0),
        hard_question_attempt=doc.get("hard_question_attempt", 0),
    )

def save_node_state(student_id: int, state: NodeState):
    mastery_state_collection.update_one(
        {"student_id": student_id, "subtopic_id": state.subtopic_id},
        {"$set": {
            "mastery_probability": state.p_l,
            "consecutive_wrong": state.consecutive_wrong,
            "hint_dependent": state.hint_dependent,
            "easy_pass_count": state.easy_pass_count,
            "standard_fail_count": state.standard_fail_count,
            "hard_question_attempt": state.hard_question_attempt,
        }},
        upsert=True
    )

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
    subs = list(subtopics_col.find({"unit_id": unit_id}))
    states = {}
    for sub in subs:
        sid = str(sub["_id"])
        doc = bkt_states_col.find_one({"student_id": str(student_id), "subtopic_id": sid})
        if doc:
            states[sid] = NodeState(
                subtopic_id=sid,
                p_l=doc.get("p_l", DEFAULT_P_L0),
                consecutive_wrong=doc.get("consecutive_wrong", 0),
                hint_dependent=doc.get("hint_dependent", False),
                easy_pass_count=doc.get("easy_pass_count", 0),
                standard_fail_count=doc.get("standard_fail_count", 0),
                hard_question_attempt=doc.get("hard_question_attempt", 0),
                std_question_index=doc.get("std_question_index", 0),
            )
        else:
            states[sid] = NodeState(subtopic_id=sid, p_l=DEFAULT_P_L0)
    return states

def _save_bkt_state(student_id: str, unit_id: str, state: NodeState) -> None:
    bkt_states_col.update_one(
        {"student_id": str(student_id), "subtopic_id": state.subtopic_id},
        {"$set": {
            "student_id":            str(student_id),
            "unit_id":               unit_id,
            "subtopic_id":           state.subtopic_id,
            "p_l":                   state.p_l,
            "consecutive_wrong":     state.consecutive_wrong,
            "hint_dependent":        state.hint_dependent,
            "easy_pass_count":       state.easy_pass_count,
            "standard_fail_count":   state.standard_fail_count,
            "hard_question_attempt": state.hard_question_attempt,
            "std_question_index":    state.std_question_index,
            "status":                "mastered" if bkt_is_mastered(state.p_l) else "active",
            "updated_at":            _now(),
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
        "teacher_id": req.teacher_id,
        "topic": req.topic,
        "reference_text": req.reference_text,
        "status": "generating",
        "created_at": _now(),
    }
    unit_id = str(units_col.insert_one(unit).inserted_id)

    subtopic_ids = []
    subtopic_name_map = {}
    for i, name in enumerate(req.subtopics):
        sub = {
            "unit_id": unit_id,
            "topic": req.topic,
            "name": name,
            "order": i,
            "content_approved": False,
            "created_at": _now(),
        }
        sub_id = str(subtopics_col.insert_one(sub).inserted_id)
        subtopic_ids.append(sub_id)
        subtopic_name_map[name.lower()] = sub_id

    # Construct Curriculum DAG with prerequisite awareness
    dag = CurriculumDAG()
    for sid, name in zip(subtopic_ids, req.subtopics):
        prereqs = []
        name_lower = name.lower()

        # Link OOP Pillars / Classes to Abstract Classes
        if "abstract" in name_lower or "pure virtual" in name_lower:
            for cand, cid in subtopic_name_map.items():
                if "class" in cand or "inheritance" in cand or "pillar" in cand:
                    if cid != sid:
                        prereqs.append(cid)

        # Link Functions / Overloading to Templates
        elif "template" in name_lower:
            for cand, cid in subtopic_name_map.items():
                if "function" in cand or "overload" in cand:
                    if cid != sid:
                        prereqs.append(cid)

        # Default fallback: sequential dependency if no semantic link found
        if not prereqs and subtopic_ids.index(sid) > 0:
            prereqs.append(subtopic_ids[subtopic_ids.index(sid) - 1])

        dag.add_node(subtopic_id=sid, name=name, prerequisites=prereqs)

    dag_config_col.update_one(
        {"unit_id": unit_id},
        {"$set": dag.to_config(unit_id)},
        upsert=True,
    )

    return {
        "unit_id": unit_id,
        "subtopic_ids": subtopic_ids,
        "message": f"Unit created with {len(subtopic_ids)} subtopics mapped in DAG.",
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
    import sys
    import time
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from app.llm_generator import generate_all, generate_fallback

    subs = list(subtopics_col.find({"unit_id": unit_id}))
    all_subtopic_names = [s["name"] for s in subs]
    total = len(subs)

    def log(msg: str):
        print(msg, flush=True)
        sys.stdout.flush()

    log("\n" + "=" * 55)
    log(f"[GEN] Starting: {topic}  ({total} subtopics, parallel)")
    log("=" * 55)

    completed = 0
    t0 = time.perf_counter()

    def _gen_one(sub):
        name   = sub["name"]
        sub_id = str(sub["_id"])
        tag = "OK"

        # Generate — if generate_all fails internally it already calls fallback,
        # but we guard again here in case it returns None or raises anyway.
        try:
            generated = generate_all(topic, name, reference_text, all_subtopic_names)
        except Exception as exc:
            log(f"[GEN] generate_all error for '{name}': {exc}")
            generated = None

        if not isinstance(generated, dict) or not generated:
            try:
                generated = generate_fallback(topic, name)
                tag = "fallback"
            except Exception as exc:
                log(f"[GEN] generate_fallback error for '{name}': {exc}")
                generated = {}
                tag = "empty"

        # Store every top-level key as its own content document
        for ctype, cdata in generated.items():
            content_col.update_one(
                {"subtopic_id": sub_id, "type": ctype},
                {"$set": {
                    "subtopic_id":   sub_id,
                    "unit_id":       unit_id,
                    "topic":         topic,
                    "subtopic_name": name,
                    "type":          ctype,
                    "data":          cdata,
                    "approved":      False,
                    "updated_at":    _now(),
                }},
                upsert=True,
            )

        # Populate legacy single-question aliases so older frontend code still works
        if "standard_questions" in generated and generated["standard_questions"]:
            content_col.update_one(
                {"subtopic_id": sub_id, "type": "question"},
                {"$set": {
                    "subtopic_id": sub_id, "unit_id": unit_id, "topic": topic,
                    "subtopic_name": name, "type": "question",
                    "data": generated["standard_questions"][0],
                    "approved": False, "updated_at": _now(),
                }},
                upsert=True,
            )
        if "easy_questions" in generated and generated["easy_questions"]:
            content_col.update_one(
                {"subtopic_id": sub_id, "type": "easy_question"},
                {"$set": {
                    "subtopic_id": sub_id, "unit_id": unit_id, "topic": topic,
                    "subtopic_name": name, "type": "easy_question",
                    "data": generated["easy_questions"][0],
                    "approved": False, "updated_at": _now(),
                }},
                upsert=True,
            )

        subtopics_col.update_one(
            {"_id": ObjectId(sub_id)},
            {"$set": {"generation_status": "done"}},
        )
        return name, tag

    with ThreadPoolExecutor(max_workers=min(total, 8)) as executor:
        futures = {executor.submit(_gen_one, sub): sub for sub in subs}
        for future in as_completed(futures):
            completed += 1
            elapsed = time.perf_counter() - t0
            try:
                name, tag = future.result()
            except Exception as exc:
                name = futures[future].get("name", "?")
                tag  = f"ERROR: {exc}"
            filled = int(20 * completed / total)
            bar = "#" * filled + "-" * (20 - filled)
            log(f"[GEN] [{bar}] {completed}/{total}  {elapsed:5.1f}s  {name}  [{tag}]")

    units_col.update_one(
        {"_id": ObjectId(unit_id)},
        {"$set": {"status": "ready"}},
    )
    elapsed = time.perf_counter() - t0
    log("=" * 55)
    log(f"[GEN] Done -- {total} subtopics in {elapsed:.1f}s")
    log("=" * 55 + "\n")


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
    subs = list(subtopics_col.find({"unit_id": unit_id, "content_approved": True}).sort("order", 1))
    if not subs:
        raise HTTPException(404, "No approved content found.")

    dag = _load_dag(unit_id)
    states = _load_bkt_states(student_id, unit_id)
    mmap = _mastery_map(states)
    total = len(subs)
    done = sum(1 for p_l in mmap.values() if bkt_is_mastered(p_l))

    next_node_id = select_next_node(dag, mmap)
    if next_node_id is None:
        return _build_bkt_summary(student_id, unit_id, subs, mmap)

    current_state = states.get(next_node_id, NodeState(subtopic_id=next_node_id, p_l=DEFAULT_P_L0))

    decision = decide(
        current_subtopic_id=next_node_id,
        state=current_state,
        dag=dag,
        mastery_map=mmap,
    )

    serve_id = decision.subtopic_id
    sub = subtopics_col.find_one({"_id": ObjectId(serve_id)})
    if not sub:
        raise HTTPException(404, "Subtopic not found.")

    # 1. Fetch Diagnostic piece if available
    diag_doc = content_col.find_one({"subtopic_id": serve_id, "type": "diagnostic_question", "approved": True})
    diag_data = diag_doc["data"] if diag_doc else None

    # 2. Select Question from pool based on decision type and index
    question_data = None
    if decision.question_type == "question":
        pool_doc = content_col.find_one({"subtopic_id": serve_id, "type": "standard_questions", "approved": True})
        if pool_doc and isinstance(pool_doc.get("data"), list) and len(pool_doc["data"]) > 0:
            idx = min(decision.std_question_index, len(pool_doc["data"]) - 1)
            question_data = pool_doc["data"][idx]
    elif decision.question_type == "easy_question":
        pool_doc = content_col.find_one({"subtopic_id": serve_id, "type": "easy_questions", "approved": True})
        if pool_doc and isinstance(pool_doc.get("data"), list) and len(pool_doc["data"]) > 0:
            idx = min(current_state.consecutive_wrong, len(pool_doc["data"]) - 1)
            question_data = pool_doc["data"][idx]

    # Fallback to single question docs if pool does not match
    if not question_data:
        q_piece = content_col.find_one({"subtopic_id": serve_id, "type": decision.question_type, "approved": True})
        if not q_piece:
            q_piece = content_col.find_one({"subtopic_id": serve_id, "type": "question", "approved": True})
        question_data = q_piece["data"] if q_piece else None

    # Ensure difficulty is present on the question payload
    diff_label = "medium"
    if question_data:
        diff_label = question_data.get("difficulty") or (
            "easy" if decision.question_type == "easy_question" else (
                "hard" if decision.question_type == "hard_question" else "medium"
            )
        )
        question_data["difficulty"] = diff_label

    content_piece = None
    if decision.content_type:
        c_doc = content_col.find_one({"subtopic_id": serve_id, "type": decision.content_type, "approved": True})
        content_piece = c_doc["data"] if c_doc else None

    hint_piece = content_col.find_one({"subtopic_id": serve_id, "type": "hint", "approved": True})
    overview_piece = content_col.find_one({"subtopic_id": serve_id, "type": "overview", "approved": True})

    return {
        "subtopic_id": serve_id,
        "subtopic_name": sub["name"],
        "topic": sub["topic"],
        "mastery_score": _mastery_score_from_p_l(current_state.p_l),
        "consecutive_wrong": current_state.consecutive_wrong,
        "progress": {"done": done, "total": total},
        "action": decision.action,
        "message": decision.message,
        "show_hint": decision.show_hint,
        "can_skip": decision.can_skip,
        "content": content_piece,
        "content_type": decision.content_type,  # null signals to skip explanation card on re-attempt
        "question": question_data,
        "question_type": decision.question_type,
        "difficulty": diff_label,
        "std_question_index": decision.std_question_index,
        "hint": hint_piece["data"]["text"] if hint_piece else "",
        "overview": overview_piece["data"] if overview_piece else None,
        "diagnostic_question": diag_data,
        "p_l": round(current_state.p_l, 4),
        "zone": get_zone(current_state.p_l),
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
    student_id_str = str(req.student_id)
    sub = subtopics_col.find_one({"_id": ObjectId(req.subtopic_id)})
    if not sub:
        raise HTTPException(404, "Subtopic not found")

    sub_id = req.subtopic_id
    unit_id = sub.get("unit_id", "")

    # Load existing state
    bkt_doc = bkt_states_col.find_one({"student_id": student_id_str, "subtopic_id": sub_id})
    if bkt_doc:
        state = NodeState(
            subtopic_id=sub_id,
            p_l=bkt_doc.get("p_l", DEFAULT_P_L0),
            consecutive_wrong=bkt_doc.get("consecutive_wrong", 0),
            hint_dependent=bkt_doc.get("hint_dependent", False),
            easy_pass_count=bkt_doc.get("easy_pass_count", 0),
            standard_fail_count=bkt_doc.get("standard_fail_count", 0),
            hard_question_attempt=bkt_doc.get("hard_question_attempt", 0),
            std_question_index=bkt_doc.get("std_question_index", 0),
        )
    else:
        state = NodeState(subtopic_id=sub_id, p_l=DEFAULT_P_L0)

    p_l_before = state.p_l

    # Locate question by pool index or direct piece to grade correctly
    q_type = req.question_type or "question"
    target_q = None

    if q_type == "question":
        p_doc = content_col.find_one({"subtopic_id": sub_id, "type": "standard_questions", "approved": True})
        if p_doc and isinstance(p_doc.get("data"), list) and len(p_doc["data"]) > state.std_question_index:
            target_q = p_doc["data"][state.std_question_index]
    elif q_type == "easy_question":
        p_doc = content_col.find_one({"subtopic_id": sub_id, "type": "easy_questions", "approved": True})
        if p_doc and isinstance(p_doc.get("data"), list):
            idx = min(state.consecutive_wrong, len(p_doc["data"]) - 1)
            target_q = p_doc["data"][idx]

    if not target_q:
        qp = content_col.find_one({"subtopic_id": sub_id, "type": q_type, "approved": True})
        if not qp:
            qp = content_col.find_one({"subtopic_id": sub_id, "type": "question", "approved": True})
        if not qp:
            raise HTTPException(404, "Question content not found")
        target_q = qp["data"]

    correct = (req.selected_option == target_q["correct"])

    # Update BKT
    new_p_l = full_update(p_l=p_l_before, correct=correct, hint_used=req.hint_used)
    just_mastered = bkt_is_mastered(new_p_l) and not bkt_is_mastered(p_l_before)

    # Post-submission state update
    state = compute_post_submission_state(
        state=state,
        correct=correct,
        question_type_shown=q_type,
        new_p_l=new_p_l,
        transitioning_node=just_mastered,
    )

    _save_bkt_state(student_id_str, unit_id, state)

    legacy_score = _mastery_score_from_p_l(p_l_before)
    new_score = _mastery_score_from_p_l(new_p_l)

    # Insert attempt record
    attempts_col.insert_one({
        "student_id": student_id_str,
        "subtopic_id": sub_id,
        "unit_id": unit_id,
        "selected_option": req.selected_option,
        "correct": correct,
        "hint_used": req.hint_used,
        "question_type": q_type,
        "std_question_index": state.std_question_index,
        "difficulty": target_q.get("difficulty", "medium"),
        "timestamp": _now(),
    })

    dag = _load_dag(unit_id)
    all_bkt = bkt_states_col.find({"student_id": student_id_str})
    mastery_map = {doc["subtopic_id"]: doc.get("p_l", 0.0) for doc in all_bkt}
    mastery_map[sub_id] = new_p_l

    decision = decide(
        current_subtopic_id=sub_id,
        state=state,
        dag=dag,
        mastery_map=mastery_map,
    )

    return {
        "correct": correct,
        "correct_option": target_q["correct"],
        "explanation": target_q.get("explanation", ""),
        "p_l_after": round(new_p_l, 4),
        "zone_after": get_zone(new_p_l),
        "mastery_score": new_score,
        "mastery_delta": new_score - legacy_score,
        "just_mastered": just_mastered,
        "std_question_index": state.std_question_index,
        "difficulty": target_q.get("difficulty", "medium"),
        "can_skip": decision.can_skip,
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
