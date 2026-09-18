"""
backend/app/main.py
Integrated Adaptive Neuro-Symbolic Learning Platform & Affective Cognitive Governor
"""

import os
import sys
import time
import traceback
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from bson import ObjectId
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.database import (
    units_col, subtopics_col, content_col,
    mastery_col, attempts_col, escalations_col,
    bkt_states_col, dag_config_col, student_profiles_col,
)
from app.schemas import (
    CreateUnitRequest, ApproveContentRequest,
    SubmitAnswerRequest, ResolveEscalationRequest,
    OnboardingRequest, DiagnosticSubmitRequest,
    DiagnosticLog, PedagogicalDecision
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
from app.telemetry_engine import (
    TelemetryPayload, evaluate_affective_state, generate_cognitive_deescalation
)
from app.cognitive_governor import CognitiveGovernor
from app.llm_generator import (
    generate_diagnostic_questions,
    generate_hybrid_bridge,
    generate_on_the_fly_content,
)

app = FastAPI(title="Adaptive Psycho-Motor Cognitive Engine", version="4.0.0")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://adaptive-learning-inky.vercel.app",
    ],
    allow_credentials=True,
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
    return int(round(p_l * 100))

def _load_dag(unit_id: str) -> CurriculumDAG:
    dag = CurriculumDAG()
    config = dag_config_col.find_one({"unit_id": unit_id})
    if config:
        dag.load_from_config(config)
    else:
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
    return {sid: s.p_l for sid, s in states.items()}


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    try:
        from app.database import client
        client.admin.command("ping")
        return {"status": "healthy", "mongodb": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN ROUTES (TOPIC CREATION & DIAGNOSTIC INITIALIZATION)
# ══════════════════════════════════════════════════════════════════════════════

def _generate_diagnostics_for_unit(unit_id: str, topic: str, subtopic_names: list, subtopic_ids: list, reference_text: str = ""):
    print(f"\n[ADMIN] Initializing baseline diagnostics for unit: {topic} ({len(subtopic_ids)} subtopics)", flush=True)
    for name, sid in zip(subtopic_names, subtopic_ids):
        diag_questions = generate_diagnostic_questions(topic, name, reference_text)
        content_col.update_one(
            {"subtopic_id": sid, "type": "diagnostic_question"},
            {"$set": {
                "subtopic_id":   sid,
                "unit_id":       unit_id,
                "topic":         topic,
                "subtopic_name": name,
                "type":          "diagnostic_question",
                "data":          diag_questions,
                "approved":      True,
                "updated_at":    _now()
            }},
            upsert=True
        )
    print(f"🎉 [ADMIN READY] Diagnostics initialized for Unit {unit_id}.\n", flush=True)

@app.post("/api/admin/units")
@app.post("/api/teacher/units")
def create_unit(req: CreateUnitRequest, background_tasks: BackgroundTasks):
    unit = {
        "admin_id": getattr(req, "teacher_id", "admin_01"),
        "topic": req.topic,
        "reference_text": req.reference_text,
        "status": "ready",
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
            "content_approved": True,
            "created_at": _now(),
        }
        sub_id = str(subtopics_col.insert_one(sub).inserted_id)
        subtopic_ids.append(sub_id)
        subtopic_name_map[name.lower()] = sub_id

    dag = CurriculumDAG()
    for sid, name in zip(subtopic_ids, req.subtopics):
        prereqs = []
        name_lower = name.lower()

        if "abstract" in name_lower or "pure virtual" in name_lower:
            for cand, cid in subtopic_name_map.items():
                if "class" in cand or "inheritance" in cand or "pillar" in cand:
                    if cid != sid:
                        prereqs.append(cid)
        elif "template" in name_lower:
            for cand, cid in subtopic_name_map.items():
                if "function" in cand or "overload" in cand:
                    if cid != sid:
                        prereqs.append(cid)

        if not prereqs and subtopic_ids.index(sid) > 0:
            prereqs.append(subtopic_ids[subtopic_ids.index(sid) - 1])

        dag.add_node(subtopic_id=sid, name=name, prerequisites=prereqs)

    dag_config_col.update_one(
        {"unit_id": unit_id},
        {"$set": dag.to_config(unit_id)},
        upsert=True,
    )

    background_tasks.add_task(
        _generate_diagnostics_for_unit,
        unit_id,
        req.topic,
        req.subtopics,
        subtopic_ids,
        req.reference_text or ""
    )

    return {
        "unit_id": unit_id,
        "subtopic_ids": subtopic_ids,
        "message": f"Unit created with {len(subtopic_ids)} subtopics mapped in DAG. Diagnostics initialized.",
    }

@app.get("/api/admin/units/{unit_id}/status")
@app.get("/api/teacher/units/{unit_id}/status")
def unit_status(unit_id: str):
    unit = units_col.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(404, "Unit not found")
    return {"status": unit.get("status", "unknown"), "topic": unit["topic"]}

@app.get("/api/admin/units/{unit_id}/review")
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

@app.post("/api/admin/approve")
@app.post("/api/teacher/approve")
def approve_subtopic(req: ApproveContentRequest):
    content_col.update_many({"subtopic_id": req.subtopic_id}, {"$set": {"approved": True}})
    subtopics_col.update_one({"_id": ObjectId(req.subtopic_id)}, {"$set": {"content_approved": True}})
    return {"message": "Subtopic approved and live for students."}

@app.get("/api/admin/units")
@app.get("/api/teacher/units")
def list_units(admin_id: Optional[str] = None, teacher_id: Optional[str] = None):
    units = list(units_col.find())
    return {"units": [_oid(u) for u in units]}

@app.get("/api/admin/escalations")
@app.get("/api/teacher/escalations")
def get_escalations():
    escs = list(escalations_col.find({"resolved": False}).sort("created_at", -1))
    return {"escalations": [_oid(e) for e in escs]}

@app.post("/api/admin/escalations/resolve")
@app.post("/api/teacher/escalations/resolve")
def resolve_escalation(req: ResolveEscalationRequest):
    esc = escalations_col.find_one({"_id": ObjectId(req.escalation_id)})
    if not esc:
        raise HTTPException(404, "Escalation not found")
    escalations_col.update_one(
        {"_id": ObjectId(req.escalation_id)},
        {"$set": {"resolved": True, "teacher_note": req.teacher_note, "resolved_at": _now()}}
    )
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
    mastery_col.update_one(
        {"student_id": esc["student_id"], "subtopic_id": esc["subtopic_id"]},
        {"$set": {"consecutive_wrong": 0, "escalated": False, "status": "skipped"}}
    )
    return {"message": "Student unblocked."}


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT ONBOARDING & DIAGNOSTIC
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/student/onboarding")
def student_onboarding(req: OnboardingRequest):
    student_profiles_col.update_one(
        {"student_id": req.student_id},
        {"$set": {
            "student_id":   req.student_id,
            "interest_tag": req.interest_tag,
            "onboarded_at": _now(),
        }},
        upsert=True,
    )
    return {"student_id": req.student_id, "interest_tag": req.interest_tag, "message": "Onboarding complete."}

@app.post("/api/student/diagnostic")
def submit_diagnostic(req: DiagnosticSubmitRequest):
    answer_map: dict = {item.subtopic_id: item.correct for item in req.answers}
    raw_p_l: dict = {sid: diagnostic_init(correct) for sid, correct in answer_map.items()}

    dag = _load_dag(req.unit_id)
    gated_p_l: dict = {}
    for subtopic_id, p_l in raw_p_l.items():
        prereqs = dag.get_prerequisites(subtopic_id)
        if prereqs:
            all_parents_correct = all(answer_map.get(pid, False) for pid in prereqs)
            gated_p_l[subtopic_id] = apply_prerequisite_gating(p_l, all_parents_correct)
        else:
            gated_p_l[subtopic_id] = p_l

    initialized = []
    for subtopic_id, p_l in gated_p_l.items():
        sub = subtopics_col.find_one({"_id": ObjectId(subtopic_id)})
        sub_name = sub["name"] if sub else subtopic_id

        state = NodeState(subtopic_id=subtopic_id, p_l=p_l)
        _save_bkt_state(req.student_id, req.unit_id, state)

        mastery_col.update_one(
            {"student_id": req.student_id, "subtopic_id": subtopic_id},
            {"$set": {
                "student_id": req.student_id,
                "subtopic_id": subtopic_id,
                "unit_id": req.unit_id,
                "mastery_score": _mastery_score_from_p_l(p_l),
                "consecutive_wrong": 0,
                "attempt_number": 1,
                "status": "active",
                "updated_at": _now(),
            }},
            upsert=True,
        )
        initialized.append({
            "subtopic_id": subtopic_id,
            "subtopic_name": sub_name,
            "p_l": round(p_l, 4),
            "mastery_score": _mastery_score_from_p_l(p_l),
            "zone": get_zone(p_l),
            "mastered": bkt_is_mastered(p_l),
        })

    return {"student_id": req.student_id, "unit_id": req.unit_id, "initialized": initialized}

@app.get("/api/student/topics")
async def get_student_topics():
    # Query your units collection
    units = await db["units"].find({}).to_list(100)
    return {
        "topics": [
            {
                "unit_id": str(u["_id"]),
                "topic": u.get("topic", "Untitled Topic"),
                "approved_subtopics": len(u.get("subtopics", []))
            }
            for u in units
        ]
    }


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT CORE WORKFLOW (JUST-IN-TIME GOVERNOR SYNTHESIS)
# ══════════════════════════════════════════════════════════════════════════════

def _build_bkt_summary(student_id: str, unit_id: str, subs: list, mmap: dict) -> dict:
    records = []
    total_pl = 0.0
    for sub in subs:
        sid = str(sub["_id"])
        p_l = mmap.get(sid, 0.0)
        total_pl += p_l
        records.append({
            "subtopic": sub["name"],
            "p_l": round(p_l, 4),
            "mastery_score": _mastery_score_from_p_l(p_l),
            "zone": get_zone(p_l),
            "mastered": bkt_is_mastered(p_l),
        })
    avg_pl = total_pl / len(subs) if subs else 0.0
    return {
        "completed": True,
        "avg_p_l": round(avg_pl, 4),
        "avg_mastery": _mastery_score_from_p_l(avg_pl),
        "subtopics": records,
        "progress": {"done": len(subs), "total": len(subs)},
        "message": "🎉 You've mastered all subtopics!" if avg_pl >= 0.60 else "Great effort! Keep practising.",
        "reason": Reason.UNIT_COMPLETE,
    }

def synthesize_pedagogical_action(state: str, concept: str, p_l: float, attempt_count: int):
    if state == "MASTERED":
        return {
            "type": "question",
            "badge": "MASTERED 🚀",
            "tier": "ADVANCED APPLICATION",
            "explanation": f"Exceptional work! You demonstrated mastery of {concept} with P(L)={p_l:.2f}.",
            "question": f"Advanced {concept}: How does the compiler resolve ambiguity when template arguments cannot be deduced implicitly?",
            "options": [
                "Explicitly specialize or specify type parameters at call site",
                "Compiler ignores type constraints and falls back to void*",
                "Promotes variables implicitly to global storage scope",
                "Invokes runtime dynamic casting automatically"
            ],
            "correct_index": 0
        }
    elif state == "OSCILLATING":
        return {
            "type": "scaffold_hint",
            "badge": "HESITATION DETECTED ⚖️",
            "tier": "CONCEPTUAL SCAFFOLD",
            "explanation": f"You were hesitating between options. Remember: {concept} relies on signature distinction, never on return types alone.",
            "hint": f"💡 Socratic Hint: Examine the parameter types carefully. A function cannot be overloaded solely by changing its return value.",
            "question": f"Given: `void print(int x)` and `int print(int x)`. Will this compile as valid {concept}?",
            "options": [
                "No, return type alone does not differentiate signatures",
                "Yes, return types distinguish overloaded functions in C++",
                "Only if compiled in C++20 mode",
                "Yes, provided both functions are declared inline"
            ],
            "correct_index": 0
        }
    elif state == "STRUGGLING":
        return {
            "type": "analogy_stepdown",
            "badge": "STEPPING DOWN 🧩",
            "tier": "INTUITIVE ANALOGY",
            "explanation": f"Let's step back from syntax. Think of {concept} like human conversation.",
            "analogy_text": f"Real-World Analogy: Think of the word 'Cook'. You can 'cook(vegetables)' or 'cook(pasta, sauce)'. The kitchen knows what to do based on what ingredients (arguments) you provide, even though the command has the exact same name!",
            "question": f"Based on this analogy, what must change for {concept} to work?",
            "options": [
                "The number or types of input parameters",
                "The return value of the function only",
                "The file name where the code is written",
                "The compiler optimization level"
            ],
            "correct_index": 0
        }
    else:  # PROGRESSING
        return {
            "type": "question",
            "badge": "PROGRESSING 🎯",
            "tier": "STANDARD PRACTICE",
            "explanation": f"P(L) progressing at {p_l:.2f}. Solidifying foundational understanding.",
            "question": f"In C++, which of the following is true regarding {concept}?",
            "options": [
                "It is resolved at compile-time based on parameter signatures",
                "It requires virtual tables and runtime resolution",
                "It can only be used with primitive data types",
                "Functions must have completely different names"
            ],
            "correct_index": 0
        }

@app.get("/api/student/next-activity")
@app.get("/api/student/next-activity")
@app.get("/api/student/next-activity")
def get_next_activity(student_id: str, unit_id: str):
    # 1. Fetch unit
    try:
        unit = units_col.find_one({"_id": ObjectId(unit_id)})
    except Exception:
        unit = units_col.find_one({})

    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")

    unit_id_str = str(unit.get("_id"))
    subtopics = unit.get("subtopics", ["Basic Overloading", "Resolution Ambiguity", "Template Specialization"])

    # 2. Query student progress for this unit to find the current active node
    # (Ordered by last updated to get their latest position)
    progress_doc = bkt_states_col.find_one(
        {"student_id": student_id, "unit_id": unit_id_str},
        sort=[("updated_at", -1)]
    )

    node_idx = progress_doc.get("current_node_index", 0) if progress_doc else 0

    # 3. Check for unit completion
    if node_idx >= len(subtopics):
        return {
            "completed": True,
            "message": f"Module Complete! You have mastered all {len(subtopics)} nodes in this curriculum.",
            "mastery_score": 100,
            "cognitive_state": "MODULE_MASTERED",
            "activity_payload": None
        }

    # 4. Resolve active node and specific node BKT state
    active_subtopic = subtopics[node_idx]
    active_subtopic_id = f"node_{node_idx}"

    node_bkt = bkt_states_col.find_one({
        "student_id": student_id,
        "subtopic_id": active_subtopic_id
    })

    p_l = node_bkt.get("p_l", 0.35) if node_bkt else 0.35
    state = node_bkt.get("state", "PROGRESSING") if node_bkt else "PROGRESSING"

    # 5. Synthesize JIT question on the fly
    content = generate_jit_activity(state, active_subtopic, p_l, [])

    return {
        "unit_id": unit_id_str,
        "subtopic_id": active_subtopic_id,
        "subtopic_name": active_subtopic,
        "mastery_score": int(p_l * 100),
        "p_l": round(p_l, 3),
        "cognitive_state": state,
        "action": content.get("tier"),
        "completed": False,
        "activity_payload": content
    }


@app.post("/api/student/submit-answer")
def submit_answer(req: SubmitAnswerRequest):
    active_unit_id = str(req.unit_id) if req.unit_id else "default_unit"

    # 1. Load Unit & Node Hierarchy
    unit = None
    try:
        unit = units_col.find_one({"_id": ObjectId(active_unit_id)})
    except Exception:
        unit = units_col.find_one({})

    subtopics = (
        unit.get("subtopics", ["Basic Overloading", "Resolution Ambiguity", "Template Specialization"])
        if unit
        else [req.subtopic_name or "Core Concepts"]
    )

    # 2. Retrieve Learner State (Find the latest record for this student and unit)
    bkt = bkt_states_col.find_one(
        {"student_id": str(req.student_id), "unit_id": active_unit_id},
        sort=[("updated_at", -1)]
    )
    p_l_prev = bkt.get("p_l", 0.35) if bkt else 0.35
    consecutive_wrong = bkt.get("consecutive_wrong", 0) if bkt else 0
    node_idx = bkt.get("current_node_index", 0) if bkt else 0
    history = bkt.get("history", []) if bkt else []

    # Safe subtopic ID (now node_idx is guaranteed defined)
    active_subtopic_id = str(req.subtopic_id) if req.subtopic_id else f"node_{node_idx}"

    # 3. Deterministic BKT Calculation
    P_G, P_S, P_T = 0.20, 0.10, 0.15
    if req.correct:
        numerator = p_l_prev * (1.0 - P_S)
        denominator = numerator + ((1.0 - p_l_prev) * P_G)
        consecutive_wrong = 0
    else:
        numerator = p_l_prev * P_S
        denominator = numerator + ((1.0 - p_l_prev) * (1.0 - P_G))
        consecutive_wrong += 1

    p_posterior = numerator / (denominator if denominator > 0 else 1.0)
    p_l_new = max(0.05, min(0.98, p_posterior + (1.0 - p_posterior) * P_T))

    # 4. Cognitive Governor Decision Matrix
    node_promoted = False
    if consecutive_wrong >= 2 or p_l_new < 0.25:
        cognitive_state = "STRUGGLING"
        pedagogical_action = "DEESCALATE_TO_ANALOGY"
    elif req.option_switch_count >= 2 or req.response_time_ms > 12000:
        cognitive_state = "OSCILLATING"
        pedagogical_action = "SERVE_SOCRATIC_SCAFFOLD"
    elif p_l_new >= 0.85:
        cognitive_state = "MASTERED"
        pedagogical_action = "PROMOTE_TO_NEXT_NODE"
        node_idx += 1
        node_promoted = True
        p_l_new = 0.35  # Reset prior for the next concept node
    else:
        cognitive_state = "PROGRESSING"
        pedagogical_action = "REINFORCE_PRACTICE"

    # Resolve target topic name
    clamped_node_idx = min(node_idx, len(subtopics) - 1)
    current_topic_name = subtopics[clamped_node_idx]
    next_subtopic_id = f"node_{clamped_node_idx}"

    # 5. Diagnostic Log to Terminal
    print("\n" + "═" * 70)
    print(f"🎓 LEARNER TELEMETRY: [{req.student_id}]")
    print(f"   Node: {req.subtopic_name} ──► Action: {'PROMOTING NODE 🚀' if node_promoted else 'RETAINING NODE'}")
    print(
        f"   Outcome: {'CORRECT (+)' if req.correct else 'INCORRECT (-)'} | Latency: {req.response_time_ms / 1000:.1f}s | Switches: {req.option_switch_count}")
    print("─" * 70)
    print(f"🧠 BKT POSTERIOR & COGNITIVE GOVERNOR:")
    print(f"   Prior P(L): {p_l_prev:.3f} ──► Posterior P(L): {p_l_new:.3f}")
    print(f"   Cognitive State: ──► {cognitive_state} ◄──")
    print(f"   Support Strategy: {pedagogical_action}")
    if node_promoted:
        print(f"   🎉 ADVANCED TO NEXT NODE: [{current_topic_name}] (Index: {node_idx}/{len(subtopics)})")
    print("═" * 70 + "\n")

    # 6. Save State with compound key (student_id + subtopic_id)
    history.append({
        "timestamp": datetime.now(timezone.utc),
        "node": req.subtopic_name,
        "correct": req.correct,
        "state": cognitive_state,
        "p_l": p_l_new
    })

    bkt_states_col.update_one(
        {
            "student_id": str(req.student_id),
            "subtopic_id": str(active_subtopic_id)  # Satisfies the unique index constraint
        },
        {
            "$set": {
                "unit_id": active_unit_id,
                "subtopic_name": current_topic_name,
                "p_l": p_l_new,
                "state": cognitive_state,
                "consecutive_wrong": consecutive_wrong,
                "current_node_index": node_idx,
                "history": history,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

    # 7. Synthesize JIT Next Activity
    next_payload = generate_jit_activity(cognitive_state, current_topic_name, p_l_new, history)

    return {
        "correct": req.correct,
        "p_l": round(p_l_new, 3),
        "mastery_score": int(p_l_new * 100),
        "mastery_delta": int((p_l_new - p_l_prev) * 100),
        "cognitive_state": cognitive_state,
        "pedagogical_action": pedagogical_action,
        "activity_payload": next_payload,
        "subtopic_id": next_subtopic_id,
        "subtopic_name": current_topic_name,
        "completed": node_idx >= len(subtopics)
    }

@app.post("/api/student/submit-answer")
def submit_answer(req: SubmitAnswerRequest):
    active_subtopic_id = req.subtopic_id or f"node_{node_idx}"

    # 1. READ LEARNER STATE
    bkt = bkt_states_col.find_one({
        "student_id": req.student_id,
        "subtopic_id": active_subtopic_id
    })
    p_l_prev = bkt.get("p_l", 0.20) if bkt else 0.20
    consecutive_wrong = bkt.get("consecutive_wrong", 0) if bkt else 0
    node_idx = bkt.get("current_node_index", 0) if bkt else 0
    history = bkt.get("history", []) if bkt else []

    # 2. DETERMINISTIC BAYESIAN KNOWLEDGE TRACING
    # P(G) = Guess = 0.20, P(S) = Slip = 0.10, P(T) = Transition = 0.15
    P_G, P_S, P_T = 0.20, 0.10, 0.15
    if req.correct:
        numerator = p_l_prev * (1.0 - P_S)
        denominator = numerator + ((1.0 - p_l_prev) * P_G)
        consecutive_wrong = 0
    else:
        numerator = p_l_prev * P_S
        denominator = numerator + ((1.0 - p_l_prev) * (1.0 - P_G))
        consecutive_wrong += 1

    p_posterior = numerator / (denominator if denominator > 0 else 1.0)
    p_l_new = max(0.05, min(0.98, p_posterior + (1.0 - p_posterior) * P_T))

    # 3. MULTI-MODAL GOVERNOR EVALUATION
    # Oscillating: Many option switches (>2) or long dwell (>12s)
    # Struggling: >=2 consecutive wrong answers or P(L) < 0.25
    # Mastered: P(L) >= 0.85
    if consecutive_wrong >= 2 or p_l_new < 0.25:
        cognitive_state = "STRUGGLING"
        pedagogical_action = "DEESCALATE_TO_ANALOGY"
    elif req.option_switch_count >= 2 or req.response_time_ms > 12000:
        cognitive_state = "OSCILLATING"
        pedagogical_action = "SERVE_SOCRATIC_SCAFFOLD"
    elif p_l_new >= 0.85:
        cognitive_state = "MASTERED"
        pedagogical_action = "PROMOTE_TO_NEXT_NODE"
    else:
        cognitive_state = "PROGRESSING"
        pedagogical_action = "REINFORCE_PRACTICE"

    # 4. PRINT FORMATTED STATE TRANSITION TO TERMINAL
    print("\n" + "═" * 70)
    print(f"🎓 LEARNER TELEMETRY RECEIVED: [{req.student_id}]")
    print(f"   Node: {req.subtopic_name} | Latency: {req.response_time_ms/1000:.1f}s | Switches: {req.option_switch_count}")
    print(f"   Outcome: {'CORRECT (+)' if req.correct else 'INCORRECT (-)'}")
    print("─" * 70)
    print(f"🧠 BAYESIAN KNOWLEDGE TRACING & GOVERNOR:")
    print(f"   Prior P(L)     : {p_l_prev:.3f} ──► Posterior P(L): {p_l_new:.3f}")
    print(f"   Cognitive State: ──► {cognitive_state} ◄──")
    print(f"   Support Strategy: {pedagogical_action}")
    print("═" * 70 + "\n")

    # 5. RECORD IN MONGO
    history.append({
        "timestamp": datetime.now(timezone.utc),
        "correct": req.correct,
        "latency_ms": req.response_time_ms,
        "switches": req.option_switch_count,
        "p_l": p_l_new,
        "state": cognitive_state
    })

    # 6. PERSIST STATE WITH SUBTOPIC_ID MATCHING THE UNIQUE INDEX
    bkt_states_col.update_one(
        {
            "student_id": req.student_id,
            "subtopic_id": active_subtopic_id
        },
        {"$set": {
            "unit_id": active_unit_id,
            "subtopic_name": current_topic_name,
            "p_l": p_l_new,
            "state": cognitive_state,
            "consecutive_wrong": consecutive_wrong,
            "current_node_index": node_idx,
            "history": history,
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )

    next_payload = synthesize_pedagogical_action(cognitive_state, req.subtopic_name, p_l_new, len(history))

    return {
        "correct": req.correct,
        "p_l": round(p_l_new, 3),
        "mastery_score": int(p_l_new * 100),
        "mastery_delta": int((p_l_new - p_l_prev) * 100),
        "cognitive_state": cognitive_state,
        "pedagogical_action": pedagogical_action,
        "activity_payload": next_payload
    }


# ══════════════════════════════════════════════════════════════════════════════
# AFFECTIVE TELEMETRY & MULTIMODAL DE-ESCALATION
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/student/affective-telemetry")
def check_affective_telemetry(payload: TelemetryPayload):
    return evaluate_affective_state(payload)

class DeescalationRequest(BaseModel):
    subtopic_name: str
    question_text: str

@app.post("/api/student/deescalate-cognitive-load")
def deescalate_cognitive_load(req: DeescalationRequest):
    deescalation_content = generate_cognitive_deescalation(
        subtopic=req.subtopic_name,
        question_text=req.question_text
    )
    return {"status": "success", "content": deescalation_content}

class SkipActivityRequest(BaseModel):
    student_id: str
    subtopic_id: str
    unit_id: str

@app.post("/api/student/skip-activity")
def skip_activity(req: SkipActivityRequest):
    student_id_str = str(req.student_id)
    mastery_col.update_one(
        {"student_id": student_id_str, "subtopic_id": req.subtopic_id},
        {"$set": {"status": "skipped", "updated_at": _now()}},
        upsert=True,
    )
    bkt_states_col.update_one(
        {"student_id": student_id_str, "subtopic_id": req.subtopic_id},
        {"$set": {"hard_question_attempt": 0, "status": "skipped", "updated_at": _now()}},
    )
    attempts_col.insert_one({
        "student_id": student_id_str,
        "subtopic_id": req.subtopic_id,
        "unit_id": req.unit_id,
        "action": "skipped_hard_question",
        "timestamp": _now(),
    })
    return {"status": "success", "message": "Moved to next topic."}

@app.get("/api/student/hybrid-rescue")
def get_hybrid_rescue(student_id: str, subtopic_id: str):
    sub = subtopics_col.find_one({"_id": ObjectId(subtopic_id)})
    if not sub:
        raise HTTPException(404, "Subtopic not found")

    recent_attempts = list(attempts_col.find(
        {"student_id": str(student_id), "subtopic_id": subtopic_id}
    ).sort("timestamp", -1).limit(6))

    failed = []
    easy_passed = None
    for att in recent_attempts:
        if not att.get("correct"):
            failed.append({
                "question": att.get("question_type", "question"),
                "selected_text": f"Option index {att.get('selected_option')}",
            })
        elif att.get("question_type") == "easy_question" and not easy_passed:
            easy_passed = {"text": "Understands parameter/syntax requirements"}

    rescue_data = generate_hybrid_bridge(
        topic=sub.get("topic", "C++"),
        subtopic=sub["name"],
        failed_questions=failed,
        easy_question_passed=easy_passed,
    )
    return {"status": "success", "subtopic_id": subtopic_id, "rescue": rescue_data}

@app.get("/api/student/mastery")
def get_mastery(student_id: str, unit_id: str):
    subs = list(subtopics_col.find({"unit_id": unit_id}).sort("order", 1))
    records = []
    for sub in subs:
        sid = str(sub["_id"])
        bkt_doc = bkt_states_col.find_one({"student_id": student_id, "subtopic_id": sid})
        p_l = bkt_doc["p_l"] if bkt_doc else DEFAULT_P_L0
        records.append({
            "subtopic_id": sid,
            "name": sub["name"],
            "p_l": round(p_l, 4),
            "mastery_score": _mastery_score_from_p_l(p_l),
            "zone": get_zone(p_l),
            "mastered": bkt_is_mastered(p_l),
            "consecutive_wrong": bkt_doc.get("consecutive_wrong", 0) if bkt_doc else 0,
        })
    return {"student_id": student_id, "unit_id": unit_id, "subtopics": records}

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from bson import ObjectId

class AddStudentRequest(BaseModel):
    name: str
    email: Optional[str] = ""
    grade_or_level: Optional[str] = "Beginner"


import uuid


@app.post("/api/admin/students")
def add_student(req: AddStudentRequest):
    name_clean = req.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Student name is required.")

    # Check for duplicate by name or email
    existing = student_profiles_col.find_one({
        "name": {"$regex": f"^{name_clean}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(status_code=400, detail="A student with this name already exists.")

    # Generate a clean, unique student_id
    generated_id = f"student_{name_clean.lower().replace(' ', '_')}_{uuid.uuid4().hex[:6]}"

    student_doc = {
        "student_id": generated_id,  # Satisfies the unique index constraint
        "name": name_clean,
        "email": req.email.strip().lower() if req.email else f"{name_clean.lower().replace(' ', '')}@learnable.local",
        "role": "Student",
        "grade_or_level": req.grade_or_level or "Beginner",
        "enabled": True,
        "created_at": datetime.now(timezone.utc)
    }

    result = student_profiles_col.insert_one(student_doc)

    return {
        "status": "success",
        "student_id": generated_id,
        "name": student_doc["name"],
        "email": student_doc["email"],
        "enabled": True
    }

@app.get("/api/admin/students")
def list_students():
    # Synchronous PyMongo cursor - DO NOT AWAIT
    cursor = student_profiles_col.find({}).sort("created_at", -1)
    students = list(cursor)
    return {
        "students": [
            {
                "student_id": str(s["_id"]),
                "name": s.get("name", "Unknown"),
                "email": s.get("email", ""),
                "enabled": s.get("enabled", True),
                "grade_or_level": s.get("grade_or_level", "Beginner")
            }
            for s in students
        ]
    }

@app.patch("/api/admin/students/{student_id}/toggle")
def toggle_student_access(student_id: str):
    try:
        oid = ObjectId(student_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid student ID format.")

    student = student_profiles_col.find_one({"_id": oid})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    new_status = not student.get("enabled", True)
    student_profiles_col.update_one({"_id": oid}, {"$set": {"enabled": new_status}})
    return {"status": "success", "enabled": new_status}
class LoginRequest(BaseModel):
    identifier: str
    role: Optional[str] = "Student"

@app.post("/api/login")
def login_user(req: LoginRequest):
    ident = req.identifier.strip().lower()

    # If logging in as Admin
    if req.role and req.role.lower() == "admin":
        if ident in ["admin", "admin@learnable.local"]:
            return {
                "status": "success",
                "user_id": "admin_01",
                "name": "Administrator",
                "role": "Admin",
            }
        raise HTTPException(status_code=403, detail="Invalid admin credentials.")

    # Student login check against student_profiles_col
    student = student_profiles_col.find_one({
        "$or": [
            {"email": {"$regex": f"^{ident}$", "$options": "i"}},
            {"name": {"$regex": f"^{ident}$", "$options": "i"}},
        ]
    })

    # Whitelist demo fallbacks
    if not student and ident in ["arun", "arun kumar", "meena", "meena devi", "ananya"]:
        return {
            "status": "success",
            "student_id": f"student_{ident.split()[0]}",
            "student_name": ident.title(),
            "role": "Student",
        }

    if not student:
        raise HTTPException(status_code=403, detail="Student not found or not approved by Admin.")

    if not student.get("enabled", True):
        raise HTTPException(status_code=403, detail="Access revoked by Admin.")

    return {
        "status": "success",
        "student_id": str(student["_id"]),
        "student_name": student["name"],
        "role": "Student",
    }


@app.get("/api/student/modules")
def get_student_modules():
    # Synchronous PyMongo query matching units_col
    cursor = units_col.find({}).sort("created_at", -1)
    raw_units = list(cursor)

    modules = []
    for u in raw_units:
        modules.append({
            "unit_id": str(u.get("_id")),
            "topic": u.get("topic", "Untitled Topic"),
            "subtopics": u.get("subtopics", []),
            "status": u.get("status", "ready"),
            "diagnostic_count": len(u.get("diagnostics", [])) if isinstance(u.get("diagnostics"), list) else 0
        })

    return {"modules": modules}

import json
import os
from groq import Groq

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", "your-groq-api-key"))

def generate_jit_activity(state: str, concept: str, p_l: float, student_history: list):
    """
    Synthesizes custom content on the fly using Groq based on cognitive state.
    """
    prompt = f"""
You are an expert adaptive tutor in C++ and Object-Oriented Programming.
Current Concept: "{concept}"
Learner Cognitive State: "{state}"
Learner Mastery P(L): {p_l:.2f}

Generate a single pedagogical JSON object matching this exact schema:
{{
  "type": "question" (or "scaffold_hint" if state is OSCILLATING, or "analogy_stepdown" if state is STRUGGLING),
  "badge": "Short 2-3 word state label with an emoji",
  "tier": "Curriculum Tier (e.g., Step-Down Analogy, Socratic Elimination, Core Practice, or Advanced Application)",
  "explanation": "Clear, direct pedagogical explanation of why the correct option works and why distractors fail",
  "hint": "Provide only if state is OSCILLATING: a subtle Socratic clue eliminating one distractor",
  "analogy_text": "Provide only if state is STRUGGLING: an intuitive real-world analogy breaking down the concept without raw code syntax",
  "question": "A clear, rigorous conceptual or code-analysis question targeting {concept}",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_index": 0
}}

Pedagogical Rules:
- If state == 'STRUGGLING': Lower cognitive load drastically. Use 'analogy_stepdown'. Do not use intimidating syntax. Provide 'analogy_text'.
- If state == 'OSCILLATING': Student is hesitating or flipping choices. Provide 'hint' to address common misconceptions.
- If state == 'MASTERED': High difficulty edge-case, compile-time trade-off, or complex template/overloading scenario.
- Return ONLY the valid, parseable JSON object with no markdown fences, greetings, or commentary.
"""
    try:
        completion = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"⚠️ Groq synthesis fallback invoked ({e}).")
        # Safe deterministic fallback
        return {
            "type": "question",
            "badge": f"{state} ",
            "tier": "ADAPTIVE PRACTICE",
            "explanation": f"Concept: {concept}. Ensure function signatures differ in parameters.",
            "question": f"Regarding {concept}, how does the compiler determine which function to invoke?",
            "options": [
                "By matching the exact sequence and types of arguments",
                "Based on the return type specified in the call",
                "By the order the functions were written in the source file",
                "By random selection at program runtime"
            ],
            "correct_index": 0
        }