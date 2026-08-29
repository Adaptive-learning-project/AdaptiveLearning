from pydantic import BaseModel


# ============================================================
# ANSWER REQUEST
# ============================================================

class AnswerRequest(BaseModel):

    student_id: int

    question_id: int

    answer: str