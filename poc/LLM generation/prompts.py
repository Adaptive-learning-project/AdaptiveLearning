"""
Prompt templates for all 5 content types (POC pipeline).

Target audience: 2nd/3rd-year engineering students (computer networks,
Kurose & Ross level). Every template demands technical depth, specific
numerical parameters, and reasoning — not simple recall or plain-English
summaries.

Subtopic is injected at call time via get_prompt(content_type, subtopic).
"""

# ── 1. Easy Explanation ────────────────────────────────────────────────────────
# "Easy" here means the SUPPORT-SEQUENCE fallback explanation shown when a
# student is struggling — it should rebuild intuition, NOT dumb the topic down.

EASY_EXPLANATION_PROMPT = """You are an expert university lecturer in computer networks (Kurose & Ross level).

A 2nd-year engineering student got a question about "{subtopic}" wrong and needs a fresh angle.

Your task: Write an intuition-rebuilding explanation of "{subtopic}" that gives the student
a new way to think about the concept — NOT a simpler version of the same definition.

Rules:
- Use a systems-thinking analogy grounded in engineering (circuit, queue, protocol, algorithm)
- Keep it to 2–3 sentences maximum
- Include at least one technical term or specific number to stay precise
- Do NOT write a generic definition — assume the student already read one

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text.

{{
  "content_type": "easy_explanation",
  "subtopic": "{subtopic}",
  "title": "<short title that signals the fresh angle, e.g. 'Packet Switching as a Queue'>",
  "explanation": "<2–3 sentence intuition-rebuilding explanation with engineering analogy and at least one specific technical term or number>",
  "key_points": [
    "<the single most important property of {subtopic}>",
    "<one common misconception corrected>",
    "<one practical consequence in real systems>"
  ],
  "difficulty": "easy"
}}
"""

# ── 2. Medium Explanation ──────────────────────────────────────────────────────
# Full technical explanation shown on first visit — this is the main content.

MEDIUM_EXPLANATION_PROMPT = """You are an expert university lecturer in computer networks (Kurose & Ross level).

Your task: Write a complete technical explanation of "{subtopic}" for 2nd/3rd-year engineering students.

Rules:
- Open with a precise formal definition
- Explain the operating principle (how it works step by step)
- Include at least one specific numerical parameter (e.g. data rates, header sizes, timing values)
- Compare or contrast with at least one alternative approach
- End with a practical consequence or real-world deployment example
- Minimum 5 sentences — use precise technical language throughout

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text.

{{
  "content_type": "medium_explanation",
  "subtopic": "{subtopic}",
  "title": "<concise technical title>",
  "explanation": "<minimum 5 sentences covering: formal definition, operating principle, specific numerical parameters, comparison to alternative, practical consequence>",
  "key_points": [
    "<formal definition in one line>",
    "<operating principle — how it works>",
    "<specific numerical parameter or protocol name>",
    "<comparison to one alternative approach>",
    "<practical consequence or real-world example>"
  ],
  "difficulty": "medium"
}}
"""

# ── 3. Easy Question ───────────────────────────────────────────────────────────
# Shown to struggling students — tests ONE core conceptual property.
# Still meaningful: a student who hasn't studied cannot guess by elimination.

EASY_QUESTION_PROMPT = """You are a computer networks lecturer writing a question for a struggling engineering student.

Your task: Write one focused question about the single most important property of "{subtopic}".

Rules:
- Test ONE core conceptual property — not multi-step reasoning
- The correct answer must be a precise technical phrase (not yes/no, not a single generic word)
- Wrong answers must be technically plausible things in the same category
  (e.g. if the answer is a protocol name, all options should be protocol names)
- The explanation must name the specific technical mechanism that makes the answer correct

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text.

{{
  "content_type": "easy_question",
  "subtopic": "{subtopic}",
  "question_text": "<direct, unambiguous question about the core property of {subtopic}>",
  "correct_answer": "<precise technical phrase, 3–12 words>",
  "explanation": "<1–2 sentences naming the specific technical mechanism that makes this correct>",
  "difficulty": "easy"
}}
"""

# ── 4. Medium Question ─────────────────────────────────────────────────────────
# Standard question — application or analysis level, shown on first attempt.

MEDIUM_QUESTION_PROMPT = """You are a computer networks lecturer writing an exam-style question for engineering students.

Your task: Write one application-level question about "{subtopic}".

Rules:
- The question must require reasoning or analysis — NOT pure recall of a definition
- Frame it as a scenario, consequence, or comparison question
  (e.g. "Why does X happen when Y?", "What is the effect of Z on performance?")
- The correct answer must be a complete technical phrase explaining the mechanism
- Wrong answer options (if you include them) must encode common misconceptions
- The explanation must connect the correct answer to the underlying technical mechanism
  with 2–3 sentences of reasoning

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text.

{{
  "content_type": "medium_question",
  "subtopic": "{subtopic}",
  "question_text": "<scenario-based or consequence-based question — requires reasoning, not recall>",
  "correct_answer": "<complete technical phrase explaining the mechanism, 5–20 words>",
  "explanation": "<2–3 sentences: step-by-step reasoning to the answer, naming the specific technical mechanism and why naive alternatives are wrong>",
  "difficulty": "medium"
}}
"""

# ── 5. Hint ────────────────────────────────────────────────────────────────────
# Shown after first wrong answer — must reference the specific mechanism
# that separates the correct answer from the distractors.

HINT_PROMPT = """You are a computer networks lecturer writing a hint for an engineering student who just got a question about "{subtopic}" wrong.

Rules:
- Do NOT state or imply the correct answer directly
- Reference one specific technical property, trade-off, or constraint of {subtopic}
  that points the student toward the right direction
- One sentence only — precise and actionable
- Use technical language appropriate for a 2nd-year engineering student

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text.

{{
  "content_type": "hint",
  "subtopic": "{subtopic}",
  "hint_text": "<one sentence referencing a specific technical property or constraint of {subtopic} that nudges toward the answer without revealing it>",
  "difficulty": "easy"
}}
"""

# ── Prompt registry ────────────────────────────────────────────────────────────

PROMPT_MAP: dict[str, str] = {
    "easy_explanation":  EASY_EXPLANATION_PROMPT,
    "medium_explanation": MEDIUM_EXPLANATION_PROMPT,
    "easy_question":     EASY_QUESTION_PROMPT,
    "medium_question":   MEDIUM_QUESTION_PROMPT,
    "hint":              HINT_PROMPT,
}


def get_prompt(content_type: str, subtopic: str) -> str:
    """Return the filled prompt string for a given content type and subtopic."""
    template = PROMPT_MAP.get(content_type)
    if not template:
        raise ValueError(f"Unknown content_type: '{content_type}'. "
                         f"Valid types: {list(PROMPT_MAP.keys())}")
    return template.format(subtopic=subtopic)
