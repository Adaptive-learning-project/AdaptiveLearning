"""
Prompt templates for all 5 content types.
Each template instructs the LLM to return ONLY valid JSON matching the Pydantic schema.
Subtopic is injected at call time.
"""

# ── 1. Easy Explanation ────────────────────────────────────────────────────────

EASY_EXPLANATION_PROMPT = """You are an expert computer networks teacher explaining concepts to a beginner student.

Your task: Write a simple, beginner-friendly explanation of the subtopic: "{subtopic}"

Rules:
- Use plain English and a real-world analogy
- Avoid jargon where possible; define it if necessary
- Keep it concise but complete

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text.
The JSON must exactly match this structure:

{{
  "content_type": "easy_explanation",
  "subtopic": "{subtopic}",
  "title": "<short descriptive title>",
  "explanation": "<clear plain-English explanation with analogy, at least 3 sentences>",
  "key_points": ["<point 1>", "<point 2>", "<point 3>"],
  "difficulty": "easy"
}}
"""

# ── 2. Medium Explanation ──────────────────────────────────────────────────────

MEDIUM_EXPLANATION_PROMPT = """You are an expert computer networks teacher explaining concepts to an intermediate student.

Your task: Write a detailed technical explanation of the subtopic: "{subtopic}"

Rules:
- Use proper technical terminology
- Include how it works at a deeper level
- Can include a simple ASCII diagram if helpful

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text.
The JSON must exactly match this structure:

{{
  "content_type": "medium_explanation",
  "subtopic": "{subtopic}",
  "title": "<short descriptive title>",
  "explanation": "<technical explanation with depth, at least 5 sentences>",
  "key_points": ["<point 1>", "<point 2>", "<point 3>", "<point 4>"],
  "difficulty": "medium"
}}
"""

# ── 3. Easy Question ───────────────────────────────────────────────────────────

EASY_QUESTION_PROMPT = """You are a computer networks teacher writing a simple recall question for a beginner student.

Your task: Write one easy question about the subtopic: "{subtopic}"

Rules:
- The question should test basic recall or simple understanding
- The correct answer should be a short phrase (1–10 words)
- The explanation should clarify why the answer is correct

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text.
The JSON must exactly match this structure:

{{
  "content_type": "easy_question",
  "subtopic": "{subtopic}",
  "question_text": "<the question to ask the student>",
  "correct_answer": "<the exact expected answer>",
  "explanation": "<why this is the correct answer, 1–2 sentences>",
  "difficulty": "easy"
}}
"""

# ── 4. Medium Question ─────────────────────────────────────────────────────────

MEDIUM_QUESTION_PROMPT = """You are a computer networks teacher writing a conceptual question for an intermediate student.

Your task: Write one medium-difficulty question about the subtopic: "{subtopic}"

Rules:
- The question should require understanding, not just recall
- The correct answer should be a short but complete phrase
- The explanation should clearly connect the answer to the underlying concept

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text.
The JSON must exactly match this structure:

{{
  "content_type": "medium_question",
  "subtopic": "{subtopic}",
  "question_text": "<the conceptual question>",
  "correct_answer": "<the expected correct answer>",
  "explanation": "<clear explanation connecting answer to the concept, 2–3 sentences>",
  "difficulty": "medium"
}}
"""

# ── 5. Hint ────────────────────────────────────────────────────────────────────

HINT_PROMPT = """You are a computer networks teacher writing a helpful hint for a student who is stuck.

Your task: Write a hint for the subtopic: "{subtopic}"

Rules:
- Guide the student toward the answer WITHOUT giving it away
- Use a question or analogy to prompt thinking
- Keep it to 1–2 sentences

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text.
The JSON must exactly match this structure:

{{
  "content_type": "hint",
  "subtopic": "{subtopic}",
  "hint_text": "<a nudge that guides without revealing the answer>",
  "difficulty": "easy"
}}
"""

# ── Prompt registry ────────────────────────────────────────────────────────────

PROMPT_MAP: dict[str, str] = {
    "easy_explanation": EASY_EXPLANATION_PROMPT,
    "medium_explanation": MEDIUM_EXPLANATION_PROMPT,
    "easy_question": EASY_QUESTION_PROMPT,
    "medium_question": MEDIUM_QUESTION_PROMPT,
    "hint": HINT_PROMPT,
}


def get_prompt(content_type: str, subtopic: str) -> str:
    """Return the filled prompt string for a given content type and subtopic."""
    template = PROMPT_MAP.get(content_type)
    if not template:
        raise ValueError(f"Unknown content_type: {content_type}")
    return template.format(subtopic=subtopic)
