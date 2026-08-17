from pydantic import BaseModel


class AnswerRequest(BaseModel):
    student_id: int
    question_id: int
    answer: str