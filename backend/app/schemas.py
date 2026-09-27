"""
backend/app/schemas.py

Pydantic Schemas for:
- Unit/content management
- BKT + DAG
- Cognitive Governor
- Telemetry
- D1 JIT Visual Activity Generation
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# =============================================================================
# EXISTING MODELS
# =============================================================================


class CreateUnitRequest(BaseModel):
    topic: str
    subtopics: List[str]
    reference_text: Optional[str] = ""
    teacher_id: Optional[str] = "admin_01"


class ApproveContentRequest(BaseModel):
    subtopic_id: str


class ResolveEscalationRequest(BaseModel):
    escalation_id: str
    teacher_note: Optional[str] = ""


# =============================================================================
# BKT + DAG MODELS
# =============================================================================


class OnboardingRequest(BaseModel):
    """Store a student's interest tag during onboarding."""

    student_id: str

    interest_tag: Literal[
        "gaming",
        "sports",
        "music",
        "cartoon"
    ]


class DiagnosticAnswerItem(BaseModel):
    """One diagnostic question result for a single concept node."""

    subtopic_id: str
    correct: bool


class DiagnosticSubmitRequest(BaseModel):
    """
    Submit all diagnostic answers for a unit in one call.

    The engine runs diagnostic initialization for each item,
    applies prerequisite gating overrides, and writes initial
    P(L) values to the BKT state collection.
    """

    student_id: str
    unit_id: str
    answers: List[DiagnosticAnswerItem]


class BKTStateResponse(BaseModel):
    """Per-node BKT state returned to the client."""

    subtopic_id: str
    subtopic_name: str

    # Current mastery probability [0.0, 1.0]
    p_l: float

    # mastered / challenge / standard / scaffold
    zone: str

    mastered: bool

    consecutive_wrong: int

    hint_dependent: bool


class NextActivityResponse(BaseModel):
    """
    Enriched next-activity response.

    Extends the existing response with BKT + DAG fields.
    Existing fields are preserved for frontend compatibility.
    """

    # -------------------------------------------------------------------------
    # Existing fields - backward compatible
    # -------------------------------------------------------------------------

    subtopic_id: str
    subtopic_name: str
    topic: str

    # Legacy integer score
    mastery_score: int

    consecutive_wrong: int

    # Example:
    # {"done": 4, "total": 10}
    progress: dict

    action: str
    message: str
    show_hint: bool

    content: dict
    content_type: str

    question: dict
    question_type: str

    hint: str

    # -------------------------------------------------------------------------
    # BKT + DAG fields
    # -------------------------------------------------------------------------

    # Current P(L) probability
    p_l: float

    # mastered / challenge / standard / scaffold
    zone: str

    # 0-5
    # 0 = no support
    # 5 = teacher escalation
    support_level: int

    # Examples:
    # PREREQUISITE_GAP
    # LOW_MASTERY
    # READY_FOR_CHALLENGE
    reason: str

    # Hybrid scaffolding layer
    hint_dependent: bool = False

    # stay / forward / backward / complete
    dag_action: str = "stay"

    # Subtopic ID when backward traversal is required
    remediation_target: Optional[str] = None


# =============================================================================
# COGNITIVE GOVERNOR MODELS
# =============================================================================


CognitiveState = Literal[
    "MASTERED",
    "OSCILLATING",
    "STRUGGLING",
    "LEARNING"
]


PedagogicalAction = Literal[
    "ADVANCE_CONCEPT_NODE",
    "HIGHLIGHT_TARGET",
    "ELIMINATE_DISTRACTOR",
    "STANDARD_REINFORCE"
]


class PedagogicalDecision(BaseModel):
    concept: str

    action: PedagogicalAction

    cognitive_state: CognitiveState

    intervention_goal: str

    scaffold_type: str

    target_id: Optional[str] = None

    constraints: List[str]


# =============================================================================
# TELEMETRY / ANSWER SUBMISSION
# =============================================================================


class SubmitAnswerRequest(BaseModel):
    student_id: str

    unit_id: Optional[str] = "facp_preprimary"

    subtopic_id: Optional[str] = None

    subtopic_name: Optional[str] = "Color Identification"

    correct: bool

    response_time_ms: int = 0

    option_switch_count: int = 0

    # NONE
    # HIGHLIGHT_TARGET
    # ELIMINATE_DISTRACTOR
    active_scaffold: Optional[str] = "NONE"

    # Number of times audio prompt was re-triggered
    audio_replay_count: Optional[int] = 0


class DiagnosticLog(BaseModel):
    student_id: str

    subtopic_id: str

    timestamp: datetime = Field(
        default_factory=datetime.utcnow
    )

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


# =============================================================================
# D1 - JIT VISUAL ACTIVITY GENERATION
# =============================================================================

"""
D1 Goal:

The LLM should generate simple, non-text visual activities.

Example:

{
    "activity_type": "picture_choice",
    "spoken_prompt": "Touch the big red ball",
    "choices": [
        {
            "image_key": "ball_big_red",
            "is_correct": true
        },
        {
            "image_key": "ball_small_green",
            "is_correct": false
        }
    ]
}

Important:
- spoken_prompt must contain fewer than 6 words.
- choices must use image_key.
- choices must NOT contain generated paragraphs/text.
- exactly one choice must be correct.
"""


# -----------------------------------------------------------------------------
# Allowed JIT activity types
# -----------------------------------------------------------------------------


JITActivityType = Literal[
    "picture_choice",
    "picture_sort",
    "picture_match"
]


# -----------------------------------------------------------------------------
# Allowed visual asset keys
# -----------------------------------------------------------------------------

"""
These keys correspond to assets available in the frontend.

Example:

image_key = "ball_big_red"

Frontend:

/learning/objects/ball_big_red.png

The LLM should select from this controlled vocabulary instead of inventing
filenames.
"""

ALLOWED_IMAGE_KEYS = {
    # Balls
    "ball_big_red",
    "ball_small_red",
    "ball_big_blue",
    "ball_small_blue",
    "ball_big_green",
    "ball_small_green",

    # Fruits
    "apple_red",
    "apple_green",

    # Animals
    "dog",
    "cat",
    "bird",

    # Daily-life objects
    "toothbrush",
    "toothpaste",
    "soap",
    "comb",
}


# -----------------------------------------------------------------------------
# JIT Choice
# -----------------------------------------------------------------------------


class JITChoice(BaseModel):
    """
    One visual choice presented to the learner.

    The LLM returns an image_key rather than raw text.

    Example:

    {
        "image_key": "ball_big_red",
        "is_correct": true
    }
    """

    image_key: str = Field(
        ...,
        min_length=1,
        description="Stable frontend image asset key"
    )

    is_correct: bool

    @field_validator("image_key")
    @classmethod
    def validate_image_key(cls, value: str) -> str:
        """
        Prevent the LLM from inventing image filenames.
        """

        if value not in ALLOWED_IMAGE_KEYS:
            raise ValueError(
                f"Unknown image_key '{value}'. "
                f"Allowed keys: {sorted(ALLOWED_IMAGE_KEYS)}"
            )

        return value


# -----------------------------------------------------------------------------
# JIT Activity
# -----------------------------------------------------------------------------


class JITActivity(BaseModel):
    """
    Constrained JIT-generated visual learning activity.

    This is the structured output expected from the LLM.
    """

    activity_type: JITActivityType

    spoken_prompt: str = Field(
        ...,
        min_length=1,
        description="Short spoken instruction containing fewer than 6 words"
    )

    choices: List[JITChoice] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="2-3 visual choices"
    )

    @field_validator("spoken_prompt")
    @classmethod
    def validate_spoken_prompt(cls, value: str) -> str:
        """
        D1 requirement:

        spoken_prompt must contain fewer than 6 words.

        Examples:

        VALID:
            "Touch the big red ball"  -> 5 words

        INVALID:
            "Please choose the large red ball" -> 6 words
        """

        value = value.strip()

        word_count = len(value.split())

        if word_count >= 6:
            raise ValueError(
                "spoken_prompt must contain fewer than 6 words. "
                f"Received {word_count} words."
            )

        return value

    @model_validator(mode="after")
    def validate_activity(self):
        """
        Validate activity-level constraints.
        """

        # -------------------------------------------------------------
        # Exactly one correct answer
        # -------------------------------------------------------------

        correct_count = sum(
            choice.is_correct
            for choice in self.choices
        )

        if correct_count != 1:
            raise ValueError(
                "JIT activity must contain exactly one correct choice. "
                f"Found {correct_count}."
            )

        # -------------------------------------------------------------
        # Prevent duplicate image keys
        # -------------------------------------------------------------

        image_keys = [
            choice.image_key
            for choice in self.choices
        ]

        if len(image_keys) != len(set(image_keys)):
            raise ValueError(
                "JIT activity cannot contain duplicate image_key values."
            )

        return self


# -----------------------------------------------------------------------------
# JIT Teaching Request
# -----------------------------------------------------------------------------


class JITTeachingRequest(BaseModel):
    """
    Request sent when the learner enters the adaptive teaching phase.

    The frontend supplies learner/curriculum identifiers only. The backend
    is responsible for reading BKT/Cognitive Governor state and determining
    what should be taught.
    """

    student_id: str = Field(
        ...,
        min_length=1,
        description="Stable learner identifier",
    )

    unit_id: Optional[str] = Field(
        default=None,
        description="Current curriculum unit identifier",
    )

    subtopic_id: Optional[str] = Field(
        default=None,
        description="Current subtopic/concept identifier",
    )


# -----------------------------------------------------------------------------
# JIT Teaching Visual
# -----------------------------------------------------------------------------


class JITTeachingVisual(BaseModel):
    """
    One controlled frontend visual asset used during teaching.
    """

    image_key: str = Field(
        ...,
        min_length=1,
        description="Stable frontend image asset key",
    )

    role: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Short explanation of why the visual is shown",
    )

    @field_validator("image_key")
    @classmethod
    def validate_image_key(cls, value: str) -> str:
        if value not in ALLOWED_IMAGE_KEYS:
            raise ValueError(
                f"Unknown image_key '{value}'. "
                f"Allowed keys: {sorted(ALLOWED_IMAGE_KEYS)}"
            )
        return value


# -----------------------------------------------------------------------------
# JIT Teaching Content
# -----------------------------------------------------------------------------


class JITTeachingContent(BaseModel):
    """
    Structured content produced by the teaching LLM before any question is
    generated. This creates the explicit teach -> understand -> question flow.
    """

    phase: Literal["teach"] = "teach"

    spoken_teaching: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="Simple learner-facing teaching explanation",
    )

    visuals: List[JITTeachingVisual] = Field(
        ...,
        min_length=1,
        max_length=4,
        description="Controlled visual assets supporting the lesson",
    )

    @model_validator(mode="after")
    def validate_visuals(self):
        image_keys = [visual.image_key for visual in self.visuals]

        if len(image_keys) != len(set(image_keys)):
            raise ValueError(
                "Teaching content cannot contain duplicate image_key values."
            )

        return self


# -----------------------------------------------------------------------------
# JIT Teaching Response
# -----------------------------------------------------------------------------


class JITTeachingAdaptiveInfo(BaseModel):
    subtopic_id: str
    subtopic_name: Optional[str] = None
    learning_objective: str
    difficulty: Literal["easy", "medium", "hard"]
    zone: Optional[str] = None
    reason: Optional[str] = None
    p_l: float


class JITTeachingResponse(BaseModel):
    """Response returned by the teaching-stage endpoint."""

    success: bool = True

    phase: Literal["teach"] = "teach"

    teaching: JITTeachingContent

    adaptive: Optional[JITTeachingAdaptiveInfo] = None

    model: Optional[str] = None

    generation_attempts: int = Field(
        default=1,
        ge=1,
    )


# -----------------------------------------------------------------------------
# JIT Question Request
# -----------------------------------------------------------------------------


class JITQuestionRequest(BaseModel):
    """
    Request sent after the learner completes the teaching stage.

    The frontend sends learner/context identifiers only. The backend must
    retrieve the stored teaching content from the active learning session and
    pass that content to the question-generation LLM.
    """

    student_id: str = Field(
        ...,
        min_length=1,
        description="Stable learner identifier",
    )

    unit_id: Optional[str] = Field(
        default=None,
        description="Current curriculum unit identifier",
    )

    subtopic_id: Optional[str] = Field(
        default=None,
        description="Current subtopic/concept identifier",
    )


# -----------------------------------------------------------------------------
# JIT Question Response
# -----------------------------------------------------------------------------


class JITQuestionAdaptiveInfo(BaseModel):
    subtopic_id: str
    subtopic_name: Optional[str] = None
    learning_objective: str
    difficulty: Literal["easy", "medium", "hard"]
    p_l: float


class JITQuestionResponse(BaseModel):
    """Response returned by the question-generation endpoint."""

    success: bool = True

    phase: Literal["question"] = "question"

    question_id: str

    activity: JITActivity

    adaptive: Optional[JITQuestionAdaptiveInfo] = None

    model: Optional[str] = None

    generation_attempts: int = Field(
        default=1,
        ge=1,
    )


# -----------------------------------------------------------------------------
# JIT Generation Request
# -----------------------------------------------------------------------------


class JITActivityRequest(BaseModel):
    """
    Request sent to the adaptive JIT generation endpoint.

    The frontend supplies learner/context identifiers only.
    The backend then reads the learner's BKT/Cognitive Governor state
    and derives the learning objective, difficulty, activity type,
    and allowed visual assets before calling the LLM.
    """

    student_id: str = Field(
        ...,
        min_length=1,
        description="Stable learner identifier"
    )

    unit_id: Optional[str] = Field(
        default=None,
        description="Current curriculum unit identifier"
    )

    subtopic_id: Optional[str] = Field(
        default=None,
        description="Current subtopic/concept identifier"
    )


# -----------------------------------------------------------------------------
# JIT Generation Response
# -----------------------------------------------------------------------------


class JITActivityResponse(BaseModel):
    """
    Response returned after successful JIT generation.
    """

    success: bool = True

    activity: JITActivity

    model: Optional[str] = None

    generation_attempts: int = 1