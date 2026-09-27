
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import uuid4
from datetime import datetime

from app.schemas import (
    JITTeachingRequest,
    JITQuestionRequest,
)

from app.database import (
    client,
    content_versions_collection,
    questions_collection,
    mastery_state_collection,
    attempts_collection,
)

from app.bkt import (
    update_mastery,
    P_L0,
)

from app.llm_generator import (
    generate_jit_teaching_content,
    generate_jit_question_from_teaching,
    GROQ_MODEL,
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Adaptive Learning Platform - Person 2",
    description=(
        "BKT + MongoDB Answer Grading + "
        "Adaptive Teach -> Question JIT Learning API"
    ),
    version="3.0.0",
)


# ============================================================
# REQUEST MODELS
# ============================================================

class AnswerRequest(BaseModel):
    """
    Answer submission model used by the Person 2 grading API.

    For a D1 visual question, `answer` is the selected image_key,
    for example: "ball_big_red".
    """

    student_id: str = Field(..., min_length=1)
    question_id: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)

    # Optional telemetry fields.
    response_time_ms: int = Field(default=0, ge=0)
    option_switch_count: int = Field(default=0, ge=0)
    audio_replay_count: int = Field(default=0, ge=0)
    active_scaffold: str = "NONE"


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Person 2 Adaptive Learning API is running",
        "flow": "teach -> i_understand -> question -> answer -> BKT update",
        "model": GROQ_MODEL,
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():
    try:
        client.admin.command("ping")

        return {
            "status": "healthy",
            "mongodb": "connected",
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "mongodb": "disconnected",
            "error": str(e),
        }


# ============================================================
# ADAPTIVE HELPERS
# ============================================================

def _get_mastery_record(
    student_id: str,
    subtopic_id: str,
) -> Optional[dict]:
    """
    Read the student's BKT record for one subtopic.
    """

    return mastery_state_collection.find_one(
        {
            "student_id": student_id,
            "subtopic_id": subtopic_id,
        }
    )


def _ensure_mastery_record(
    student_id: str,
    subtopic_id: str,
) -> float:
    """
    Create a BKT record if one does not exist.

    Returns current mastery probability.
    """

    mastery = _get_mastery_record(
        student_id,
        subtopic_id,
    )

    if mastery is None:
        mastery_state_collection.insert_one(
            {
                "student_id": student_id,
                "subtopic_id": subtopic_id,
                "mastery_probability": P_L0,
                "created_at": datetime.utcnow(),
            }
        )

        return P_L0

    return mastery.get(
        "mastery_probability",
        P_L0,
    )


def _resolve_content(
    unit_id: Optional[str],
    subtopic_id: Optional[str],
) -> Optional[dict]:
    """
    Resolve curriculum content used by the adaptive teaching stage.

    Priority:
    1. exact subtopic
    2. unit
    """

    if subtopic_id:
        content = content_versions_collection.find_one(
            {
                "subtopic_id": subtopic_id,
            },
            sort=[("_id", -1)],
        )

        if content is not None:
            return content

    if unit_id:
        content = content_versions_collection.find_one(
            {
                "unit_id": unit_id,
            },
            sort=[("_id", -1)],
        )

        if content is not None:
            return content

    return None


def _derive_adaptive_decision(
    student_id: str,
    unit_id: Optional[str],
    subtopic_id: Optional[str],
) -> Dict[str, Any]:
    """
    Lightweight adaptive controller for this Person 2 API.

    The backend decides the learning objective, difficulty and visual
    asset set BEFORE calling the LLM.

    BKT mastery is used as the adaptive signal:
        < 0.40   -> easy / remediation
        0.40-<.85 -> medium / reinforcement
        >= 0.85  -> hard / challenge

    The LLM only synthesizes teaching/question content from this decision.
    """

    content = _resolve_content(
        unit_id=unit_id,
        subtopic_id=subtopic_id,
    )

    if content is None:
        if not subtopic_id:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Unable to resolve a curriculum subtopic. "
                    "Provide subtopic_id or a valid unit_id."
                ),
            )

        resolved_subtopic_id = subtopic_id
        subtopic_name = subtopic_id
        topic = "Adaptive Learning"
        reference_text = ""
        content_version_id = None

    else:
        resolved_subtopic_id = (
            subtopic_id
            or content.get("subtopic_id")
        )

        if not resolved_subtopic_id:
            raise HTTPException(
                status_code=422,
                detail="Resolved content does not contain subtopic_id.",
            )

        subtopic_name = (
            content.get("subtopic_name")
            or content.get("title")
            or content.get("name")
            or resolved_subtopic_id
        )

        topic = (
            content.get("topic")
            or content.get("unit_name")
            or "Adaptive Learning"
        )

        reference_text = (
            content.get("reference_text")
            or content.get("text")
            or content.get("content")
            or ""
        )

        content_version_id = content.get(
            "content_version_id"
        )

    p_l = _ensure_mastery_record(
        student_id=student_id,
        subtopic_id=resolved_subtopic_id,
    )

    # --------------------------------------------------------
    # Adaptive difficulty
    # --------------------------------------------------------

    if p_l < 0.40:
        difficulty = "easy"
        adaptive_zone = "scaffold"
        reason = "LOW_MASTERY"

    elif p_l < 0.85:
        difficulty = "medium"
        adaptive_zone = "standard"
        reason = "LEARNING"

    else:
        difficulty = "hard"
        adaptive_zone = "challenge"
        reason = "READY_FOR_CHALLENGE"

    # --------------------------------------------------------
    # Learning objective
    #
    # Prefer an explicit objective from stored curriculum.
    # --------------------------------------------------------

    learning_objective = (
        content.get("learning_objective")
        if content
        else None
    )

    if not learning_objective:
        learning_objective = (
            content.get("objective")
            if content
            else None
        )

    if not learning_objective:
        learning_objective = (
            f"Understand the main idea of {subtopic_name}"
        )

    # --------------------------------------------------------
    # Controlled D1 asset selection
    #
    # The LLM can only choose from these assets.
    # Update this list with the assets that exist in the frontend.
    # --------------------------------------------------------

    allowed_image_keys = [
        "ball_big_red",
        "ball_small_green",
        "ball_big_blue",
        "ball_small_blue",
        "apple_red",
        "apple_green",
        "dog",
        "cat",
        "bird",
        "toothbrush",
        "toothpaste",
        "soap",
        "comb",
    ]

    image_asset_descriptions = {
        "ball_big_red": "a big red ball",
        "ball_small_green": "a small green ball",
        "ball_big_blue": "a big blue ball",
        "ball_small_blue": "a small blue ball",
        "apple_red": "a red apple",
        "apple_green": "a green apple",
        "dog": "a dog",
        "cat": "a cat",
        "bird": "a bird",
        "toothbrush": "a toothbrush",
        "toothpaste": "toothpaste",
        "soap": "a bar of soap",
        "comb": "a comb",
    }

    # For a size objective, reduce the asset set to size-comparable
    # visual pairs. This keeps the LLM grounded.
    objective_lower = learning_objective.lower()

    if (
        "big" in objective_lower
        or "small" in objective_lower
        or "size" in objective_lower
        or "large" in objective_lower
    ):
        allowed_image_keys = [
            "ball_big_red",
            "ball_small_green",
            "ball_big_blue",
            "ball_small_blue",
        ]

    elif (
        "color" in objective_lower
        or "colour" in objective_lower
    ):
        allowed_image_keys = [
            "ball_big_red",
            "ball_big_blue",
            "ball_big_green",
            "apple_red",
            "apple_green",
        ]

    elif "animal" in objective_lower:
        allowed_image_keys = [
            "dog",
            "cat",
            "bird",
        ]

    elif (
        "tooth" in objective_lower
        or "brush" in objective_lower
        or "hygiene" in objective_lower
    ):
        allowed_image_keys = [
            "toothbrush",
            "toothpaste",
            "soap",
            "comb",
        ]

    return {
        "student_id": student_id,
        "unit_id": unit_id,
        "subtopic_id": resolved_subtopic_id,
        "subtopic_name": subtopic_name,
        "topic": topic,
        "content_version_id": content_version_id,
        "reference_context": str(reference_text),
        "learning_objective": learning_objective,
        "difficulty": difficulty,
        "activity_type": "picture_choice",
        "allowed_image_keys": allowed_image_keys,
        "image_asset_descriptions": image_asset_descriptions,
        "p_l": p_l,
        "adaptive_zone": adaptive_zone,
        "reason": reason,
    }


def _save_active_jit_state(
    student_id: str,
    context: dict,
    teaching: dict,
) -> None:
    """
    Store the currently active lesson on the student's mastery document.

    This avoids sending the generated teaching text back from React.
    """

    mastery_state_collection.update_one(
        {
            "student_id": student_id,
            "subtopic_id": context["subtopic_id"],
        },
        {
            "$set": {
                "unit_id": context["unit_id"],
                "active_jit_session": {
                    "phase": "teach",
                    "learning_objective": context[
                        "learning_objective"
                    ],
                    "difficulty": context["difficulty"],
                    "activity_type": context["activity_type"],
                    "allowed_image_keys": context[
                        "allowed_image_keys"
                    ],
                    "teaching": teaching,
                    "created_at": datetime.utcnow(),
                },
            }
        },
        upsert=True,
    )


def _get_active_jit_state(
    student_id: str,
    subtopic_id: Optional[str] = None,
) -> Optional[dict]:
    """
    Retrieve the stored teaching stage.

    If subtopic_id is supplied, use that exact node.
    Otherwise find any active JIT session for the student.
    """

    if subtopic_id:
        record = mastery_state_collection.find_one(
            {
                "student_id": student_id,
                "subtopic_id": subtopic_id,
                "active_jit_session": {
                    "$exists": True
                },
            }
        )

    else:
        record = mastery_state_collection.find_one(
            {
                "student_id": student_id,
                "active_jit_session": {
                    "$exists": True
                },
            }
        )

    return record


# ============================================================
# JIT TEACHING STAGE
# ============================================================

@app.post("/api/student/jit-teaching")
def generate_jit_teaching(
    request: JITTeachingRequest,
):
    """
    Stage 1:

        Student
          -> backend
          -> BKT/adaptive decision
          -> LLM teaching
          -> store lesson
          -> return teaching

    The frontend sends only identifiers.
    """

    try:
        context = _derive_adaptive_decision(
            student_id=request.student_id,
            unit_id=request.unit_id,
            subtopic_id=request.subtopic_id,
        )

        teaching = generate_jit_teaching_content(
            learning_objective=context["learning_objective"],
            allowed_image_keys=context["allowed_image_keys"],
            difficulty=context["difficulty"],
            activity_type=context["activity_type"],
            image_asset_descriptions=context[
                "image_asset_descriptions"
            ],
            reference_context=context[
                "reference_context"
            ],
        )

        _save_active_jit_state(
            student_id=request.student_id,
            context=context,
            teaching=teaching,
        )

        return {
            "success": True,
            "phase": "teach",
            "teaching": teaching,
            "adaptive": {
                "subtopic_id": context["subtopic_id"],
                "subtopic_name": context["subtopic_name"],
                "learning_objective": context[
                    "learning_objective"
                ],
                "difficulty": context["difficulty"],
                "zone": context["adaptive_zone"],
                "reason": context["reason"],
                "p_l": context["p_l"],
            },
            "model": GROQ_MODEL,
            "generation_attempts": teaching.get(
                "generation_attempts",
                1,
            ),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(
            f"[JIT TEACHING ERROR] {type(e).__name__}: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


# ============================================================
# JIT QUESTION STAGE
# ============================================================

@app.post("/api/student/jit-question")
def generate_jit_question(
    request: JITQuestionRequest,
):
    """
    Stage 2:

        Student clicks "I Understand"
          -> backend retrieves stored teaching
          -> same adaptive context is reconstructed
          -> LLM generates question from exact teaching
          -> question stored in MongoDB
          -> question returned to React

    The React app does NOT send the teaching text back.
    """

    try:
        active_record = _get_active_jit_state(
            student_id=request.student_id,
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

        stored_subtopic_id = active_record.get(
            "subtopic_id"
        )

        # --------------------------------------------------------
        # Re-read current BKT/adaptive state.
        #
        # We preserve the stored teaching decision so that the
        # question tests the same concept/difficulty that was taught.
        # --------------------------------------------------------

        p_l = _ensure_mastery_record(
            student_id=request.student_id,
            subtopic_id=stored_subtopic_id,
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
            image_asset_descriptions=(
                {
                    "ball_big_red": "a big red ball",
                    "ball_small_green": "a small green ball",
                    "ball_big_blue": "a big blue ball",
                    "ball_small_blue": "a small blue ball",
                    "ball_big_green": "a big green ball",
                    "apple_red": "a red apple",
                    "apple_green": "a green apple",
                    "dog": "a dog",
                    "cat": "a cat",
                    "bird": "a bird",
                    "toothbrush": "a toothbrush",
                    "toothpaste": "toothpaste",
                    "soap": "a bar of soap",
                    "comb": "a comb",
                }
            ),
        )

        question_id = (
            f"jit_{request.student_id}_"
            f"{stored_subtopic_id}_"
            f"{uuid4().hex[:12]}"
        )

        content_version_id = (
            active_session.get(
                "content_version_id"
            )
            or f"jit_content_{uuid4().hex}"
        )

        choices = question.get(
            "choices",
            [],
        )

        correct_choices = [
            choice
            for choice in choices
            if choice.get("is_correct") is True
        ]

        if len(correct_choices) != 1:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Generated question does not contain exactly "
                    "one correct answer."
                ),
            )

        correct_answer = correct_choices[0][
            "image_key"
        ]

        # --------------------------------------------------------
        # Store generated question so /api/submit can grade it.
        # --------------------------------------------------------

        question_document = {
            "question_id": question_id,
            "student_id": request.student_id,
            "unit_id": active_session.get("unit_id"),
            "subtopic_id": stored_subtopic_id,
            "content_version_id": content_version_id,
            "source": "D1_JIT_LLM",
            "phase": "question",
            "activity_type": question.get(
                "activity_type",
                "picture_choice",
            ),
            "spoken_prompt": question[
                "spoken_prompt"
            ],
            "choices": choices,
            "correct_answer": correct_answer,
            "learning_objective": active_session[
                "learning_objective"
            ],
            "difficulty": active_session[
                "difficulty"
            ],
            "teaching_content": teaching,
            "mastery_probability_at_generation": p_l,
            "created_at": datetime.utcnow(),
        }

        questions_collection.insert_one(
            question_document
        )

        # --------------------------------------------------------
        # Move stored session to question phase.
        # --------------------------------------------------------

        mastery_state_collection.update_one(
            {
                "student_id": request.student_id,
                "subtopic_id": stored_subtopic_id,
            },
            {
                "$set": {
                    "active_jit_session.phase": "question",
                    "active_jit_session.question_id": question_id,
                    "active_jit_session.question": question,
                    "active_jit_session.question_created_at": (
                        datetime.utcnow()
                    ),
                }
            },
        )

        return {
            "success": True,
            "phase": "question",
            "question_id": question_id,
            "activity": question,
            "adaptive": {
                "subtopic_id": stored_subtopic_id,
                "learning_objective": active_session[
                    "learning_objective"
                ],
                "difficulty": active_session[
                    "difficulty"
                ],
                "p_l": p_l,
            },
            "model": GROQ_MODEL,
            "generation_attempts": question.get(
                "generation_attempts",
                1,
            ),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(
            f"[JIT QUESTION ERROR] {type(e).__name__}: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


# ============================================================
# GET ACTIVE JIT SESSION
# ============================================================

@app.get("/api/student/jit-session/{student_id}")
def get_active_jit_session(
    student_id: str,
):
    """
    Useful for refreshing the browser without losing the current
    teach/question state.
    """

    record = _get_active_jit_state(
        student_id=student_id,
    )

    if record is None:
        return {
            "success": True,
            "active": False,
        }

    session = record.get(
        "active_jit_session"
    )

    if not session:
        return {
            "success": True,
            "active": False,
        }

    return {
        "success": True,
        "active": True,
        "subtopic_id": record.get(
            "subtopic_id"
        ),
        "session": session,
    }


# ============================================================
# SUBMIT ANSWER
# ============================================================

@app.post("/api/submit")
def submit_adaptive_answer(
    request: AnswerRequest,
):
    """
    Grade both:
      1. normal database questions
      2. D1 JIT image questions

    For D1, request.answer is the selected image_key.
    """

    # --------------------------------------------------------
    # 1. Find question
    # --------------------------------------------------------

    question = questions_collection.find_one(
        {
            "question_id": request.question_id,
        }
    )

    if question is None:
        raise HTTPException(
            status_code=404,
            detail="Question not found",
        )

    # --------------------------------------------------------
    # 2. Compare answers
    # --------------------------------------------------------

    correct_answer = str(
        question.get("correct_answer", "")
    ).strip().lower()

    student_answer = str(
        request.answer
    ).strip().lower()

    correct = (
        student_answer == correct_answer
    )

    # --------------------------------------------------------
    # 3. Resolve subtopic/content
    # --------------------------------------------------------

    subtopic_id = question.get(
        "subtopic_id"
    )

    if not subtopic_id:
        content_version_id = question.get(
            "content_version_id"
        )

        content = None

        if content_version_id:
            content = content_versions_collection.find_one(
                {
                    "content_version_id":
                        content_version_id
                }
            )

        if content is not None:
            subtopic_id = content.get(
                "subtopic_id"
            )

    if not subtopic_id:
        raise HTTPException(
            status_code=422,
            detail=(
                "Question does not contain a valid subtopic_id."
            ),
        )

    # --------------------------------------------------------
    # 4. Find student's mastery
    # --------------------------------------------------------

    mastery = mastery_state_collection.find_one(
        {
            "student_id": request.student_id,
            "subtopic_id": subtopic_id,
        }
    )

    # --------------------------------------------------------
    # 5. Create initial mastery if necessary
    # --------------------------------------------------------

    if mastery is None:
        previous_mastery = P_L0

        mastery_state_collection.insert_one(
            {
                "student_id": request.student_id,
                "subtopic_id": subtopic_id,
                "mastery_probability": previous_mastery,
                "created_at": datetime.utcnow(),
            }
        )

    else:
        previous_mastery = mastery.get(
            "mastery_probability",
            P_L0,
        )

    # --------------------------------------------------------
    # 6. BKT UPDATE
    # --------------------------------------------------------

    new_mastery = update_mastery(
        previous_mastery,
        correct,
    )

    # --------------------------------------------------------
    # 7. Determine learning status
    # --------------------------------------------------------

    if new_mastery >= 0.85:
        status = "MASTERED"

    elif new_mastery < 0.40:
        status = "NEEDS_REMEDIATION"

    else:
        status = "CONTINUE"

    # --------------------------------------------------------
    # 8. Save mastery
    # --------------------------------------------------------

    mastery_state_collection.update_one(
        {
            "student_id": request.student_id,
            "subtopic_id": subtopic_id,
        },
        {
            "$set": {
                "mastery_probability": new_mastery,
                "last_answer_correct": correct,
                "last_updated": datetime.utcnow(),
            },
            "$inc": {
                "total_attempts": 1,
            },
        },
    )

    # --------------------------------------------------------
    # 9. Save attempt
    # --------------------------------------------------------

    attempts_collection.insert_one(
        {
            "student_id": request.student_id,
            "question_id": request.question_id,
            "subtopic_id": subtopic_id,
            "correct": correct,
            "previous_mastery": previous_mastery,
            "new_mastery": new_mastery,
            "response_time_ms": request.response_time_ms,
            "option_switch_count": request.option_switch_count,
            "audio_replay_count": request.audio_replay_count,
            "active_scaffold": request.active_scaffold,
            "source": question.get(
                "source",
                "DATABASE",
            ),
            "created_at": datetime.utcnow(),
        }
    )

    # --------------------------------------------------------
    # 10. Clear completed JIT session
    #
    # We keep a small history object instead of deleting the
    # entire mastery document.
    # --------------------------------------------------------

    mastery_state_collection.update_one(
        {
            "student_id": request.student_id,
            "subtopic_id": subtopic_id,
        },
        {
            "$set": {
                "last_jit_session_completed": True,
                "last_completed_question_id": (
                    request.question_id
                ),
                "last_completed_at": datetime.utcnow(),
            },
            "$unset": {
                "active_jit_session": "",
            },
        },
    )

    # --------------------------------------------------------
    # 11. Return result
    # --------------------------------------------------------

    return {
        "student_id": request.student_id,
        "question_id": request.question_id,
        "subtopic_id": subtopic_id,
        "correct": correct,
        "previous_mastery": previous_mastery,
        "new_mastery": new_mastery,
        "status": status,
        "next_step": (
            "generate_remediation_teaching"
            if status == "NEEDS_REMEDIATION"
            else "generate_next_teaching"
        ),
    }


# ============================================================
# GET MASTERY
# ============================================================

@app.get("/mastery/{student_id}")
def get_student_mastery(
    student_id: str,
):
    records = list(
        mastery_state_collection.find(
            {
                "student_id": student_id,
            },
            {
                "_id": 0,
            },
        )
    )

    return {
        "student_id": student_id,
        "mastery_records": records,
    }


# ============================================================
# GET ATTEMPTS
# ============================================================

@app.get("/attempts/{student_id}")
def get_student_attempts(
    student_id: str,
):
    records = list(
        attempts_collection.find(
            {
                "student_id": student_id,
            },
            {
                "_id": 0,
            },
        )
    )

    return {
        "student_id": student_id,
        "attempts": records,
    }


# ============================================================
# OPTIONAL DEBUG ENDPOINT
# ============================================================

@app.get("/api/student/adaptive-state/{student_id}/{subtopic_id}")
def get_adaptive_state(
    student_id: str,
    subtopic_id: str,
):
    """
    Inspect the current BKT state and the active JIT phase.

    Useful during development; do not expose this endpoint in a
    production deployment without authentication.
    """

    mastery = mastery_state_collection.find_one(
        {
            "student_id": student_id,
            "subtopic_id": subtopic_id,
        },
        {
            "_id": 0,
        },
    )

    if mastery is None:
        return {
            "student_id": student_id,
            "subtopic_id": subtopic_id,
            "mastery_probability": P_L0,
            "active_jit_session": None,
        }

    return mastery
