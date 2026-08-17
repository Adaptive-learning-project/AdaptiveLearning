from fastapi import FastAPI, HTTPException

from app.database import (
    content_versions_collection,
    questions_collection,
    mastery_state_collection
)

from app.schemas import AnswerRequest


# ============================================================
# CREATE FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Adaptive Learning Platform - Person 2",
    description="MongoDB based answer grading and mastery API",
    version="1.0.0"
)


# ============================================================
# HOME ROUTE
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Person 2 API is running"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    try:
        from app.database import client

        # Check MongoDB connection
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
# POST /answer
# ============================================================

@app.post("/answer")
def submit_answer(request: AnswerRequest):

    # --------------------------------------------------------
    # 1. FIND QUESTION
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
    # 2. GET CORRECT ANSWER
    # --------------------------------------------------------

    correct_answer = str(
        question["correct_answer"]
    )

    student_answer = str(
        request.answer
    )


    # --------------------------------------------------------
    # 3. NORMALIZE ANSWERS
    # --------------------------------------------------------

    correct_answer = (
        correct_answer
        .strip()
        .lower()
    )

    student_answer = (
        student_answer
        .strip()
        .lower()
    )


    # --------------------------------------------------------
    # 4. CHECK ANSWER
    # --------------------------------------------------------

    correct = (
        student_answer == correct_answer
    )


    # --------------------------------------------------------
    # 5. FIND CONTENT VERSION
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


    # --------------------------------------------------------
    # 6. GET SUBTOPIC ID
    # --------------------------------------------------------

    subtopic_id = content["subtopic_id"]


    # --------------------------------------------------------
    # 7. FIND MASTERY FOR THIS STUDENT + SUBTOPIC
    # --------------------------------------------------------

    mastery = mastery_state_collection.find_one(
        {
            "student_id": request.student_id,
            "subtopic_id": subtopic_id
        }
    )


    # --------------------------------------------------------
    # 8. CREATE MASTERY RECORD IF IT DOES NOT EXIST
    # --------------------------------------------------------

    if mastery is None:

        # Starting mastery score
        mastery_score = 0

        mastery_state_collection.insert_one(
            {
                "student_id": request.student_id,
                "subtopic_id": subtopic_id,
                "mastery_score": mastery_score
            }
        )

    else:

        # Existing student's score
        mastery_score = mastery.get(
            "mastery_score",
            0
        )


    # --------------------------------------------------------
    # 9. UPDATE SCORE
    # --------------------------------------------------------

    if correct:

        mastery_score += 10

    else:

        mastery_score -= 10


    # --------------------------------------------------------
    # 10. LIMIT SCORE BETWEEN 0 AND 100
    # --------------------------------------------------------

    mastery_score = max(
        0,
        min(
            100,
            mastery_score
        )
    )


    # --------------------------------------------------------
    # 11. UPDATE ONLY THIS STUDENT'S RECORD
    # --------------------------------------------------------

    mastery_state_collection.update_one(
        {
            "student_id": request.student_id,
            "subtopic_id": subtopic_id
        },
        {
            "$set": {
                "mastery_score": mastery_score
            }
        }
    )


    # --------------------------------------------------------
    # 12. RETURN RESULT
    # --------------------------------------------------------

    return {
        "student_id": request.student_id,
        "question_id": request.question_id,
        "correct": correct,
        "mastery_score": mastery_score
    }


# ============================================================
# GET STUDENT MASTERY
# ============================================================

@app.get("/mastery/{student_id}")
def get_student_mastery(student_id: int):

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