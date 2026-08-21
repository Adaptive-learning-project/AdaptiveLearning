from pydantic import BaseModel
from typing import List, Optional

class CreateUnitRequest(BaseModel):
    teacher_id: str
    topic: str
    subtopics: List[str]          # ordered list of subtopic names
    reference_text: Optional[str] = ""  # optional pasted text/notes

class ApproveContentRequest(BaseModel):
    subtopic_id: str

class SubmitAnswerRequest(BaseModel):
    student_id: str
    subtopic_id: str
    selected_option: int          # 0-3
    hint_used: bool = False

class ResolveEscalationRequest(BaseModel):
    escalation_id: str
    teacher_note: Optional[str] = ""
