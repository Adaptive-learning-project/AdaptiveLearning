from fastapi import FastAPI, HTTPException
from app.schemas import AnswerRequest

from app.database import (
    client,
    content_versions_collection,
    questions_collection,
    mastery_state_collection,
    attempts_collection
)

from app.schemas import AnswerRequest

from app.bkt import (
    update_mastery,
    P_L0
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Adaptive Learning Platform - Person 2",
    description="BKT + MongoDB Answer Grading and Mastery API",
    version="2.0.0"
)


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "Person 2 Adaptive Learning API is running"
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
            "mongodb": "connected"
        }

    except Exception as e:

        return {
            "status": "unhealthy",
            "mongodb": "disconnected",
            "error": str(e)
        }


# ============================================================
# SUBMIT ANSWER
# ============================================================

@app.post("/api/submit")
def submit_adaptive_answer(
    request: AnswerRequest
):

    # --------------------------------------------------------
    # 1. Find question
    # --------------------------------------------------------

    question = questions_collection.find_one(
        {
            "question_id": request.question_id
        }
    )

    if question is None:

        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )


    # --------------------------------------------------------
    # 2. Compare answers
    # --------------------------------------------------------

    correct_answer = str(
        question["correct_answer"]
    ).strip().lower()

    student_answer = str(
        request.answer
    ).strip().lower()

    correct = (
        student_answer == correct_answer
    )


    # --------------------------------------------------------
    # 3. Find content
    # --------------------------------------------------------

    content = content_versions_collection.find_one(
        {
            "content_version_id":
                question["content_version_id"]
        }
    )

    if content is None:

        raise HTTPException(
            status_code=404,
            detail="Content version not found"
        )


    subtopic_id = content["subtopic_id"]


    # --------------------------------------------------------
    # 4. Find student's mastery
    # --------------------------------------------------------

    mastery = mastery_state_collection.find_one(
        {
            "student_id": request.student_id,
            "subtopic_id": subtopic_id
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
                "mastery_probability": previous_mastery
            }
        )

    else:

        previous_mastery = mastery.get(
            "mastery_probability",
            P_L0
        )


    # --------------------------------------------------------
    # 6. BKT UPDATE
    # --------------------------------------------------------

    new_mastery = update_mastery(
        previous_mastery,
        correct
    )


    # --------------------------------------------------------
    # 7. Save mastery
    # --------------------------------------------------------

    mastery_state_collection.update_one(
        {
            "student_id": request.student_id,
            "subtopic_id": subtopic_id
        },
        {
            "$set": {
                "mastery_probability": new_mastery
            }
        }
    )


    # --------------------------------------------------------
    # 8. Save attempt
    # --------------------------------------------------------

    attempts_collection.insert_one(
        {
            "student_id": request.student_id,
            "question_id": request.question_id,
            "subtopic_id": subtopic_id,
            "correct": correct,
            "previous_mastery": previous_mastery,
            "new_mastery": new_mastery
        }
    )


    # --------------------------------------------------------
    # 9. Determine learning status
    # --------------------------------------------------------

    if new_mastery >= 0.85:

        status = "MASTERED"

    elif new_mastery < 0.40:

        status = "NEEDS_REMEDIATION"

    else:

        status = "CONTINUE"


    # --------------------------------------------------------
    # 10. Return result
    # --------------------------------------------------------

    return {

        "student_id": request.student_id,

        "question_id": request.question_id,

        "subtopic_id": subtopic_id,

        "correct": correct,

        "previous_mastery": previous_mastery,

        "new_mastery": new_mastery,

        "status": status
    }


# ============================================================
# GET MASTERY
# ============================================================

@app.get("/mastery/{student_id}")
def get_student_mastery(
    student_id: int
):

    records = list(
        mastery_state_collection.find(
            {
                "student_id": student_id
            },
            {
                "_id": 0
            }
        )
    )

    return {

        "student_id": student_id,

        "mastery_records": records
    }


# ============================================================
# GET ATTEMPTS
# ============================================================

@app.get("/attempts/{student_id}")
def get_student_attempts(
    student_id: int
):

    records = list(
        attempts_collection.find(
            {
                "student_id": student_id
            },
            {
                "_id": 0
            }
        )
    )

    return {

        "student_id": student_id,

        "attempts": records
    }