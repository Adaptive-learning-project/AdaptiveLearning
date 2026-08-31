"""
llm_generator.py — Domain-aware LLM content generator.

Produces all 8 content types for any academic topic (programming,
mathematics, computer science, electronics, etc.) using Groq.

Model: openai/gpt-oss-120b  (set via GROQ_MODEL in .env)

Content types:
  main_explanation   – full technical explanation (first visit)
  simple_explanation – re-explanation after 2nd wrong answer
  example            – concrete example after 3rd wrong answer
  prerequisite       – foundational concept card after 4th wrong
  hint               – targeted nudge after 1st wrong (auto-revealed)
  question           – standard MCQ (application/analysis level)
  easy_question      – simpler MCQ (conceptual recall)
  hard_question      – challenging MCQ (multi-step reasoning)
"""

import json
import os
import random

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

# ── Environment ────────────────────────────────────────────────────────────────
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL:   str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

client = Groq(api_key=GROQ_API_KEY)

# ── Per-type temperature ───────────────────────────────────────────────────────
TEMPERATURE_MAP: dict[str, float] = {
    "main_explanation":   0.20,
    "simple_explanation": 0.25,
    "example":            0.35,
    "prerequisite":       0.15,
    "hint":               0.35,
    "question":           0.60,
    "easy_question":      0.55,
    "hard_question":      0.60,
    "diagnostic_question": 0.55,
}


# ── Core caller ────────────────────────────────────────────────────────────────

def _call(
    content_type: str,
    user_prompt: str,
    reference_text: str = "",
) -> dict:
    """
    Call Groq with the correct temperature for this content type.
    Returns parsed dict. Raises ValueError on failure.
    """
    temperature = TEMPERATURE_MAP.get(content_type, 0.35)

    system_lines = [
        "You are an expert university-level tutor and educator.",
        "You teach a wide range of subjects including programming, mathematics,",
        "computer science, data structures, algorithms, electronics, and more.",
        "",
        "ABSOLUTE RULES:",
        "- Generate content SPECIFICALLY about the exact topic and subtopic given.",
        "- NEVER use generic placeholder text.",
        "- NEVER mention networking, IP addresses, OSI layers, or routing UNLESS",
        "  the topic itself is about networking.",
        "- Use precise, subject-accurate terminology for the actual subject.",
        "- Return ONLY valid JSON with the exact fields requested.",
        "- No markdown, no code fences, no commentary outside the JSON.",
    ]

    if reference_text and reference_text.strip():
        system_lines += [
            "",
            "REFERENCE MATERIAL (treat as ground truth for all generated content):",
            reference_text.strip(),
        ]

    system_prompt = "\n".join(system_lines)

    resp = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        temperature=temperature,
        response_format={"type": "json_object"},
        max_tokens=900,
    )

    raw = resp.choices[0].message.content.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"JSON parse failed for {content_type}: {exc}\nRaw: {raw[:300]}"
        ) from exc


# ── Explanation generators ─────────────────────────────────────────────────────

def _gen_main_explanation(topic: str, subtopic: str, reference_text: str = "") -> dict:
    prompt = f"""Generate a thorough technical explanation of "{subtopic}" as part of "{topic}".

Target audience: university students studying {topic}.

Your explanation MUST:
1. Give the precise definition of {subtopic} in the context of {topic}
2. Explain HOW it works mechanically or operationally (step by step if needed)
3. Include at least one concrete, subject-specific detail (a syntax example, formula, algorithm step, or specific value)
4. Mention one common use case or practical consequence
5. Be 4-6 sentences, technically accurate, and use correct {topic} terminology

Return ONLY this JSON:
{{
  "text": "<your explanation here — DO NOT use networking/IP/OSI jargon unless {topic} is about networking>",
  "emoji": "<one relevant emoji for {subtopic}>"
}}"""
    return _call("main_explanation", prompt, reference_text)


def _gen_simple_explanation(topic: str, subtopic: str, reference_text: str = "") -> dict:
    prompt = f"""A student studying {topic} answered a question about "{subtopic}" wrong twice.

Give them a FRESH, SIMPLER explanation that approaches the same concept from a different angle.

Requirements:
- 1-2 sentences only
- Use an analogy or contrast that relates directly to {topic}
- Be technically accurate — do not over-simplify to the point of being wrong
- Address the most common misconception about {subtopic} in {topic}

Return ONLY this JSON:
{{
  "text": "<fresh simple explanation — specific to {subtopic} in {topic}>",
  "emoji": "<one relevant emoji>"
}}"""
    return _call("simple_explanation", prompt, reference_text)


def _gen_example(topic: str, subtopic: str, reference_text: str = "") -> dict:
    prompt = f"""A student studying {topic} still doesn't understand "{subtopic}" after two attempts.

Give them a CONCRETE EXAMPLE that makes the concept click.

Requirements:
- Show a real, specific example — not a vague description
- If {topic} involves code: show a short code snippet (2-5 lines)
- If {topic} involves math: show a worked numerical example
- If {topic} involves circuits/hardware: describe a specific scenario with real values
- Keep it directly relevant to {subtopic} in {topic}
- 2-3 sentences or a short code/math example

Return ONLY this JSON:
{{
  "text": "<concrete example with actual values, code, or math — specific to {subtopic} in {topic}>",
  "emoji": "<one relevant emoji>"
}}"""
    return _call("example", prompt, reference_text)


def _gen_prerequisite(topic: str, subtopic: str, reference_text: str = "") -> dict:
    prompt = f"""A student studying {topic} has answered questions about "{subtopic}" wrong four times.

Identify the single most critical prerequisite concept they are probably missing.

Requirements:
- Name the SPECIFIC prerequisite concept (e.g., "pointers in C++", "the chain rule in calculus")
- Define it in one sentence
- Explain in one sentence why that prerequisite is needed to understand {subtopic}
- Be specific to {topic} — do not give generic advice

Return ONLY this JSON:
{{
  "text": "<two sentences: (1) define the specific prerequisite for {subtopic} in {topic}, (2) explain why it is needed>",
  "emoji": "📌"
}}"""
    return _call("prerequisite", prompt, reference_text)


def _gen_hint(topic: str, subtopic: str, reference_text: str = "") -> dict:
    prompt = f"""A student studying {topic} just got a question about "{subtopic}" wrong.

Write a one-sentence hint that:
- Points toward the correct answer WITHOUT revealing it
- References a specific property, rule, or mechanism of {subtopic} in {topic}
- Is useful regardless of which specific question was asked

Return ONLY this JSON:
{{
  "text": "<one-sentence hint — technically specific to {subtopic} in {topic}>",
  "emoji": "💡"
}}"""
    return _call("hint", prompt, reference_text)


# ── Question generators ────────────────────────────────────────────────────────

def _gen_question(topic: str, subtopic: str, reference_text: str = "") -> dict:
    prompt = f"""Write a multiple-choice question about "{subtopic}" in {topic}.
Difficulty: Application level — requires understanding, not just memorising a definition.

Rules:
- All 4 options same grammatical category
- At least one wrong option is a common misconception about {subtopic}
- Question is SPECIFIC to {subtopic} in {topic}
- No code blocks or backtick fences in any JSON value
- Each option under 15 words
- "correct" = 0-based index of the correct option

Return ONLY this JSON:
{{"text": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "2-3 sentences explaining why correct is right and why top wrong option is wrong"}}"""
    result = _call("question", prompt, reference_text)
    return _shuffle_options(result)


def _gen_easy_question(topic: str, subtopic: str, reference_text: str = "") -> dict:
    prompt = f"""Write an easy multiple-choice question about "{subtopic}" in {topic}.
For a struggling student — test ONE core property of {subtopic}.

Rules:
- All 4 options same category, all plausible to an unfamiliar student
- Question SPECIFIC to {subtopic} in {topic} — not generic
- No code blocks or backtick fences in any JSON value
- Each option under 12 words
- "correct" = 0-based index of the correct option

Return ONLY this JSON:
{{"text": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "1-2 sentences explaining the correct answer"}}"""
    result = _call("easy_question", prompt, reference_text)
    return _shuffle_options(result)


def _gen_hard_question(topic: str, subtopic: str, reference_text: str = "") -> dict:
    prompt = f"""Write a challenging multiple-choice question about "{subtopic}" in {topic}.
For a high-mastery student — requires multi-step reasoning or edge-case analysis.

Rules:
- Frame as a scenario or consequence question
- Technical specifics about {subtopic} in {topic}
- No code blocks or backtick fences in any JSON value
- Each option under 15 words
- Each wrong option encodes a specific reasoning error
- "correct" = 0-based index of the correct option

Return ONLY this JSON:
{{"text": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "3-4 sentences: step-by-step reasoning and what error each wrong option represents"}}"""
    result = _call("hard_question", prompt, reference_text)
    return _shuffle_options(result)


def _gen_diagnostic_question(topic: str, subtopic: str, reference_text: str = "") -> dict:
    """
    Diagnostic MCQ — medium difficulty, presented BEFORE instruction.

    Purpose: assess prior knowledge so BKT diagnostic_init() can seed P(L).
    - Correct answer  → P(L1) ≈ 0.47  (standard zone — skip remediation)
    - Wrong answer    → P(L1) ≈ 0.21  (scaffold zone — start with basics)

    The question must be answerable from prior knowledge / intuition,
    not from reading the lesson content (which hasn't been shown yet).
    """
    prompt = f"""Write a diagnostic pre-assessment question about "{subtopic}" in {topic}.

This is shown BEFORE any teaching — it measures prior knowledge only.
Medium difficulty: a student who has seen this topic before should get it right.
A student seeing it for the first time will likely guess.

Rules:
- Tests the single most important concept of {subtopic}
- All 4 options same category, all plausible
- No code blocks or backtick fences in any JSON value
- Each option under 15 words
- "correct" = 0-based index of the correct option

Return ONLY this JSON:
{{"text": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "1-2 sentences explaining the correct answer"}}"""
    result = _call("diagnostic_question", prompt, reference_text)
    return _shuffle_options(result)


def _shuffle_options(result: dict) -> dict:
    """Shuffle MCQ options so correct answer isn't always index 0."""
    if "options" in result and "correct" in result:
        try:
            correct_text = result["options"][int(result["correct"])]
            random.shuffle(result["options"])
            result["correct"] = result["options"].index(correct_text)
        except (IndexError, ValueError):
            pass
    return result


# ── Public API ─────────────────────────────────────────────────────────────────

def generate_all(topic: str, subtopic: str, reference_text: str = "") -> dict:
    """
    Generate all 8 content types for a subtopic.
    Each type is a separate Groq call so individual failures fall back gracefully.
    """
    calls = [
        ("main_explanation",   lambda: _gen_main_explanation(topic, subtopic, reference_text)),
        ("simple_explanation", lambda: _gen_simple_explanation(topic, subtopic, reference_text)),
        ("example",            lambda: _gen_example(topic, subtopic, reference_text)),
        ("prerequisite",       lambda: _gen_prerequisite(topic, subtopic, reference_text)),
        ("hint",               lambda: _gen_hint(topic, subtopic, reference_text)),
        ("question",           lambda: _gen_question(topic, subtopic, reference_text)),
        ("easy_question",      lambda: _gen_easy_question(topic, subtopic, reference_text)),
        ("hard_question",      lambda: _gen_hard_question(topic, subtopic, reference_text)),
        ("diagnostic_question", lambda: _gen_diagnostic_question(topic, subtopic, reference_text)),
    ]

    results = {}
    for key, fn in calls:
        try:
            results[key] = fn()
            print(f"  [LLM] OK {key}")
        except Exception as exc:
            print(f"  [LLM] FAIL {key}: {exc} — using fallback")
            results[key] = _fallback_piece(key, topic, subtopic)

    return results


def generate_fallback(topic: str, subtopic: str) -> dict:
    """Full fallback when Groq is unavailable."""
    return {
        key: _fallback_piece(key, topic, subtopic)
        for key in [
            "main_explanation", "simple_explanation", "example",
            "prerequisite", "hint", "question", "easy_question",
            "hard_question", "diagnostic_question",
        ]
    }


# ── Fallback content ───────────────────────────────────────────────────────────
# Shown only when an individual LLM call fails.
# These are intentionally minimal but subject-generic placeholders.

def _fallback_piece(key: str, topic: str, subtopic: str) -> dict:
    fb: dict[str, dict] = {
        "main_explanation": {
            "text": (
                f"{subtopic} is a fundamental concept in {topic}. "
                f"It defines a specific mechanism or structure that enables "
                f"the system to handle a key operation. "
                f"Understanding {subtopic} is essential for working effectively with {topic}. "
                f"It is used extensively in practice to solve real-world problems in {topic}."
            ),
            "emoji": "📚",
        },
        "simple_explanation": {
            "text": (
                f"Think of {subtopic} as a tool in {topic} that solves a specific problem "
                f"in a well-defined, reusable way."
            ),
            "emoji": "💡",
        },
        "example": {
            "text": (
                f"For example, in {topic}, {subtopic} is applied when you need to "
                f"handle a specific operation efficiently and correctly."
            ),
            "emoji": "🔍",
        },
        "prerequisite": {
            "text": (
                f"Before studying {subtopic}, make sure you understand the core "
                f"foundations of {topic}. That foundation is necessary to see why "
                f"{subtopic} exists and how it improves on simpler approaches."
            ),
            "emoji": "📌",
        },
        "hint": {
            "text": (
                f"Focus on the specific purpose and mechanism of {subtopic} in {topic}, "
                f"and consider what problem it solves."
            ),
            "emoji": "💡",
        },
        "question": {
            "text": f"What is the primary purpose of {subtopic} in {topic}?",
            "options": [
                f"To provide the core functionality defined by {subtopic}",
                f"To manage unrelated system resources",
                f"To replace the need for {topic} fundamentals",
                f"To handle errors in unrelated components",
            ],
            "correct": 0,
            "explanation": (
                f"{subtopic} exists specifically to provide its designated functionality "
                f"within {topic}."
            ),
        },
        "easy_question": {
            "text": f"Which best describes {subtopic} in {topic}?",
            "options": [
                f"A concept in {topic} that handles a specific operation",
                f"A physical hardware component",
                f"A type of network protocol",
                f"An operating system scheduler",
            ],
            "correct": 0,
            "explanation": f"{subtopic} is a concept within {topic} with a specific role.",
        },
        "hard_question": {
            "text": (
                f"In a complex {topic} scenario involving {subtopic}, "
                f"which outcome best demonstrates deep understanding?"
            ),
            "options": [
                f"Correctly applying {subtopic} to solve the given problem",
                f"Using a simpler approach that ignores {subtopic}",
                f"Replacing {subtopic} with an unrelated mechanism",
                f"Assuming {subtopic} has no constraints",
            ],
            "correct": 0,
            "explanation": (
                f"Deep understanding of {subtopic} means knowing how and when to apply "
                f"it correctly in {topic}."
            ),
        },
        "diagnostic_question": {
            "text": f"Which of the following best describes {subtopic} in {topic}?",
            "options": [
                f"{subtopic} is a core concept used to solve a specific problem in {topic}",
                f"{subtopic} is an optional feature only used in advanced {topic}",
                f"{subtopic} only applies to a different part of {topic}",
                f"{subtopic} was replaced by newer alternatives in modern {topic}",
            ],
            "correct": 0,
            "explanation": (
                f"{subtopic} is a fundamental concept in {topic} used to address a "
                f"specific problem or operation."
            ),
        },
    }
    return fb.get(key, {"text": f"Content about {subtopic} in {topic}.", "emoji": "📖"})
