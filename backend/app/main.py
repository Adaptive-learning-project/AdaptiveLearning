from fastapi import FastAPI, HTTPException

from app.groq_handler import (
    generate_learning_explanation,
    generate_question,
    generate_diagnostic_questions,
    generate_hybrid_content
)

from app.schemas import (
    AnswerRequest,
    QuestionGenerationRequest,
    DiagnosticRequest,
    HybridRequest
)

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
# APP
# ============================================================

app = FastAPI(
    title="Adaptive Learning Platform - Person 2",
    description="BKT + MongoDB + Groq Adaptive Learning API",
    version="5.1.0"
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
    # 1. FIND QUESTION
    # --------------------------------------------------------

    question = questions_collection.find_one({
        "question_id": request.question_id
    })

    if question is None:

        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    # --------------------------------------------------------
    # 2. GET ANSWERS
    # --------------------------------------------------------

    correct_answer = str(
        question.get("correct_answer", "")
    ).strip().lower()

    student_answer = str(
        request.answer
    ).strip().lower()

    # --------------------------------------------------------
    # 3. CHECK ANSWER
    # --------------------------------------------------------

    correct = (
        student_answer == correct_answer
    )

    # --------------------------------------------------------
    # 4. FIND CONTENT
    # --------------------------------------------------------

    content = content_versions_collection.find_one({
        "content_version_id":
            question.get("content_version_id")
    })

    if content is None:

        raise HTTPException(
            status_code=404,
            detail="Content version not found"
        )

    # --------------------------------------------------------
    # 5. GET SUBTOPIC
    # --------------------------------------------------------

    subtopic_id = content.get("subtopic_id")

    if subtopic_id is None:

        raise HTTPException(
            status_code=500,
            detail="subtopic_id missing in content"
        )

    # --------------------------------------------------------
    # 6. FIND MASTERY
    # --------------------------------------------------------

    mastery = mastery_state_collection.find_one({
        "student_id": request.student_id,
        "subtopic_id": subtopic_id
    })

    # --------------------------------------------------------
    # 7. INITIAL MASTERY
    # --------------------------------------------------------

    if mastery is None:

        previous_mastery = P_L0

        mastery_state_collection.insert_one({

            "student_id":
                request.student_id,

            "subtopic_id":
                subtopic_id,

            "mastery_probability":
                previous_mastery
        })

    else:

        previous_mastery = mastery.get(
            "mastery_probability",
            P_L0
        )

    # --------------------------------------------------------
    # 8. BKT UPDATE
    # --------------------------------------------------------

    new_mastery = update_mastery(
        previous_mastery,
        correct
    )

    # --------------------------------------------------------
    # 9. SAVE MASTERY
    # --------------------------------------------------------

    mastery_state_collection.update_one(

        {
            "student_id":
                request.student_id,

            "subtopic_id":
                subtopic_id
        },

        {
            "$set": {
                "mastery_probability":
                    new_mastery
            }
        }
    )

    # --------------------------------------------------------
    # 10. SAVE ATTEMPT
    # --------------------------------------------------------

    attempts_collection.insert_one({

        "student_id":
            request.student_id,

        "question_id":
            request.question_id,

        "subtopic_id":
            subtopic_id,

        "correct":
            correct,

        "previous_mastery":
            previous_mastery,

        "new_mastery":
            new_mastery
    })

    # --------------------------------------------------------
    # 11. CREATE DECISION
    # --------------------------------------------------------

    decision = create_decision(

        student_id=request.student_id,

        subtopic_id=subtopic_id,

        mastery_probability=new_mastery
    )

    # --------------------------------------------------------
    # 12. SAVE DECISION
    # --------------------------------------------------------

    decisions_collection.insert_one(
        decision
    )

    # --------------------------------------------------------
    # 13. GROQ EXPLANATION
    # --------------------------------------------------------

    try:

        explanation = generate_learning_explanation(

            question=question.get(
                "question",
                ""
            ),

            student_answer=request.answer,

            correct_answer=question.get(
                "correct_answer",
                ""
            ),

            correct=correct,

            mastery_probability=new_mastery,

            difficulty=decision["difficulty"]
        )

    except Exception as e:

        explanation = (
            "Unable to generate AI explanation: "
            + str(e)
        )

    # --------------------------------------------------------
    # 14. RETURN
    # --------------------------------------------------------

    return {

        "student_id":
            request.student_id,

        "question_id":
            request.question_id,

        "subtopic_id":
            subtopic_id,

        "student_answer":
            request.answer,

        "correct_answer":
            question.get("correct_answer"),

        "correct":
            correct,

        "previous_mastery":
            previous_mastery,

        "new_mastery":
            new_mastery,

        "mastery_percentage":
            round(
                new_mastery * 100,
                2
            ),

        "status":
            decision["status"],

        "difficulty":
            decision["difficulty"],

        "reason":
            decision["reason"],

        "ai_explanation":
            explanation,

        "decision":
            decision
    }


# ============================================================
# GENERATE PERSONALIZED QUESTION
# ============================================================

@app.post("/api/generate-question")
def generate_adaptive_question(
    request: QuestionGenerationRequest
):

    try:

        result = generate_question(

            topic=request.topic,

            subtopic=request.subtopic,

            difficulty=request.difficulty,

            mastery_probability=
                request.mastery_probability,

            interest=request.interest
        )

        return {

            "success": True,

            "source":
                "Groq Personalized Question Generator",

            "topic":
                request.topic,

            "subtopic":
                request.subtopic,

            "mastery_probability":
                request.mastery_probability,

            "mastery_percentage":
                round(
                    request.mastery_probability * 100,
                    2
                ),

            "difficulty":
                request.difficulty,

            "interest":
                request.interest,

            "generated_question":
                result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# DIAGNOSTIC QUESTIONS
# ============================================================

@app.post("/api/diagnostic")
def generate_diagnostic(
    request: DiagnosticRequest
):

    try:

        # ----------------------------------------------------
        # Call Groq diagnostic generator
        # ----------------------------------------------------

        result = generate_diagnostic_questions(

            topic=request.topic,

            subtopic=request.subtopic,

            number_of_questions=
                request.number_of_questions,

            interest=request.interest
        )

        # ----------------------------------------------------
        # Count actually generated questions
        # ----------------------------------------------------

        questions = result.get(
            "questions",
            []
        )

        # Make sure questions is a list
        if not isinstance(questions, list):
            questions = []

        # Limit to requested number
        questions = questions[
            :request.number_of_questions
        ]

        # ----------------------------------------------------
        # Return diagnostic result
        # ----------------------------------------------------

        return {

            "success": True,

            "source":
                "Groq Personalized Diagnostic Generator",

            "topic":
                request.topic,

            "subtopic":
                request.subtopic,

            "number_of_questions":
                request.number_of_questions,

            "interest":
                request.interest,

            "generated_question_count":
                len(questions),

            "diagnostic": {

                "topic":
                    request.topic,

                "subtopic":
                    request.subtopic,

                "interest":
                    request.interest,

                "questions":
                    questions
            }
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Diagnostic question generation failed: "
                + str(e)
            )
        )


# ============================================================
# HYBRID ADAPTIVE CONTENT
# ============================================================

@app.post("/api/hybrid")
def hybrid_adaptive_content(
    request: HybridRequest
):

    try:

        result = generate_hybrid_content(

            topic=request.topic,

            subtopic=request.subtopic,

            mastery_probability=
                request.mastery_probability,

            previous_question=
                request.previous_question,

            interest=request.interest
        )

        return {

            "success": True,

            "architecture":
                "BKT + Rule-based Decision + Groq",

            "hybrid_result":
                result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


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
                "student_id":
                    student_id
            },

            {
                "_id": 0
            }
        )
    )

    return {

        "student_id":
            student_id,

        "mastery_records":
            records
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
                "student_id":
                    student_id
            },

            {
                "_id": 0
            }
        )
    )

    return {

        "student_id":
            student_id,

        "attempts":
            records
    }


# ============================================================
# GET DECISIONS
# ============================================================

@app.get("/decisions/{student_id}")
def get_student_decisions(
    student_id: int
):

    records = list(
        decisions_collection.find(

            {
                "student_id":
                    student_id
            },

            {
                "_id": 0
            }
        )
    )

    return {

        "student_id":
            student_id,

        "decisions":
            records
    }