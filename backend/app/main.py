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

# ── Legacy Assistive Dual-Choice Generator ───────────────────────────────────
# Kept for the existing pedagogical workflow; D1 uses app.llm_generator.


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


# ── D1 JIT TEACH -> QUESTION FLOW ─────────────────────────────────────────────
#
# Architecture:
#   Student -> BKT/Cognitive Governor -> TEACH LLM -> "I Understand"
#           -> QUESTION LLM -> visual answer -> BKT update
#
# The frontend sends identifiers only.
# The backend owns adaptive state, difficulty, asset selection and session
# persistence. The question generator receives the exact teaching content
# stored by the backend; the React client never sends the lesson text back.

D1_IMAGE_ASSETS = {
    "ball_big_red": "a big red ball",
    "ball_small_green": "a small green ball",
}


def _resolve_d1_unit(unit_id: Optional[str] = None):
    """Resolve the requested unit, otherwise use the latest curriculum unit."""
    unit = None

    if unit_id and ObjectId.is_valid(str(unit_id)):
        unit = units_col.find_one({"_id": ObjectId(str(unit_id))})

    if not unit:
        unit = units_col.find_one(sort=[("created_at", -1)])

    if not unit:
        raise HTTPException(
            status_code=404,
            detail="No curriculum units found in database.",
        )

    return unit


def _learning_objective_from_subtopic(
    subtopic_name: str,
    unit: dict,
) -> str:
    """
    Convert the curriculum node into a concise objective for the LLM.

    Keep this deterministic: the LLM does not decide what the learner should
    study. For common pre-primary nodes, use explicit objectives; otherwise
    preserve the teacher-defined subtopic name.
    """
    normalized = " ".join(
        str(subtopic_name).strip().lower().split()
    )

    if (
        ("big" in normalized and "small" in normalized)
        or "size comparison" in normalized
    ):
        return "Identify big and small objects"

    if "color" in normalized or "colour" in normalized:
        return "Identify colors"

    if "number" in normalized:
        return "Identify numbers 1 to 5"

    return str(subtopic_name).strip()


def _get_d1_adaptive_context(
    student_id: str,
    unit_id: Optional[str] = None,
    subtopic_id: Optional[str] = None,
):
    """
    Resolve:
      unit -> subtopic -> BKT -> Cognitive Governor -> difficulty/assets.

    This is the single source of truth for D1 adaptive decisions.
    """
    unit = _resolve_d1_unit(unit_id)
    unit_id_str = str(unit["_id"])

    subtopic_docs = list(
        subtopics_col.find(
            {"unit_id": unit_id_str}
        ).sort("order", 1)
    )

    if subtopic_docs:
        subtopics = [
            str(s.get("name", "")).strip()
            for s in subtopic_docs
            if str(s.get("name", "")).strip()
        ]
    else:
        subtopics = [
            str(x).strip()
            for x in unit.get("subtopics", [])
            if str(x).strip()
        ]

    if not subtopics:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unit '{unit.get('topic', unit_id_str)}' "
                "has no subtopics configured."
            ),
        )

    # Prefer the explicitly requested subtopic when valid.
    active_subtopic = None
    active_subtopic_id = None
    node_idx = 0

    if subtopic_id:
        for index, doc in enumerate(subtopic_docs):
            if str(doc.get("_id")) == str(subtopic_id):
                active_subtopic = str(
                    doc.get("name", "")
                ).strip()
                active_subtopic_id = str(doc["_id"])
                node_idx = index
                break

    # Otherwise use the learner's current BKT node.
    bkt_doc = bkt_states_col.find_one(
        {
            "student_id": str(student_id),
            "unit_id": unit_id_str,
        },
        sort=[("updated_at", -1)],
    )

    if active_subtopic is None:
        node_idx = (
            int(bkt_doc.get("current_node_index", 0))
            if bkt_doc
            else 0
        )
        node_idx = max(
            0,
            min(node_idx, len(subtopics) - 1),
        )

        active_subtopic = subtopics[node_idx]

        if (
            subtopic_docs
            and node_idx < len(subtopic_docs)
        ):
            active_subtopic_id = str(
                subtopic_docs[node_idx]["_id"]
            )
        else:
            active_subtopic_id = f"node_{node_idx}"

    p_l = (
        float(
            bkt_doc.get(
                "p_l",
                DEFAULT_P_L0,
            )
        )
        if bkt_doc
        else DEFAULT_P_L0
    )

    consecutive_wrong = (
        int(
            bkt_doc.get(
                "consecutive_wrong",
                0,
            )
        )
        if bkt_doc
        else 0
    )

    history = (
        bkt_doc.get("history", [])
        if bkt_doc
        else []
    )

    total_attempts = len(history)

    cognitive_state = CognitiveGovernor.diagnose_state(
        p_l=p_l,
        # Teaching begins before a new answer exists. Treat the initial
        # observation as neutral so the Governor uses mastery/history rather
        # than inventing a new success/failure signal.
        is_correct=True,
        consecutive_wrong=consecutive_wrong,
        response_time_ms=0,
        option_switch_count=0,
        total_attempts=total_attempts,
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

    learning_objective = _learning_objective_from_subtopic(
        active_subtopic,
        unit,
    )

    # D1 currently uses picture_choice only.
    activity_type = "picture_choice"
    allowed_image_keys = list(D1_IMAGE_ASSETS.keys())

    return {
        "unit": unit,
        "unit_id": unit_id_str,
        "unit_topic": unit.get("topic", ""),
        "reference_text": unit.get("reference_text", "") or "",
        "subtopic_id": active_subtopic_id,
        "subtopic_name": active_subtopic,
        "node_index": node_idx,
        "p_l": round(p_l, 4),
        "consecutive_wrong": consecutive_wrong,
        "total_attempts": total_attempts,
        "cognitive_state": cognitive_state,
        "governor_action": decision.action,
        "_decision": decision,
        "difficulty": difficulty,
        "learning_objective": learning_objective,
        "activity_type": activity_type,
        "allowed_image_keys": allowed_image_keys,
    }


def _find_active_jit_state(
    student_id: str,
    unit_id: Optional[str] = None,
    subtopic_id: Optional[str] = None,
):
    """Find the latest stored active teach/question session."""
    query: Dict[str, Any] = {
        "student_id": str(student_id),
        "active_jit_session": {"$exists": True},
    }

    if subtopic_id:
        query["subtopic_id"] = str(subtopic_id)
    elif unit_id:
        query["unit_id"] = str(unit_id)

    return bkt_states_col.find_one(
        query,
        sort=[("updated_at", -1)],
    )


def _save_active_jit_state(
    student_id: str,
    context: dict,
    teaching: dict,
):
    """Persist the exact lesson that was shown to the learner."""
    session_doc = {
        "unit_id": context["unit_id"],
        "unit_topic": context["unit_topic"],
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
            "subtopic_id": context["subtopic_id"],
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
                "current_node_index": context["node_index"],
                "history": [],
            },
        },
        upsert=True,
    )


@app.post(
    "/api/student/jit-teaching",
    response_model=JITTeachingResponse,
)
def generate_jit_teaching_endpoint(
    request: JITTeachingRequest,
):
    """
    D1 Stage 1:
        Student enters a concept
          -> BKT + Cognitive Governor determine the adaptive decision
          -> LLM teaches the selected objective
          -> teaching is stored server-side
    """
    try:
        print("\n" + "=" * 78)
        print("📘 D1 JIT TEACHING STAGE")
        print("=" * 78)
        print("Student:", request.student_id)
        print("Requested unit:", request.unit_id)
        print("Requested subtopic:", request.subtopic_id)

        context = _get_d1_adaptive_context(
            student_id=request.student_id,
            unit_id=request.unit_id,
            subtopic_id=request.subtopic_id,
        )

        print("\nAdaptive teaching decision:")
        print("  • Unit:", context["unit_id"])
        print("  • Subtopic:", context["subtopic_name"])
        print("  • Subtopic ID:", context["subtopic_id"])
        print("  • Learning objective:", context["learning_objective"])
        print("  • P(L):", context["p_l"])
        print("  • Cognitive state:", context["cognitive_state"])
        print("  • Governor action:", context["governor_action"])
        print("  • Difficulty:", context["difficulty"])
        print("  • Assets:", context["allowed_image_keys"])

        teaching = generate_jit_teaching_content(
            learning_objective=context["learning_objective"],
            allowed_image_keys=context["allowed_image_keys"],
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

        print("✅ Teaching stage stored successfully.")
        print("=" * 78)

        return {
            "success": True,
            "phase": "teach",
            "teaching": {
                "phase": "teach",
                "spoken_teaching": teaching["spoken_teaching"],
                "visuals": teaching["visuals"],
            },
            "adaptive": {
                "subtopic_id": context["subtopic_id"],
                "subtopic_name": context["subtopic_name"],
                "learning_objective": context["learning_objective"],
                "difficulty": context["difficulty"],
                "zone": (
                    "mastered"
                    if context["p_l"] >= 0.85
                    else "challenge"
                    if context["p_l"] >= 0.70
                    else "standard"
                    if context["p_l"] >= 0.40
                    else "scaffold"
                ),
                "reason": str(
                    getattr(
                        context.get("_decision"),
                        "intervention_goal",
                        "adaptive teaching decision",
                    )
                )
                if context.get("_decision")
                else "adaptive teaching decision",
                "p_l": context["p_l"],
            },
            "model": "openai/gpt-oss-120b",
            "generation_attempts": teaching.get(
                "generation_attempts",
                1,
            ),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(
            "❌ D1 teaching endpoint failed:",
            repr(e),
        )
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@app.post(
    "/api/student/jit-question",
    response_model=JITQuestionResponse,
)
def generate_jit_question_endpoint(
    request: JITQuestionRequest,
):
    """
    D1 Stage 2:
        Student clicks "I Understand"
          -> backend retrieves exact stored teaching
          -> the same adaptive decision is preserved
          -> LLM generates a question from that teaching
          -> question is stored and returned
    """
    try:
        active_record = _find_active_jit_state(
            student_id=request.student_id,
            unit_id=request.unit_id,
            subtopic_id=request.subtopic_id,
        )

        if active_record is None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "No active teaching session was found. "
                    "Generate teaching first."
                ),
            )

        active_session = active_record.get(
            "active_jit_session"
        )

        if not active_session:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Active JIT session is missing teaching content."
                ),
            )

        teaching = active_session.get("teaching")

        if not teaching:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Teaching content is unavailable. "
                    "Generate the teaching stage first."
                ),
            )

        print("\n" + "=" * 78)
        print("❓ D1 JIT QUESTION STAGE")
        print("=" * 78)
        print("Student:", request.student_id)
        print(
            "Learning objective:",
            active_session.get("learning_objective"),
        )
        print(
            "Difficulty:",
            active_session.get("difficulty"),
        )

        question = generate_jit_question_from_teaching(
            learning_objective=active_session[
                "learning_objective"
            ],
            allowed_image_keys=active_session[
                "allowed_image_keys"
            ],
            taught_content=teaching,
            difficulty=active_session[
                "difficulty"
            ],
            activity_type=active_session[
                "activity_type"
            ],
            image_asset_descriptions=D1_IMAGE_ASSETS,
        )

        choices = question.get("choices", [])

        correct_choices = [
            c for c in choices
            if c.get("is_correct") is True
        ]

        if len(correct_choices) != 1:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Generated question does not contain exactly "
                    "one correct answer."
                ),
            )

        question_id = (
            f"jit_{request.student_id}_"
            f"{active_session['subtopic_id']}_"
            f"{uuid.uuid4().hex[:12]}"
        )

        correct_answer = correct_choices[0]["image_key"]

        stored_question = {
            "question_id": question_id,
            "activity_type": question.get(
                "activity_type",
                "picture_choice",
            ),
            "spoken_prompt": question["spoken_prompt"],
            "choices": choices,
            "correct_answer": correct_answer,
            "created_at": _now(),
        }

        bkt_states_col.update_one(
            {
                "_id": active_record["_id"],
            },
            {
                "$set": {
                    "active_jit_session.question": stored_question,
                    "active_jit_session.question_id": question_id,
                    "active_jit_session.updated_at": _now(),
                    "updated_at": _now(),
                },
            },
        )

        print("✅ Question generated and stored successfully.")
        print("  • Question ID:", question_id)
        print("=" * 78)

        return {
            "success": True,
            "phase": "question",
            "question_id": question_id,
            "activity": {
                "activity_type": question["activity_type"],
                "spoken_prompt": question["spoken_prompt"],
                "choices": question["choices"],
            },
            "adaptive": {
                "subtopic_id": active_session["subtopic_id"],
                "subtopic_name": active_session.get(
                    "subtopic_name",
                    "",
                ),
                "learning_objective": active_session[
                    "learning_objective"
                ],
                "difficulty": active_session["difficulty"],
                "p_l": float(
                    active_session.get(
                        "p_l_at_teaching",
                        DEFAULT_P_L0,
                    )
                ),
            },
            "model": "openai/gpt-oss-120b",
            "generation_attempts": question.get(
                "generation_attempts",
                1,
            ),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(
            "❌ D1 question endpoint failed:",
            repr(e),
        )
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@app.get("/api/student/jit-session/{student_id}")
def get_jit_session(student_id: str):
    """Return the current server-side JIT teach/question session."""
    record = _find_active_jit_state(
        student_id=student_id
    )

    if record is None:
        return {
            "success": True,
            "active": False,
            "session": None,
        }

    session = record.get("active_jit_session")

    return {
        "success": True,
        "active": bool(session),
        "session": session,
    }


# ── D1 JIT Visual Activity Endpoint ─────────────────────────────────────────

def _derive_d1_difficulty(
    p_l: float,
    cognitive_state: str,
    action: str,
) -> str:
    """
    Deterministic difficulty policy owned by the adaptive engine.

    The LLM does NOT choose the learner's difficulty.
    It only synthesizes an activity that satisfies this decision.
    """
    if cognitive_state in {"STRUGGLING", "OSCILLATING"}:
        return "easy"

    if action == "ELIMINATE_DISTRACTOR":
        return "easy"

    if cognitive_state == "MASTERED":
        return "hard"

    if p_l >= 0.70:
        return "hard"

    if p_l >= 0.40:
        return "medium"

    return "easy"


@app.post(
    "/api/student/jit-visual-activity",
    response_model=JITActivityResponse,
)
def generate_jit_visual_activity_endpoint(
    request: JITActivityRequest,
):
    """
    Generate one D1 visual activity from the learner's current
    adaptive state.

    Frontend sends only learner/context identifiers.
    The backend determines:
        - active subtopic / learning objective
        - cognitive state
        - adaptive action
        - difficulty
        - allowed visual assets

    GPT-OSS-120B then synthesizes the actual visual activity.
    """

    try:
        print("\n" + "=" * 78)
        print("D1 ADAPTIVE JIT VISUAL ACTIVITY")
        print("=" * 78)
        print("Student:", request.student_id)
        print("Requested unit:", request.unit_id)
        print("Requested subtopic:", request.subtopic_id)

        # --------------------------------------------------------
        # 1. Resolve the active curriculum unit
        # --------------------------------------------------------

        unit = None

        if request.unit_id and ObjectId.is_valid(
            request.unit_id
        ):
            unit = units_col.find_one(
                {"_id": ObjectId(request.unit_id)}
            )

        if not unit:
            unit = units_col.find_one(
                sort=[("created_at", -1)]
            )

        if not unit:
            raise HTTPException(
                status_code=404,
                detail="No curriculum units found in database.",
            )

        unit_id_str = str(unit["_id"])

        # --------------------------------------------------------
        # 2. Resolve subtopics
        # --------------------------------------------------------

        subtopic_docs = list(
            subtopics_col.find(
                {"unit_id": unit_id_str}
            ).sort("order", 1)
        )

        if subtopic_docs:
            subtopics = [
                s.get("name", "").strip()
                for s in subtopic_docs
                if s.get("name")
            ]
        else:
            subtopics = [
                str(x).strip()
                for x in unit.get("subtopics", [])
                if str(x).strip()
            ]

        if not subtopics:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unit '{unit.get('topic', unit_id_str)}' "
                    "has no subtopics configured."
                ),
            )

        # --------------------------------------------------------
        # 3. Load learner's current BKT/adaptive state
        # --------------------------------------------------------

        bkt_doc = bkt_states_col.find_one(
            {
                "student_id": str(request.student_id),
                "unit_id": unit_id_str,
            },
            sort=[("updated_at", -1)],
        )

        node_idx = (
            bkt_doc.get("current_node_index", 0)
            if bkt_doc
            else 0
        )

        node_idx = max(
            0,
            min(node_idx, len(subtopics) - 1),
        )

        p_l = (
            float(
                bkt_doc.get(
                    "p_l",
                    DEFAULT_P_L0,
                )
            )
            if bkt_doc
            else DEFAULT_P_L0
        )

        consecutive_wrong = (
            int(
                bkt_doc.get(
                    "consecutive_wrong",
                    0,
                )
            )
            if bkt_doc
            else 0
        )

        history = (
            bkt_doc.get("history", [])
            if bkt_doc
            else []
        )

        total_attempts = len(history)

        # --------------------------------------------------------
        # 4. Resolve the active subtopic
        # --------------------------------------------------------

        active_subtopic = None
        active_subtopic_id = None

        if request.subtopic_id:
            for doc in subtopic_docs:
                if str(doc.get("_id")) == str(
                    request.subtopic_id
                ):
                    active_subtopic = doc.get(
                        "name",
                        "",
                    ).strip()
                    active_subtopic_id = str(
                        doc["_id"]
                    )
                    break

        if not active_subtopic:
            active_subtopic = subtopics[node_idx]

            if (
                subtopic_docs
                and node_idx < len(subtopic_docs)
            ):
                active_subtopic_id = str(
                    subtopic_docs[node_idx]["_id"]
                )
            else:
                active_subtopic_id = (
                    f"node_{node_idx}"
                )

        # --------------------------------------------------------
        # 5. Diagnose current learner state
        # --------------------------------------------------------

        cognitive_state = (
            CognitiveGovernor.diagnose_state(
                p_l=p_l,
                is_correct=True,
                consecutive_wrong=consecutive_wrong,
                response_time_ms=0,
                option_switch_count=0,
                total_attempts=total_attempts,
            )
        )

        # --------------------------------------------------------
        # 6. Let the Cognitive Governor choose the action
        # --------------------------------------------------------

        decision = (
            CognitiveGovernor.decide_action(
                concept=active_subtopic,
                state=cognitive_state,
                p_l=p_l,
            )
        )

        # --------------------------------------------------------
        # 7. Determine difficulty outside the LLM
        # --------------------------------------------------------

        difficulty = _derive_d1_difficulty(
            p_l=p_l,
            cognitive_state=cognitive_state,
            action=decision.action,
        )

        # The existing subtopic is the learning objective.
        learning_objective = active_subtopic

        # D1 currently exposes picture_choice only.
        activity_type = "picture_choice"

        # Only give the LLM assets that really exist in the frontend.
        allowed_image_keys = list(
            D1_IMAGE_ASSETS.keys()
        )

        print("\nAdaptive decision for D1:")
        print("  • Unit:", unit_id_str)
        print("  • Subtopic:", active_subtopic)
        print("  • Subtopic ID:", active_subtopic_id)
        print("  • P(L):", round(p_l, 4))
        print("  • Cognitive State:", cognitive_state)
        print("  • Governor Action:", decision.action)
        print("  • Learning Objective:", learning_objective)
        print("  • Difficulty:", difficulty)
        print("  • Activity Type:", activity_type)
        print("  • Allowed Assets:", allowed_image_keys)

        # --------------------------------------------------------
        # 8. GPT-OSS-120B synthesizes the actual activity
        # --------------------------------------------------------

        activity = generate_d1_visual_activity(
            learning_objective=learning_objective,
            allowed_image_keys=allowed_image_keys,
            difficulty=difficulty,
            activity_type=activity_type,
            image_asset_descriptions=D1_IMAGE_ASSETS,
        )

        print("\nD1 LLM activity returned successfully.")
        print("  • Prompt:", activity.get("spoken_prompt"))
        print(
            "  • Choices:",
            len(activity.get("choices", [])),
        )
        print(
            "  • Attempts:",
            activity.get(
                "generation_attempts",
                1,
            ),
        )
        print("  • Model: openai/gpt-oss-120b")
        print("=" * 78)

        return {
            "success": True,
            "activity": activity,
            "model": "openai/gpt-oss-120b",
            "generation_attempts": activity.get(
                "generation_attempts",
                1,
            ),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(
            "❌ D1 adaptive JIT generation failed:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


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


# ── D1 JIT Visual Answer Submission ──────────────────────────────────────────

class JITSubmitAnswerRequest(BaseModel):
    student_id: str
    question_id: str
    answer: str
    unit_id: Optional[str] = None
    subtopic_id: Optional[str] = None
    response_time_ms: int = 0
    option_switch_count: int = 0
    audio_replay_count: int = 0
    active_scaffold: Optional[str] = "NONE"


@app.post("/api/submit")
def submit_jit_answer(request: JITSubmitAnswerRequest):
    """
    Grade the stored D1 question and update the existing BKT state.

    The correct answer is NEVER trusted from the React client; it comes from
    the question stored by /api/student/jit-question.
    """
    try:
        active_record = _find_active_jit_state(
            student_id=request.student_id,
            unit_id=request.unit_id,
            subtopic_id=request.subtopic_id,
        )

        if active_record is None:
            raise HTTPException(
                status_code=409,
                detail="No active JIT session found.",
            )

        session = active_record.get("active_jit_session") or {}
        stored_question = session.get("question")

        if not stored_question:
            raise HTTPException(
                status_code=409,
                detail=(
                    "No active JIT question found. "
                    "Generate the question after teaching."
                ),
            )

        stored_question_id = str(
            stored_question.get("question_id", "")
        )

        if stored_question_id != str(request.question_id):
            raise HTTPException(
                status_code=409,
                detail="Question ID does not match the active JIT question.",
            )

        correct_answer = str(
            stored_question.get("correct_answer", "")
        )

        is_correct = (
            str(request.answer) == correct_answer
        )

        student_id = str(request.student_id)
        subtopic_id = str(
            session.get(
                "subtopic_id",
                request.subtopic_id or "node_0",
            )
        )
        unit_id = str(
            session.get(
                "unit_id",
                request.unit_id or "",
            )
        )

        # Fetch the BKT state specifically for this concept.
        bkt = bkt_states_col.find_one(
            {
                "student_id": student_id,
                "unit_id": unit_id,
                "subtopic_id": subtopic_id,
            },
            sort=[("updated_at", -1)],
        )

        p_l_prev = (
            float(
                bkt.get(
                    "p_l",
                    DEFAULT_P_L0,
                )
            )
            if bkt
            else DEFAULT_P_L0
        )

        consecutive_wrong = (
            int(
                bkt.get(
                    "consecutive_wrong",
                    0,
                )
            )
            if bkt
            else 0
        )

        history = (
            list(bkt.get("history", []))
            if bkt
            else []
        )

        # D1 visual choice starts with no scaffold. Therefore hint_used=False.
        p_l_new = full_update(
            p_l_prev,
            is_correct,
            hint_used=False,
        )

        if is_correct:
            consecutive_wrong = 0
        else:
            consecutive_wrong += 1

        history.append(
            {
                "timestamp": _now(),
                "subtopic": session.get(
                    "subtopic_name",
                    "",
                ),
                "correct": is_correct,
                "latency_ms": request.response_time_ms,
                "switches": request.option_switch_count,
                "audio_replays": request.audio_replay_count,
                "facp_code": classify_facp_code(
                    correct=is_correct,
                    active_scaffold=(
                        request.active_scaffold or "NONE"
                    ),
                    audio_replay_count=(
                        request.audio_replay_count or 0
                    ),
                ),
                "p_l": p_l_new,
                "source": "D1_JIT_LLM",
                "question_id": request.question_id,
                "answer": request.answer,
            }
        )

        facp_stats = calculate_facp_mastery(history)

        cognitive_state = CognitiveGovernor.diagnose_state(
            p_l=p_l_new,
            is_correct=is_correct,
            consecutive_wrong=consecutive_wrong,
            response_time_ms=request.response_time_ms,
            option_switch_count=request.option_switch_count,
        )

        decision = CognitiveGovernor.decide_action(
            concept=session.get(
                "subtopic_name",
                "",
            ),
            state=cognitive_state,
            p_l=p_l_new,
        )

        node_idx = (
            int(
                bkt.get(
                    "current_node_index",
                    0,
                )
            )
            if bkt
            else 0
        )

        # Keep D1 answer submission aligned with the existing promotion logic.
        # It promotes when the normal FACP criterion is met or the Governor
        # reaches MASTERED.
        node_promoted = False

        if (
            facp_stats.get("promotion_eligible")
            or cognitive_state == "MASTERED"
        ):
            cognitive_state = "MASTERED"
            pedagogical_action = "ADVANCE_CONCEPT_NODE"
            node_idx += 1
            node_promoted = True
            p_l_new = DEFAULT_P_L0
        else:
            pedagogical_action = decision.action

        bkt_states_col.update_one(
            {
                "_id": active_record["_id"],
            },
            {
                "$set": {
                    "unit_id": unit_id,
                    "subtopic_id": subtopic_id,
                    "subtopic_name": session.get(
                        "subtopic_name",
                        "",
                    ),
                    "p_l": p_l_new,
                    "state": cognitive_state,
                    "consecutive_wrong": consecutive_wrong,
                    "current_node_index": node_idx,
                    "history": history,
                    "last_d1_question_id": request.question_id,
                    "last_d1_correct": is_correct,
                    "updated_at": _now(),
                },
                "$set": {
                    "active_jit_session.attempt_count": int(
                        (session.get("attempt_count", 0) or 0) + 1
                    ),
                    "active_jit_session.last_answer": str(request.answer),
                    "active_jit_session.last_answer_correct": is_correct,
                    "active_jit_session.updated_at": _now(),
                },
            },
        )

        status = (
            "MASTERED"
            if node_promoted
            else "CONTINUE"
            if is_correct
            else "NEEDS_REMEDIATION"
        )

        # Keep the same generated question available for retrying after
        # incorrect answers. Once the learner answers correctly, the
        # question is consumed and the session can move forward.
        if is_correct:
            bkt_states_col.update_one(
                {"_id": active_record["_id"]},
                {
                    "$unset": {
                        "active_jit_session.question": "",
                        "active_jit_session.question_id": "",
                    },
                    "$set": {
                        "active_jit_session.completed": True,
                        "active_jit_session.updated_at": _now(),
                    },
                },
            )

        return {
            "success": True,
            "student_id": student_id,
            "question_id": request.question_id,
            "subtopic_id": subtopic_id,
            "correct": is_correct,
            "previous_mastery": round(p_l_prev, 4),
            "new_mastery": round(p_l_new, 4),
            "status": status,
            "next_step": (
                "Advance to the next concept."
                if node_promoted
                else "Continue practicing this concept."
                if is_correct
                else "Try another visual."
            ),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(
            "❌ D1 JIT answer submission failed:",
            repr(e),
        )
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )



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





