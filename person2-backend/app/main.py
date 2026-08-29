from fastapi import FastAPI, HTTPException

from app.schemas import AnswerRequest

from app.database import (
    client,
    content_versions_collection,
    questions_collection,
    mastery_state_collection,
    attempts_collection,
    decisions_collection
)

from app.bkt import (
    update_mastery,
    P_L0
)

from app.decision import create_decision


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
# HEALTH CHECK
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
# POST /api/submit
# ============================================================

@app.post("/api/submit")
def submit_adaptive_answer(
    request: AnswerRequest
):

    # ========================================================
    # 1. FIND QUESTION
    # ========================================================

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


    # ========================================================
    # 2. GET CORRECT ANSWER
    # ========================================================

    correct_answer = str(
        question.get("correct_answer", "")
    ).strip().lower()

    student_answer = str(
        request.answer
    ).strip().lower()


    # ========================================================
    # 3. CHECK ANSWER
    # ========================================================

    correct = (
        student_answer == correct_answer
    )


    # ========================================================
    # 4. FIND CONTENT VERSION
    # ========================================================

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


    # ========================================================
    # 5. GET SUBTOPIC
    # ========================================================

    subtopic_id = content["subtopic_id"]


    # ========================================================
    # 6. FIND STUDENT MASTERY
    # ========================================================

    mastery = mastery_state_collection.find_one(
        {
            "student_id": request.student_id,
            "subtopic_id": subtopic_id
        }
    )


    # ========================================================
    # 7. CREATE INITIAL MASTERY
    # ========================================================

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


    # ========================================================
    # 8. BKT UPDATE
    # ========================================================

    new_mastery = update_mastery(
        previous_mastery,
        correct
    )


    # ========================================================
    # 9. SAVE NEW MASTERY
    # ========================================================

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


    # ========================================================
    # 10. SAVE ATTEMPT
    # ========================================================

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


    # ========================================================
    # 11. CREATE ADAPTIVE DECISION
    # ========================================================

    decision = create_decision(
        student_id=request.student_id,
        subtopic_id=subtopic_id,
        mastery_probability=new_mastery
    )


    # ========================================================
    # 12. SAVE DECISION
    # ========================================================

    decisions_collection.insert_one(
        decision
    )


    # ========================================================
    # 13. RETURN RESULT
    # ========================================================

    return {

        "student_id": request.student_id,

        "question_id": request.question_id,

        "subtopic_id": subtopic_id,

        "correct": correct,

        "previous_mastery": previous_mastery,

        "new_mastery": new_mastery,

        "status": decision["status"],

        "decision": decision
    }


# ============================================================
# GET STUDENT MASTERY
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
# GET STUDENT ATTEMPTS
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


# ============================================================
# GET STUDENT DECISIONS
# ============================================================

@app.get("/decisions/{student_id}")
def get_student_decisions(
    student_id: int
):

    records = list(
        decisions_collection.find(
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

        "decisions": records
    }