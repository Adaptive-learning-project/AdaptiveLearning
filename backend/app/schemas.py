from pydantic import BaseModel, Field
from typing import Optional, List


# ============================================================
# LEGACY — SUBMIT ANSWER (old /api/submit endpoint)
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


# ============================================================
# STUDENT — SUBMIT ANSWER  (new BKT+DAG flow)
# POST /api/student/submit-answer
# ============================================================

class StudentSubmitRequest(BaseModel):
    student_id: str
    subtopic_id: str
    selected_option: int        # 0-indexed MCQ choice
    hint_used: bool = False
    unit_id: Optional[str] = None   # optional override; resolved from subtopic if omitted


# ============================================================
# STUDENT — DIAGNOSTIC SUBMIT
# POST /api/student/diagnostic/submit
# ============================================================

class DiagnosticAnswer(BaseModel):
    subtopic_id: str
    selected_option: int        # 0-indexed MCQ choice

class DiagnosticSubmitRequest(BaseModel):
    student_id: str
    unit_id: str
    answers: List[DiagnosticAnswer]   # one answer per subtopic


# ============================================================
# TEACHER — CREATE UNIT
# POST /api/teacher/units
# ============================================================

class UnitCreateRequest(BaseModel):
    teacher_id: str
    topic: str
    subtopics: List[str]        # ordered list of subtopic names
    reference_text: Optional[str] = None   # teacher-pasted notes / textbook excerpt


# ============================================================
# TEACHER — APPROVE SUBTOPIC
# POST /api/teacher/approve
# ============================================================

class ApproveSubtopicRequest(BaseModel):
    subtopic_id: str


# ============================================================
# TEACHER — RESOLVE ESCALATION
# POST /api/teacher/escalations/resolve
# ============================================================

class ResolveEscalationRequest(BaseModel):
    escalation_id: str
    teacher_note: Optional[str] = None
