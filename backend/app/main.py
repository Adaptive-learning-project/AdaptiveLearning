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
import random
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from bson import ObjectId
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from groq import Groq

from app.database import (
    units_col, subtopics_col, content_col,
    mastery_col, attempts_col, escalations_col,
    bkt_states_col, dag_config_col, student_profiles_col,
)
from app.schemas import (
    CreateUnitRequest, ApproveContentRequest,
    SubmitAnswerRequest, ResolveEscalationRequest,
    OnboardingRequest, DiagnosticSubmitRequest,
    PedagogicalDecision, CognitiveState, PedagogicalAction,
    JITActivityRequest, JITActivityResponse,
    JITTeachingRequest, JITTeachingResponse,
    JITQuestionRequest, JITQuestionResponse,
)
from app.llm_generator import (
    generate_jit_visual_activity as generate_d1_visual_activity,
    generate_jit_teaching_content,
    generate_jit_question_from_teaching,
)
from app.bkt import (
    full_update, diagnostic_init, apply_prerequisite_gating,
    get_zone, is_mastered as bkt_is_mastered,
    DEFAULT_P_L0, DEFAULT_P_T, DEFAULT_P_G, DEFAULT_P_S,
    MASTERY_THRESHOLD,
)
from app.cognitive_governor import CognitiveGovernor
from app.facp_evaluator import classify_facp_code, calculate_facp_mastery

app = FastAPI(title="FACP Adaptive Cognitive Engine", version="5.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
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

# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "healthy", "service": "FACP Adaptive Engine"}

# ── FACP PREPRIMARY COLOR MILESTONE DAG (Item 12) ────────────────────────────

FACP_COLOR_CURRICULUM = [
    {
        "id": "preprimary_acad_12_red",
        "facp_item_no": 12,
        "name": "Red Color Identification",
        "target_color": "red",
        "tamil_name": "சிகப்பு",
        "target_asset": "tile_red",
        "distractor_asset": "tile_green",
    },
    {
        "id": "preprimary_acad_12_green",
        "facp_item_no": 12,
        "name": "Green Color Identification",
        "target_color": "green",
        "tamil_name": "பச்சை",
        "target_asset": "tile_green",
        "distractor_asset": "tile_red",  # Contrasts with previously mastered color
    },
    {
        "id": "preprimary_acad_12_blue",
        "facp_item_no": 12,
        "name": "Blue Color Identification",
        "target_color": "blue",
        "tamil_name": "நீலம்",
        "target_asset": "tile_blue",
        "distractor_asset": "tile_yellow",
    },
    {
        "id": "preprimary_acad_12_yellow",
        "facp_item_no": 12,
        "name": "Yellow Color Identification",
        "target_color": "yellow",
        "tamil_name": "மஞ்சள்",
        "target_asset": "tile_yellow",
        "distractor_asset": "tile_blue",  # Contrasts with previously mastered color
    },
]

D1_IMAGE_ASSETS = {
    "tile_red": "a solid bright red square tile",
    "tile_green": "a solid bright green square tile",
    "tile_blue": "a solid bright blue square tile",
    "tile_yellow": "a solid bright yellow square tile",
    "ball_big_red": "a big red ball",
    "ball_small_green": "a small green ball",
}

def _resolve_d1_unit(unit_id: Optional[str] = None):
    unit = None
    if unit_id and ObjectId.is_valid(str(unit_id)):
        unit = units_col.find_one({"_id": ObjectId(str(unit_id))})
    if not unit:
        unit = units_col.find_one(sort=[("created_at", -1)])
    if not unit:
        # Create a default curriculum container if database is empty
        new_unit = {
            "topic": "Preprimary Academic Milestones",
            "subtopics": [c["name"] for c in FACP_COLOR_CURRICULUM],
            "status": "ready",
            "created_at": _now()
        }
        res = units_col.insert_one(new_unit)
        new_unit["_id"] = res.inserted_id
        return new_unit
    return unit

def _derive_d1_difficulty(p_l: float, cognitive_state: str, action: str) -> str:
    if cognitive_state in {"STRUGGLING", "OSCILLATING"} or action == "ELIMINATE_DISTRACTOR":
        return "easy"
    if cognitive_state == "MASTERED" or p_l >= 0.70:
        return "hard"
    if p_l >= 0.40:
        return "medium"
    return "easy"

def _find_active_jit_state(student_id: str, unit_id: Optional[str] = None):
    query: Dict[str, Any] = {
        "student_id": str(student_id),
        "active_jit_session": {"$exists": True},
    }
    if unit_id:
        query["unit_id"] = str(unit_id)
    return bkt_states_col.find_one(query, sort=[("updated_at", -1)])

def _get_d1_adaptive_context(
    student_id: str,
    unit_id: Optional[str] = None,
    subtopic_id: Optional[str] = None,
):
    unit = _resolve_d1_unit(unit_id)
    unit_id_str = str(unit["_id"])
    unit_topic = str(unit.get("topic", "FACP Pre-Primary Academic"))

    # Fetch master student progression record across this module
    bkt_doc = bkt_states_col.find_one(
        {"student_id": str(student_id), "unit_id": unit_id_str},
        sort=[("updated_at", -1)],
    )

    node_idx = int(bkt_doc.get("current_node_index", 0)) if bkt_doc else 0
    node_idx = max(0, min(node_idx, len(FACP_COLOR_CURRICULUM) - 1))

    active_milestone = FACP_COLOR_CURRICULUM[node_idx]
    active_subtopic = active_milestone["name"]
    active_subtopic_id = active_milestone["id"]

    p_l = float(bkt_doc.get("p_l", DEFAULT_P_L0)) if bkt_doc else DEFAULT_P_L0
    consecutive_wrong = int(bkt_doc.get("consecutive_wrong", 0)) if bkt_doc else 0
    history = bkt_doc.get("history", []) if bkt_doc else []

    cognitive_state = CognitiveGovernor.diagnose_state(
        p_l=p_l,
        is_correct=True,
        consecutive_wrong=consecutive_wrong,
        response_time_ms=0,
        option_switch_count=0,
        total_attempts=len(history),
    )

    decision = CognitiveGovernor.decide_action(
        concept=active_subtopic,
        state=cognitive_state,
        p_l=p_l,
    )

    difficulty = _derive_d1_difficulty(
        p_l=p_l,
        cognitive_state=cognitive_state,
        action=decision.action,
    )

    learning_objective = f"Identify the color {active_milestone['target_color']} using solid colored tiles"
    teaching_allowed_keys = [active_milestone["target_asset"]]
    question_allowed_keys = [active_milestone["target_asset"], active_milestone["distractor_asset"]]

    return {
        "unit_id": unit_id_str,
        "unit_topic": unit_topic,
        "subtopic_id": active_subtopic_id,
        "subtopic_name": active_subtopic,
        "learning_objective": learning_objective,
        "difficulty": difficulty,
        "activity_type": "picture_choice",
        "reference_text": unit.get("reference_text", ""),
        "p_l": p_l,
        "cognitive_state": cognitive_state,
        "governor_action": decision.action,
        "node_index": node_idx,
        "allowed_image_keys": question_allowed_keys,
        "teaching_allowed_keys": teaching_allowed_keys,
        "question_allowed_keys": question_allowed_keys,
        "active_milestone": active_milestone,
    }

def _save_active_jit_state(
    student_id: str,
    context: dict,
    teaching: dict,
):
    session_doc = {
        "unit_id": context["unit_id"],
        "unit_topic": context.get("unit_topic", "FACP Pre-Primary"),
        "subtopic_id": context["subtopic_id"],
        "subtopic_name": context["subtopic_name"],
        "learning_objective": context["learning_objective"],
        "difficulty": context["difficulty"],
        "activity_type": context["activity_type"],
        "allowed_image_keys": context["allowed_image_keys"],
        "governor_action": context["governor_action"],
        "cognitive_state": context["cognitive_state"],
        "p_l_at_teaching": context["p_l"],
        "teaching": teaching,
        "question": None,
        "created_at": _now(),
        "updated_at": _now(),
    }

    bkt_states_col.update_one(
        {
            "student_id": str(student_id),
            "unit_id": context["unit_id"],
        },
        {
            "$set": {
                "unit_id": context["unit_id"],
                "subtopic_id": context["subtopic_id"],
                "subtopic_name": context["subtopic_name"],
                "active_jit_session": session_doc,
                "updated_at": _now(),
            },
            "$setOnInsert": {
                "student_id": str(student_id),
                "p_l": context["p_l"],
                "consecutive_wrong": 0,
                "current_node_index": context.get("node_index", 0),
                "history": [],
            },
        },
        upsert=True,
    )

# ── REQUEST MODELS (MUST BE DEFINED BEFORE ENDPOINTS) ────────────────────────

class JITSubmitAnswerRequest(BaseModel):
    student_id: str
    question_id: str
    answer: str
    unit_id: Optional[str] = None
    subtopic_id: Optional[str] = None
    response_time_ms: Optional[int] = 0
    option_switch_count: Optional[int] = 0
    audio_replay_count: Optional[int] = 0
    active_scaffold: Optional[str] = "NONE"

    class Config:
        extra = "ignore"

class LoginRequest(BaseModel):
    identifier: str
    role: Optional[str] = "Student"

class AddStudentRequest(BaseModel):
    name: str
    email: Optional[str] = ""
    grade_or_level: Optional[str] = "Pre-Primary"

# ── D1 JIT TEACH & QUESTION ENDPOINTS ─────────────────────────────────────────

@app.post("/api/student/jit-teaching", response_model=JITTeachingResponse)
def generate_jit_teaching_endpoint(request: JITTeachingRequest):
    try:
        context = _get_d1_adaptive_context(
            student_id=request.student_id,
            unit_id=request.unit_id,
            subtopic_id=request.subtopic_id,
        )

        teaching_keys = context.get("teaching_allowed_keys") or [context["active_milestone"]["target_asset"]]

        teaching = generate_jit_teaching_content(
            learning_objective=context["learning_objective"],
            allowed_image_keys=teaching_keys,
            difficulty=context["difficulty"],
            activity_type=context["activity_type"],
            image_asset_descriptions=D1_IMAGE_ASSETS,
            reference_context=context["reference_text"],
        )

        _save_active_jit_state(
            student_id=request.student_id,
            context=context,
            teaching=teaching,
        )

        target_tamil = context["active_milestone"].get("tamil_name", "சிகப்பு")
        polite_tamil = f"இதுதான் {target_tamil}. {target_tamil} நிறத்த தொடுங்க!"

        return {
            "success": True,
            "phase": "teach",
            "unit_id": context["unit_id"],
            "teaching": {
                "phase": "teach",
                "spoken_teaching": teaching["spoken_teaching"],
                "spoken_tamil": teaching.get("spoken_tamil") or polite_tamil,
                "visuals": teaching["visuals"],
            },
            "adaptive": {
                "subtopic_id": context["subtopic_id"],
                "subtopic_name": context["subtopic_name"],
                "learning_objective": context["learning_objective"],
                "difficulty": context["difficulty"],
                "zone": "standard",
                "reason": "INDEPENDENT_RETRIEVAL",
                "p_l": context["p_l"],
            },
            "model": "openai/gpt-oss-120b",
            "generation_attempts": 1,
        }
    except HTTPException:
        raise
    except Exception as e:
        print("❌ D1 teaching endpoint failed:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/student/jit-question")
@app.post("/api/student/jit-question")
def generate_jit_question_endpoint(request: JITQuestionRequest):
    try:
        student_id = str(request.student_id).strip()
        unit_id = str(request.unit_id).strip() if request.unit_id else None

        # 1. Fetch current student BKT record to know active color node
        bkt_doc = bkt_states_col.find_one(
            {"student_id": student_id},
            sort=[("updated_at", -1)],
        )

        node_idx = int(bkt_doc.get("current_node_index", 0)) if bkt_doc else 0
        node_idx = max(0, min(node_idx, len(FACP_COLOR_CURRICULUM) - 1))
        active_milestone = FACP_COLOR_CURRICULUM[node_idx]

        target_key = active_milestone["target_asset"]
        distractor_key = active_milestone["distractor_asset"]
        target_tamil = active_milestone.get("tamil_name", "சிகப்பு")
        learning_objective = f"Identify the color {active_milestone['target_color']} using solid colored tiles"

        # 2. Try LLM generation safely
        question_data = None
        teaching_content = (bkt_doc.get("active_jit_session", {}) or {}).get("teaching", {})

        try:
            question_data = generate_jit_question_from_teaching(
                learning_objective=learning_objective,
                allowed_image_keys=[target_key, distractor_key],
                taught_content=teaching_content,
                difficulty="easy",
            )
        except Exception as llm_err:
            print(f"⚠️ LLM question generation skipped/failed ({llm_err}), using safe schema.")

        # 3. Build validated binary choices
        choices = []
        if question_data and isinstance(question_data.get("choices"), list):
            choices = question_data["choices"]

        correct_choices = [c for c in choices if c.get("is_correct") is True]

        if len(correct_choices) != 1:
            # Deterministic safe pair guaranteed to be valid
            choices = [
                {"id": "c1", "image_key": target_key, "is_correct": True},
                {"id": "c2", "image_key": distractor_key, "is_correct": False},
            ]

        # Prevent spatial memorization
        random.shuffle(choices)

        question_id = f"jit_{student_id}_{uuid.uuid4().hex[:10]}"
        correct_answer_id = next(
            (c.get("image_key") or c.get("id")) for c in choices if c.get("is_correct") is True
        )

        spoken_tamil = (
            (question_data.get("spoken_tamil") if question_data else "")
            or f"{target_tamil} நிறத்த தொடுங்க!"
        )
        spoken_prompt = (
            (question_data.get("spoken_prompt") if question_data else "")
            or f"Touch the {active_milestone['target_color']} color"
        )

        stored_question = {
            "question_id": question_id,
            "activity_type": "vector_choice",
            "spoken_prompt": spoken_prompt,
            "spoken_tamil": spoken_tamil,
            "choices": choices,
            "correct_answer": correct_answer_id,
            "created_at": _now(),
        }

        # 4. Persist to MongoDB safely using upsert (never fails on missing record)
        bkt_states_col.update_one(
            {"student_id": student_id},
            {
                "$set": {
                    "active_jit_session.question": stored_question,
                    "active_jit_session.question_id": question_id,
                    "active_jit_session.subtopic_id": active_milestone["id"],
                    "active_jit_session.subtopic_name": active_milestone["name"],
                    "active_jit_session.learning_objective": learning_objective,
                    "active_jit_session.allowed_image_keys": [target_key, distractor_key],
                    "updated_at": _now(),
                },
                "$setOnInsert": {
                    "student_id": student_id,
                    "unit_id": unit_id or "default_preprimary",
                    "p_l": DEFAULT_P_L0,
                    "consecutive_wrong": 0,
                    "current_node_index": node_idx,
                    "history": [],
                },
            },
            upsert=True,
        )

        p_l_val = float(bkt_doc.get("p_l", DEFAULT_P_L0)) if bkt_doc else DEFAULT_P_L0

        return {
            "success": True,
            "phase": "question",
            "question_id": question_id,
            "activity": stored_question,
            "adaptive": {
                "subtopic_id": active_milestone["id"],
                "subtopic_name": active_milestone["name"],
                "learning_objective": learning_objective,
                "difficulty": "easy",
                "p_l": p_l_val,
            },
        }

    except Exception as e:
        print("\n❌ CRITICAL ERROR IN /api/student/jit-question:")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")
@app.post("/api/submit")
def submit_jit_answer(request: JITSubmitAnswerRequest):
    try:
        # 1. Safely extract student_id
        student_id = str(getattr(request, "student_id", "") or "student_ananya").strip()

        # 2. First find master record to get current milestone index
        master_doc = bkt_states_col.find_one(
            {"student_id": student_id},
            sort=[("updated_at", -1)]
        )
        node_idx = int(master_doc.get("current_node_index", 0)) if master_doc else 0
        node_idx = max(0, min(node_idx, len(FACP_COLOR_CURRICULUM) - 1))

        # Define active_milestone FIRST so it is always accessible
        active_milestone = FACP_COLOR_CURRICULUM[node_idx]

        # 3. Fetch or initialize the BKT document for this specific milestone
        bkt_doc = bkt_states_col.find_one(
            {"student_id": student_id, "subtopic_id": active_milestone["id"]},
            sort=[("updated_at", -1)]
        )

        if not bkt_doc:
            bkt_doc = master_doc or {
                "student_id": student_id,
                "subtopic_id": active_milestone["id"],
                "p_l": DEFAULT_P_L0,
                "current_node_index": node_idx,
                "consecutive_wrong": 0,
                "history": [],
            }

        session = bkt_doc.get("active_jit_session") or {}
        stored_question = session.get("question") or {}

        # 4. Check correctness
        raw_ans = request.answer
        if isinstance(raw_ans, dict):
            user_answer = str(raw_ans.get("image_key") or raw_ans.get("id") or "").strip().lower()
        else:
            user_answer = str(raw_ans or "").strip().lower()

        expected_raw = (
            stored_question.get("correct_answer")
            or active_milestone.get("target_asset", "tile_red")
        )
        expected_answer = str(expected_raw or "").strip().lower()

        is_correct = (user_answer == expected_answer) or (
            active_milestone.get("target_color", "") in user_answer
        )

        p_l_prev = float(bkt_doc.get("p_l", DEFAULT_P_L0))
        consecutive_wrong = int(bkt_doc.get("consecutive_wrong", 0))
        history = list(bkt_doc.get("history", []))

        # 5. Classify FACP telemetry
        active_scaffold = getattr(request, "active_scaffold", "NONE") or "NONE"
        audio_replay_count = int(getattr(request, "audio_replay_count", 0) or 0)
        response_time_ms = int(getattr(request, "response_time_ms", 0) or 0)
        option_switch_count = int(getattr(request, "option_switch_count", 0) or 0)

        facp_code = classify_facp_code(
            correct=is_correct,
            active_scaffold=active_scaffold,
            audio_replay_count=audio_replay_count,
        )

        # 6. Attenuated BKT update
        hint_used = facp_code in ["C", "VP", "PP"]
        try:
            p_l_new = full_update(p_l_prev, is_correct, hint_used=hint_used)
        except TypeError:
            p_l_new = full_update(p_l_prev, is_correct)

        if is_correct:
            consecutive_wrong = 0
        else:
            consecutive_wrong += 1

        history.append({
            "timestamp": _now(),
            "subtopic": active_milestone["name"],
            "color": active_milestone["target_color"],
            "correct": is_correct,
            "latency_ms": response_time_ms,
            "switches": option_switch_count,
            "audio_replays": audio_replay_count,
            "facp_code": facp_code,
            "scaffold_used": active_scaffold,
            "p_l": round(float(p_l_new), 4),
            "question_id": str(getattr(request, "question_id", "")),
            "answer": user_answer,
        })

        # 7. NIMH FACP 80% promotion rule on this milestone
        current_color_trials = [t for t in history if t.get("subtopic") == active_milestone["name"]]
        qualifying_passes = sum(1 for t in current_color_trials if t.get("facp_code") in ["+", "C"])
        trials_count = len(current_color_trials)
        pass_ratio = qualifying_passes / trials_count if trials_count > 0 else 0

        promotion_eligible = (trials_count >= 3 and pass_ratio >= 0.80) or p_l_new >= 0.85

        node_promoted = False
        color_curriculum_passed = False

        if promotion_eligible:
            node_idx += 1
            node_promoted = True
            p_l_new = DEFAULT_P_L0  # Reset prior for next color
            consecutive_wrong = 0

            if node_idx >= len(FACP_COLOR_CURRICULUM):
                color_curriculum_passed = True
                node_idx = len(FACP_COLOR_CURRICULUM) - 1

        # 8. Update MongoDB
        bkt_states_col.update_one(
            {"student_id": student_id, "subtopic_id": active_milestone["id"]},
            {
                "$set": {
                    "subtopic_name": active_milestone["name"],
                    "p_l": float(p_l_new),
                    "consecutive_wrong": consecutive_wrong,
                    "current_node_index": node_idx,
                    "history": history,
                    "color_curriculum_passed": color_curriculum_passed,
                    "updated_at": _now(),
                },
            },
            upsert=True,
        )

        # Sync master node index across the student's records
        bkt_states_col.update_many(
            {"student_id": student_id},
            {"$set": {"current_node_index": node_idx, "updated_at": _now()}}
        )

        next_milestone = FACP_COLOR_CURRICULUM[node_idx]

        print("\n" + "═" * 70)
        print(f"🎓 FACP TRIAL RECORDED: Student [{student_id}]")
        print(f"   Active Color: {active_milestone['target_color'].upper()} | Code: [{facp_code}]")
        print(f"   Color Trials: {trials_count} | Qualifying Passes: {qualifying_passes}/{trials_count} ({pass_ratio * 100:.1f}%)")
        print(f"   BKT Mastery: {p_l_prev:.2f} ──► {p_l_new:.2f}")
        print(f"   Status: {'PROMOTED TO NEXT COLOR 🚀' if node_promoted else 'PRACTICING'}")
        if node_promoted:
            print(f"   Next Color: {next_milestone['target_color'].upper()}")
        print("═" * 70 + "\n")

        return {
            "success": True,
            "student_id": student_id,
            "question_id": str(getattr(request, "question_id", "")),
            "subtopic_id": active_milestone["id"],
            "correct": is_correct,
            "facp_code": facp_code,
            "previous_mastery": round(p_l_prev, 4),
            "new_mastery": round(float(p_l_new), 4),
            "node_promoted": node_promoted,
            "current_node_index": node_idx,
            "active_color": next_milestone["target_color"],
            "color_curriculum_passed": color_curriculum_passed,
            "status": "MASTERED" if node_promoted else ("CONTINUE" if is_correct else "NEEDS_REMEDIATION"),
            "next_step": (
                "🎉 Full Color Curriculum Mastered (Item 12 Passed)!"
                if color_curriculum_passed
                else f"Advancing to {next_milestone['name']}! 🚀"
                if node_promoted
                else "Continue practicing this concept."
            ),
        }

    except Exception as e:
        print("\n❌ EXCEPTION IN /api/submit:")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/student/{student_id}/facp-report")
def get_facp_report(student_id: str):
    bkt_doc = bkt_states_col.find_one(
        {"student_id": str(student_id)},
        sort=[("updated_at", -1)]
    )
    if not bkt_doc:
        raise HTTPException(status_code=404, detail="Student FACP records not found.")

    history = bkt_doc.get("history", [])
    current_node_idx = int(bkt_doc.get("current_node_index", 0))

    matrix = []
    for idx, node in enumerate(FACP_COLOR_CURRICULUM):
        node_trials = [t for t in history if t.get("subtopic") == node["name"]]
        if not node_trials:
            eval_code = "NE" if idx > current_node_idx else "-"
        else:
            eval_code = node_trials[-1].get("facp_code", "-")

        is_passed = eval_code in ["+", "C"] or idx < current_node_idx

        matrix.append({
            "s_no": node["facp_item_no"],
            "item_id": node["id"],
            "activity_description": f"Identifies {node['target_color'].title()} Color ({node.get('tamil_name', '')})",
            "entry_level": node_trials[0].get("facp_code", "-") if node_trials else "NE",
            "term_1": eval_code,
            "is_passed": is_passed,
            "total_attempts": len(node_trials),
        })

    total_items = len(matrix)
    passed_items = sum(1 for m in matrix if m["is_passed"])
    overall_percentage = round((passed_items / total_items) * 100, 1) if total_items > 0 else 0

    return {
        "institution": "National Institute for the Mentally Handicapped (NIMH), Secunderabad",
        "checklist": "Preprimary (3-6 years) — Academic Domain",
        "student_id": student_id,
        "student_name": student_id.replace("student_", "").title(),
        "academic_year": "First Year",
        "current_term": "Term I",
        "evaluation_matrix": matrix,
        "summary": {
            "total_activities": total_items,
            "activities_passed": passed_items,
            "percentage": overall_percentage,
            "promotion_eligible": overall_percentage >= 80.0,
            "next_level": "Primary-I" if overall_percentage >= 80.0 else "Retained in Preprimary",
        },
        "history_timeline": history[-15:],
    }

@app.post("/api/login")
def login_user(req: LoginRequest):
    ident = req.identifier.strip().lower()

    if req.role and req.role.lower() == "admin":
        if ident in ["admin", "admin@learnable.local"]:
            return {"status": "success", "user_id": "admin_01", "name": "Administrator", "role": "Admin"}
        raise HTTPException(status_code=403, detail="Invalid admin credentials.")

    student = student_profiles_col.find_one({
        "$or": [
            {"email": {"$regex": f"^{ident}$", "$options": "i"}},
            {"name": {"$regex": f"^{ident}$", "$options": "i"}},
            {"student_id": ident}
        ]
    })

    if not student and ident in ["arun", "arun kumar", "meena", "meena devi", "ananya", "student_demo", "student"]:
        return {
            "status": "success",
            "student_id": f"student_{ident.split()[0].lower()}",
            "student_name": ident.split()[0].title(),
            "role": "Student",
        }

    if not student:
        raise HTTPException(status_code=403, detail="Student not found.")
    if not student.get("enabled", True):
        raise HTTPException(status_code=403, detail="Access revoked by Admin.")

    return {
        "status": "success",
        "student_id": str(student.get("student_id", student["_id"])),
        "student_name": student["name"],
        "role": "Student",
    }

@app.get("/api/student/modules")
def get_student_modules():
    cursor = units_col.find({}).sort("created_at", -1)
    modules = []
    for u in cursor:
        modules.append({
            "unit_id": str(u.get("_id")),
            "topic": u.get("topic", "FACP Milestone Module"),
            "subtopics": u.get("subtopics", []),
            "status": u.get("status", "ready"),
        })
    return {"modules": modules}

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print("\n❌ 422 VALIDATION ERROR DETAILS:")
    for error in exc.errors():
        print(f"   • Location: {error.get('loc')} | Message: {error.get('msg')} | Type: {error.get('type')}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})