from pydantic import BaseModel, Field
from typing import List, Literal, Optional

# ── Existing models (unchanged) ───────────────────────────────────────────────

class CreateUnitRequest(BaseModel):
    topic: str
    subtopics: List[str]
    reference_text: Optional[str] = ""
    teacher_id: Optional[str] = "admin_01"  # optional pasted text/notes

class ApproveContentRequest(BaseModel):
    subtopic_id: str

class ResolveEscalationRequest(BaseModel):
    escalation_id: str
    teacher_note: Optional[str] = ""


# ── BKT + DAG new models ──────────────────────────────────────────────────────

class OnboardingRequest(BaseModel):
    """Store a student's interest tag during onboarding."""
    student_id: str
    interest_tag: Literal["gaming", "sports", "music", "cartoon"]


class DiagnosticAnswerItem(BaseModel):
    """One diagnostic question result for a single concept node."""
    subtopic_id: str
    correct: bool


class DiagnosticSubmitRequest(BaseModel):
    """
    Submit all diagnostic answers for a unit in one call.
    The engine runs BKT diagnostic_init() on each item, applies
    prerequisite gating overrides, and writes initial P(L) values
    to bkt_states_col.
    """
    student_id: str
    unit_id: str
    answers: List[DiagnosticAnswerItem]


class BKTStateResponse(BaseModel):
    """Per-node BKT state returned to the client."""
    subtopic_id:       str
    subtopic_name:     str
    p_l:               float        # current mastery probability [0.0, 1.0]
    zone:              str          # mastered / challenge / standard / scaffold
    mastered:          bool
    consecutive_wrong: int
    hint_dependent:    bool


class NextActivityResponse(BaseModel):
    """
    Enriched next-activity response.
    Extends the existing shape with BKT + DAG fields.
    All existing fields from the old response are preserved.
    """
    # ── Existing fields (backward compatible) ─────────────────────────────
    subtopic_id:        str
    subtopic_name:      str
    topic:              str
    mastery_score:      int          # legacy integer score (kept for frontend compat)
    consecutive_wrong:  int
    progress:           dict         # {done: int, total: int}
    action:             str
    message:            str
    show_hint:          bool
    content:            dict
    content_type:       str
    question:           dict
    question_type:      str
    hint:               str

    # ── New BKT + DAG fields ───────────────────────────────────────────────
    p_l:                float        # current P(L) probability
    zone:               str          # mastered / challenge / standard / scaffold
    support_level:      int          # 0-5 (0=no support, 5=teacher escalation)
    reason:             str          # PREREQUISITE_GAP / LOW_MASTERY / READY_FOR_CHALLENGE / etc.
    hint_dependent:     bool = False # hybrid layer active
    dag_action:         str  = "stay"           # stay / forward / backward / complete
    remediation_target: Optional[str] = None    # subtopic_id if backward DAG traversal

"""
backend/app/schemas.py
Pydantic Schemas for Cognitive Governor, Telemetry, and Pedagogical Specifications
"""

from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

PedagogicalAction = Literal[
    "explanation",
    "simple_example",
    "easy_question",
    "medium_question",
    "hard_transfer",
    "hint",
    "bridge_rescue",
    "prerequisite_bridge"
]

CognitiveState = Literal[
    "LEARNING",
    "STRUGGLING",
    "OVERCHALLENGED",
    "OSCILLATING",
    "PREREQUISITE_GAP",
    "MASTERED"
]

class PedagogicalDecision(BaseModel):
    concept: str
    action: PedagogicalAction
    difficulty: int
    cognitive_state: CognitiveState
    intervention_goal: str
    specific_error: Optional[str] = "None"
    constraints: List[str] = []

class SubmitAnswerRequest(BaseModel):
    student_id: str
    unit_id: Optional[str] = None
    subtopic_id: str
    subtopic_name: Optional[str] = "General Concept"  # Prevents 422 if omitted
    selected_option: int
    correct_option: Optional[int] = None
    correct: Optional[bool] = None
    hint_used: bool = False
    question_type: Optional[str] = "question"
    response_time_ms: int = 0
    option_switch_count: int = 0
    current_difficulty: int = 1
    recent_errors: List[str] = []

class DiagnosticLog(BaseModel):
    student_id: str
    subtopic_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_correct: bool
    response_time_ms: int
    option_switch_count: int
    error_tag: str
    p_l_before: float
    p_l_after: float
    cognitive_state: CognitiveState
    governor_action: PedagogicalAction
    intervention_goal: str
    generated_content: Dict[str, Any]