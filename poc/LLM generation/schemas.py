"""
Pydantic schemas for all 5 content types.
Every LLM response is validated against one of these before being stored in MongoDB.
"""

from enum import Enum
from typing import Literal
from pydantic import BaseModel, Field


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"


class ContentType(str, Enum):
    EASY_EXPLANATION = "easy_explanation"
    MEDIUM_EXPLANATION = "medium_explanation"
    EASY_QUESTION = "easy_question"
    MEDIUM_QUESTION = "medium_question"
    HINT = "hint"


# ── 1. Easy Explanation ────────────────────────────────────────────────────────

class EasyExplanation(BaseModel):
    content_type: Literal["easy_explanation"]
    subtopic: str = Field(..., description="The subtopic this content belongs to")
    title: str = Field(..., min_length=3, max_length=100)
    explanation: str = Field(..., min_length=50, description="Plain-English explanation with analogy")
    key_points: list[str] = Field(..., min_length=2, max_length=5, description="2–5 bullet takeaways")
    difficulty: Literal["easy"]


# ── 2. Medium Explanation ──────────────────────────────────────────────────────

class MediumExplanation(BaseModel):
    content_type: Literal["medium_explanation"]
    subtopic: str
    title: str = Field(..., min_length=3, max_length=100)
    explanation: str = Field(..., min_length=100, description="Technical explanation with detail")
    key_points: list[str] = Field(..., min_length=2, max_length=6)
    difficulty: Literal["medium"]


# ── 3. Easy Question ───────────────────────────────────────────────────────────

class EasyQuestion(BaseModel):
    content_type: Literal["easy_question"]
    subtopic: str
    question_text: str = Field(..., min_length=10, description="The question to ask the student")
    correct_answer: str = Field(..., min_length=1, description="The expected correct answer (exact match)")
    explanation: str = Field(..., min_length=20, description="Why this is the correct answer")
    difficulty: Literal["easy"]


# ── 4. Medium Question ─────────────────────────────────────────────────────────

class MediumQuestion(BaseModel):
    content_type: Literal["medium_question"]
    subtopic: str
    question_text: str = Field(..., min_length=10)
    correct_answer: str = Field(..., min_length=1)
    explanation: str = Field(..., min_length=20)
    difficulty: Literal["medium"]


# ── 5. Hint ────────────────────────────────────────────────────────────────────

class Hint(BaseModel):
    content_type: Literal["hint"]
    subtopic: str
    hint_text: str = Field(
        ...,
        min_length=20,
        description="A nudge that guides the student without giving the answer away"
    )
    difficulty: Literal["easy"]


# ── Union type for type narrowing ──────────────────────────────────────────────

ContentSchema = EasyExplanation | MediumExplanation | EasyQuestion | MediumQuestion | Hint

# Maps content_type string → Pydantic model class
SCHEMA_MAP: dict[str, type] = {
    ContentType.EASY_EXPLANATION: EasyExplanation,
    ContentType.MEDIUM_EXPLANATION: MediumExplanation,
    ContentType.EASY_QUESTION: EasyQuestion,
    ContentType.MEDIUM_QUESTION: MediumQuestion,
    ContentType.HINT: Hint,
}
