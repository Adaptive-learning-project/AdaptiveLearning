from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import MasteryState, ContentVersion, Question, Decision
from .adaptive_engine import decide_next_activity


app = FastAPI(
    title="Adaptive Learning API",
    version="0.1.0"
)


# --------------------------------------------------
# Test route
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Adaptive Learning API is running"
    }


# --------------------------------------------------
# Adaptive Next Activity API
# --------------------------------------------------

@app.get("/next")
def get_next_activity(
    student_id: int,
    subtopic_id: int,
    db: Session = Depends(get_db)
):

    # 1. Read student's mastery
    mastery = db.query(MasteryState).filter(
        MasteryState.student_id == student_id,
        MasteryState.subtopic_id == subtopic_id
    ).first()

    if mastery is None:
        raise HTTPException(
            status_code=404,
            detail="Mastery state not found"
        )

    mastery_score = mastery.mastery_score


    # 2. Make adaptive decision
    decision = decide_next_activity(mastery_score)

    difficulty = decision["difficulty"]
    reason = decision["reason"]


    # 3. Fetch content according to difficulty
    content = db.query(ContentVersion).filter(
        ContentVersion.subtopic_id == subtopic_id,
        ContentVersion.difficulty == difficulty
    ).first()

    if content is None:
        raise HTTPException(
            status_code=404,
            detail=f"{difficulty} content not found"
        )


    # 4. Fetch question
    question = db.query(Question).filter(
        Question.content_version_id == content.id
    ).first()

    if question is None:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )


    # 5. Store adaptive decision
    new_decision = Decision(
        student_id=student_id,
        subtopic_id=subtopic_id,
        mastery_score=mastery_score,
        difficulty=difficulty,
        reason=reason
    )

    db.add(new_decision)
    db.commit()


    # 6. Return next activity
    return {
        "content_text": content.content_text,
        "question_text": question.question_text,
        "hint_text": content.hint_text
    }