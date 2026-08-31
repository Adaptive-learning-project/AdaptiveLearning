from pydantic import BaseModel, Field
from typing import Optional


# ============================================================
# SUBMIT ANSWER
# ============================================================

class AnswerRequest(BaseModel):
    student_id: int
    question_id: int
    answer: str


# ============================================================
# QUESTION GENERATION
# ============================================================

class QuestionGenerationRequest(BaseModel):
    topic: str
    subtopic: str
    difficulty: str
    mastery_probability: float
    interest: Optional[str] = None


# ============================================================
# DIAGNOSTIC QUESTIONS
# ============================================================

class DiagnosticRequest(BaseModel):
    topic: str
    subtopic: str
    number_of_questions: int = Field(default=3, ge=1, le=10)
    interest: Optional[str] = None


# ============================================================
# HYBRID ADAPTIVE CONTENT
# ============================================================

class HybridRequest(BaseModel):
    topic: str
    subtopic: str
    mastery_probability: float
    previous_question: Optional[str] = None
    interest: Optional[str] = None