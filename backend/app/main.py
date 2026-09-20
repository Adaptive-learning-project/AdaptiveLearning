"""
backend/app/main.py
Integrated Adaptive Neuro-Symbolic Learning Platform & FACP Assistive Governor
Adapted for Intellectually Differently Abled Students (Ages 4-7)
"""

import os
import sys
import time
import json
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from bson import ObjectId
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from app.schemas import CreateUnitRequest
from app.database import (
    units_col, subtopics_col, content_col,
    mastery_col, attempts_col, escalations_col,
    bkt_states_col, dag_config_col, student_profiles_col,
)
from app.schemas import (
    CreateUnitRequest, ApproveContentRequest,
    SubmitAnswerRequest, ResolveEscalationRequest,
    OnboardingRequest, DiagnosticSubmitRequest,
    PedagogicalDecision, CognitiveState, PedagogicalAction
)
from app.bkt import (
    full_update, diagnostic_init, apply_prerequisite_gating,
    get_zone, is_mastered as bkt_is_mastered,
    DEFAULT_P_L0, DEFAULT_P_T, DEFAULT_P_G, DEFAULT_P_S,
    MASTERY_THRESHOLD,
)
from app.cognitive_governor import CognitiveGovernor

app = FastAPI(title="FACP Adaptive Cognitive Engine", version="5.0.0")

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

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", "your-groq-api-key"))

# ── Helpers ──────────────────────────────────────────────────────────────────

def _oid(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def _now():
    return datetime.now(timezone.utc)

def map_facp_code(correct: bool, scaffold_type: str, audio_replays: int = 0) -> str:
    """Maps interaction telemetry and assistance to official NIMH FACP codes."""
    if not correct:
        return "-"
    if scaffold_type == "ELIMINATE_DISTRACTOR":
        return "PP"  # Physical / Errorless step-down
    if audio_replays > 0:
        return "VP"  # Verbal Prompting
    if scaffold_type == "HIGHLIGHT_TARGET":
        return "C"   # Occasional Cueing
    return "+"       # Independent Execution

# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "healthy", "service": "FACP Adaptive Engine"}

# ── Admin & Student Management ────────────────────────────────────────────────

class AddStudentRequest(BaseModel):
    name: str
    email: Optional[str] = ""
    grade_or_level: Optional[str] = "Pre-Primary"

@app.post("/api/admin/students")
def add_student(req: AddStudentRequest):
    name_clean = req.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Student name is required.")

    existing = student_profiles_col.find_one({
        "name": {"$regex": f"^{name_clean}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(status_code=400, detail="A student with this name already exists.")

    generated_id = f"student_{name_clean.lower().replace(' ', '_')}_{uuid.uuid4().hex[:6]}"

    student_doc = {
        "student_id": generated_id,
        "name": name_clean,
        "email": req.email.strip().lower() if req.email else f"{name_clean.lower().replace(' ', '')}@learnable.local",
        "role": "Student",
        "grade_or_level": req.grade_or_level or "Pre-Primary",
        "enabled": True,
        "created_at": _now()
    }
    student_profiles_col.insert_one(student_doc)

    return {
        "status": "success",
        "student_id": generated_id,
        "name": student_doc["name"],
        "email": student_doc["email"],
        "enabled": True
    }

@app.get("/api/admin/students")
def list_students():
    cursor = student_profiles_col.find({}).sort("created_at", -1)
    students = list(cursor)
    return {
        "students": [
            {
                "student_id": str(s["_id"]),
                "name": s.get("name", "Unknown"),
                "email": s.get("email", ""),
                "enabled": s.get("enabled", True),
                "grade_or_level": s.get("grade_or_level", "Pre-Primary")
            }
            for s in students
        ]
    }

# ── JIT Synthesis for Assistive Dual-Choice Canvases ──────────────────────────

def generate_jit_early_childhood(state: str, concept: str, p_l: float, action: str):
    prompt = f"""
You are an assistive early-childhood special education tutor for children aged 4-7 with intellectual disabilities.
Milestone Concept: "{concept}"
Learner Cognitive State: "{state}"
Active Action: "{action}"
Current Mastery P(L): {p_l:.2f}

Generate a single accessible early-childhood task matching this exact JSON schema:
{{
  "type": "pictorial_task",
  "spoken_prompt": "Very simple instruction (max 6 words, clear English)",
  "badge": "Short 2-3 word state label with an emoji",
  "scaffold_type": "{'ELIMINATE_DISTRACTOR' if action == 'ELIMINATE_DISTRACTOR' else ('HIGHLIGHT_TARGET' if action == 'HIGHLIGHT_TARGET' else 'STANDARD_CHOICE')}",
  "visual_anchor": "Description of the main central illustration",
  "choices": [
    {{"id": "c1", "label": "Big Red Apple", "symbol": "🍎", "is_correct": true}},
    {{"id": "c2", "label": "Small Green Leaf", "symbol": "🍃", "is_correct": false}}
  ],
  "praise_audio": "Cheering verbal feedback"
}}

Rules:
- Choices must be strictly binary (exactly 2 choices).
- Strictly NO dense reading paragraphs.
- Return ONLY valid parseable JSON.
"""
    try:
        completion = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"⚠️ Groq synthesis fallback invoked ({e}).")
        return {
            "type": "pictorial_task",
            "spoken_prompt": f"Touch the {concept}",
            "badge": f"{state} 🎯",
            "scaffold_type": "STANDARD_CHOICE" if action != "ELIMINATE_DISTRACTOR" else "ELIMINATE_DISTRACTOR",
            "visual_anchor": concept,
            "choices": [
                {"id": "c1", "label": "Target Item", "symbol": "⭐", "is_correct": True},
                {"id": "c2", "label": "Other Item", "symbol": "⚪", "is_correct": False}
            ],
            "praise_audio": "Great job!"
        }

# ── Student Workflow Endpoints ────────────────────────────────────────────────

@app.get("/api/student/next-activity")
def get_next_activity(student_id: str, unit_id: Optional[str] = None):
    # 1. Resolve unit dynamically from database
    unit = None
    if unit_id and ObjectId.is_valid(unit_id):
        unit = units_col.find_one({"_id": ObjectId(unit_id)})

    if not unit:
        # Fetch the most recently created active unit
        unit = units_col.find_one(sort=[("created_at", -1)])

    if not unit:
        raise HTTPException(status_code=404, detail="No curriculum units found in database.")

    unit_id_str = str(unit["_id"])

    # 2. Dynamically fetch subtopics from subtopics_col (or unit document)
    subtopic_docs = list(
        subtopics_col.find({"unit_id": unit_id_str}).sort("order", 1)
    )

    if subtopic_docs:
        subtopics = [s["name"] for s in subtopic_docs]
    else:
        # Fall back to subtopics array stored directly on the unit document
        subtopics = unit.get("subtopics", [])

    if not subtopics:
        raise HTTPException(
            status_code=400,
            detail=f"Unit '{unit.get('topic', unit_id_str)}' has no subtopics configured."
        )

    # 3. Retrieve student's progression state
    bkt_doc = bkt_states_col.find_one(
        {"student_id": str(student_id), "unit_id": unit_id_str},
        sort=[("updated_at", -1)]
    )
    node_idx = bkt_doc.get("current_node_index", 0) if bkt_doc else 0

    # 4. Check for module completion
    if node_idx >= len(subtopics):
        return {
            "completed": True,
            "unit_id": unit_id_str,
            "unit_topic": unit.get("topic", ""),
            "message": f"All {len(subtopics)} milestones mastered for this module.",
            "mastery_score": 100,
            "activity_payload": None,
        }

    active_subtopic = subtopics[node_idx]
    active_subtopic_id = (
        str(subtopic_docs[node_idx]["_id"])
        if subtopic_docs and node_idx < len(subtopic_docs)
        else f"node_{node_idx}"
    )

    p_l = bkt_doc.get("p_l", DEFAULT_P_L0) if bkt_doc else DEFAULT_P_L0
    consecutive_wrong = bkt_doc.get("consecutive_wrong", 0) if bkt_doc else 0

    total_attempts = len(bkt_doc.get("history", [])) if bkt_doc else 0

    state = CognitiveGovernor.diagnose_state(
        p_l=p_l,
        is_correct=True,
        consecutive_wrong=consecutive_wrong,
        response_time_ms=0,
        option_switch_count=0,
        total_attempts=total_attempts,
    )

    decision = CognitiveGovernor.decide_action(active_subtopic, state, p_l)
    content = generate_jit_early_childhood(state, active_subtopic, p_l, decision.action)

    return {
        "unit_id": unit_id_str,
        "unit_topic": unit.get("topic", ""),
        "subtopic_id": active_subtopic_id,
        "subtopic_name": active_subtopic,
        "current_node_index": node_idx,
        "total_nodes": len(subtopics),
        "mastery_score": int(p_l * 100),
        "p_l": round(p_l, 4),
        "cognitive_state": state,
        "action": decision.action,
        "completed": False,
        "activity_payload": content,
    }

from app.facp_evaluator import classify_facp_code, calculate_facp_mastery

@app.post("/api/student/submit-answer")
def submit_answer(req: SubmitAnswerRequest):
    active_unit_id = str(req.unit_id) if req.unit_id else "facp_preprimary"
    unit = units_col.find_one({"_id": ObjectId(active_unit_id)}) if ObjectId.is_valid(active_unit_id) else units_col.find_one({})
    subtopics = unit.get("subtopics", ["Color Identification", "Size Comparison", "Number Concept 1-5"]) if unit else [req.subtopic_name or "Color Identification"]

    # 1. Fetch current student state
    bkt = bkt_states_col.find_one(
        {"student_id": str(req.student_id)},
        sort=[("updated_at", -1)]
    )
    p_l_prev = bkt.get("p_l", DEFAULT_P_L0) if bkt else DEFAULT_P_L0
    consecutive_wrong = bkt.get("consecutive_wrong", 0) if bkt else 0
    node_idx = bkt.get("current_node_index", 0) if bkt else 0
    history = bkt.get("history", []) if bkt else []

    active_subtopic_id = req.subtopic_id or f"node_{node_idx}"
    current_topic_name = subtopics[min(node_idx, len(subtopics) - 1)]

    # 2. Map FACP Prompt Level from Telemetry & Active UI State
    facp_code = classify_facp_code(
        correct=req.correct,
        active_scaffold=req.active_scaffold or "NONE",
        audio_replay_count=req.audio_replay_count or 0,
    )

    # 3. BKT Update (Attenuated transition when assisted)
    hint_used = facp_code in ["C", "VP", "PP"]
    p_l_new = full_update(p_l_prev, req.correct, hint_used=hint_used)

    if req.correct:
        consecutive_wrong = 0
    else:
        consecutive_wrong += 1

    # Append current trial to history
    history.append({
        "timestamp": _now(),
        "subtopic": current_topic_name,
        "correct": req.correct,
        "latency_ms": req.response_time_ms,
        "switches": req.option_switch_count,
        "facp_code": facp_code,
        "p_l": p_l_new
    })

    # 4. Check FACP 80% Criterion
    facp_stats = calculate_facp_mastery(history)

    # 5. Diagnose State via CognitiveGovernor
    cognitive_state = CognitiveGovernor.diagnose_state(
        p_l=p_l_new,
        is_correct=req.correct,
        consecutive_wrong=consecutive_wrong,
        response_time_ms=req.response_time_ms,
        option_switch_count=req.option_switch_count,
    )

    # 6. Override with FACP Promotion if 80% threshold reached
    node_promoted = False
    if facp_stats["promotion_eligible"] or cognitive_state == "MASTERED":
        cognitive_state = "MASTERED"
        pedagogical_action = "ADVANCE_CONCEPT_NODE"
        node_idx += 1
        node_promoted = True
        p_l_new = DEFAULT_P_L0  # Reset prior for next developmental milestone
    else:
        decision = CognitiveGovernor.decide_action(
            concept=current_topic_name,
            state=cognitive_state,
            p_l=p_l_new
        )
        pedagogical_action = decision.action

    # 7. Print Formatted Terminal Diagnostics
    print("\n" + "═" * 70)
    print(f"🎓 FACP TELEMETRY LOG: Student [{req.student_id}]")
    print(f"   Node: {current_topic_name} | FACP Evaluation: [{facp_code}]")
    print(f"   Latency: {req.response_time_ms/1000:.1f}s | Switches: {req.option_switch_count} | Replays: {req.audio_replay_count}")
    print(f"   BKT Mastery: {p_l_prev:.4f} ──► {p_l_new:.4f}")
    print(f"   Rolling 80% Pass Ratio: {facp_stats['pass_percentage']}% ({facp_stats['qualifying_passes']}/{facp_stats['total_attempts']})")
    print(f"   Action: {pedagogical_action} | Next Milestone: {'PROMOTING 🚀' if node_promoted else 'RETAINING'}")
    print("═" * 70 + "\n")

    # 8. Persist to MongoDB
    bkt_states_col.update_one(
        {"student_id": str(req.student_id), "subtopic_id": str(active_subtopic_id)},
        {"$set": {
            "unit_id": active_unit_id,
            "subtopic_name": current_topic_name,
            "p_l": p_l_new,
            "state": cognitive_state,
            "consecutive_wrong": consecutive_wrong,
            "current_node_index": node_idx,
            "last_facp_code": facp_code,
            "history": history,
            "updated_at": _now()
        }},
        upsert=True
    )

    next_payload = generate_jit_early_childhood(cognitive_state, current_topic_name, p_l_new, pedagogical_action)

    return {
        "correct": req.correct,
        "facp_code": facp_code,
        "p_l": round(p_l_new, 4),
        "mastery_score": int(p_l_new * 100),
        "cognitive_state": cognitive_state,
        "pedagogical_action": pedagogical_action,
        "facp_stats": facp_stats,
        "activity_payload": next_payload,
        "completed": node_idx >= len(subtopics)
    }


@app.get("/api/student/{student_id}/facp-report")
def get_facp_report(student_id: str):
    """Generates the official digitized FACP assessment matrix for educators."""
    bkt_doc = bkt_states_col.find_one(
        {"student_id": str(student_id)},
        sort=[("updated_at", -1)]
    )
    if not bkt_doc:
        raise HTTPException(status_code=404, detail="Student FACP records not found.")

    history = bkt_doc.get("history", [])
    facp_stats = calculate_facp_mastery(history, window_size=len(history))

    return {
        "student_id": student_id,
        "active_subtopic": bkt_doc.get("subtopic_name", "Color Identification"),
        "current_node_index": bkt_doc.get("current_node_index", 0),
        "p_l": round(bkt_doc.get("p_l", DEFAULT_P_L0), 4),
        "facp_stats": facp_stats,
        "history_timeline": history[-10:],
    }

class LoginRequest(BaseModel):
    identifier: str
    role: Optional[str] = "Student"

@app.post("/api/login")
def login_user(req: LoginRequest):
    ident = req.identifier.strip().lower()

    # 1. Admin login check
    if req.role and req.role.lower() == "admin":
        if ident in ["admin", "admin@learnable.local"]:
            return {
                "status": "success",
                "user_id": "admin_01",
                "name": "Administrator",
                "role": "Admin",
            }
        raise HTTPException(status_code=403, detail="Invalid admin credentials.")

    # 2. Student login check against MongoDB
    student = student_profiles_col.find_one({
        "$or": [
            {"email": {"$regex": f"^{ident}$", "$options": "i"}},
            {"name": {"$regex": f"^{ident}$", "$options": "i"}},
            {"student_id": ident}
        ]
    })

    # 3. Fallback demo whitelist
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
        "student_id": str(student.get("student_id", student["_id"])),
        "student_name": student["name"],
        "role": "Student",
    }
@app.post("/api/admin/students")
def add_student(req: AddStudentRequest):
    name_clean = req.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Student name is required.")

    existing = student_profiles_col.find_one({
        "name": {"$regex": f"^{name_clean}$", "$options": "i"}
    })

    if existing:
        # Return existing student instead of crashing with 400
        return {
            "status": "success",
            "student_id": existing.get("student_id", str(existing["_id"])),
            "name": existing["name"],
            "email": existing.get("email", ""),
            "enabled": existing.get("enabled", True),
            "message": "Student already registered; profile active."
        }

    generated_id = f"student_{name_clean.lower().replace(' ', '_')}_{uuid.uuid4().hex[:6]}"
    student_doc = {
        "student_id": generated_id,
        "name": name_clean,
        "email": req.email.strip().lower() if req.email else f"{name_clean.lower().replace(' ', '')}@learnable.local",
        "role": "Student",
        "grade_or_level": req.grade_or_level or "Pre-Primary",
        "enabled": True,
        "created_at": _now()
    }
    student_profiles_col.insert_one(student_doc)

    return {
        "status": "success",
        "student_id": generated_id,
        "name": student_doc["name"],
        "email": student_doc["email"],
        "enabled": True
    }

# ── Modules & Units Routes ───────────────────────────────────────────────────

@app.get("/api/student/modules")
def get_student_modules():
    """Returns available curriculum modules for the student dashboard."""
    cursor = units_col.find({}).sort("created_at", -1)
    raw_units = list(cursor)

    modules = []
    for u in raw_units:
        modules.append({
            "unit_id": str(u.get("_id")),
            "topic": u.get("topic", "FACP Milestone Module"),
            "subtopics": u.get("subtopics", []),
            "status": u.get("status", "ready"),
            "diagnostic_count": len(u.get("diagnostics", [])) if isinstance(u.get("diagnostics"), list) else 0
        })

    return {"modules": modules}


@app.post("/api/admin/units")
@app.post("/api/teacher/units")
def create_unit(req: CreateUnitRequest, background_tasks: BackgroundTasks):
    """Creates a new curriculum unit or developmental milestone module."""
    topic_name = req.topic.strip() if req.topic else "FACP Academic Milestones"
    subtopics = req.subtopics or ["Color Identification", "Size Comparison", "Number Concept 1-5"]

    unit_doc = {
        "admin_id": getattr(req, "teacher_id", "admin_01"),
        "topic": topic_name,
        "subtopics": subtopics,
        "reference_text": getattr(req, "reference_text", ""),
        "status": "ready",
        "created_at": _now(),
    }
    inserted = units_col.insert_one(unit_doc)
    unit_id_str = str(inserted.inserted_id)

    # Insert subtopics records if subtopics_col is tracked
    subtopic_ids = []
    for idx, sub_name in enumerate(subtopics):
        sub_doc = {
            "unit_id": unit_id_str,
            "topic": topic_name,
            "name": sub_name,
            "order": idx,
            "content_approved": True,
            "created_at": _now(),
        }
        sub_inserted = subtopics_col.insert_one(sub_doc)
        subtopic_ids.append(str(sub_inserted.inserted_id))

    return {
        "status": "success",
        "unit_id": unit_id_str,
        "topic": topic_name,
        "subtopics": subtopics,
        "subtopic_ids": subtopic_ids,
        "message": f"Unit created successfully with {len(subtopics)} milestones."
    }
# ── Admin Units & Escalations ────────────────────────────────────────────────

@app.get("/api/admin/units")
@app.get("/api/teacher/units")
def list_admin_units():
    """Returns the list of created units for the admin dashboard."""
    units = list(units_col.find().sort("created_at", -1))
    return {"units": [_oid(u) for u in units]}





