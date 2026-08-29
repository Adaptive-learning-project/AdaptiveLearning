"""
LLM content generator — engineering-level content for each content type.

Each content type is a separate Groq API call so failures are isolated.
Model  : llama-3.3-70b-versatile  (set in .env)
Target : 2nd/3rd-year engineering students (computer networks, OS, etc.)

Content types produced:
  main_explanation   – full technical explanation shown on first attempt
  simple_explanation – intuition-building re-explanation shown after 2nd wrong
  example            – concrete engineering analogy shown after 3rd wrong
  prerequisite       – prerequisite concept shown after 4th wrong
  hint               – nudge shown after 1st wrong (auto-revealed)
  question           – standard 4-option MCQ (application/analysis level)
  easy_question      – simpler 4-option MCQ (conceptual recall)
  hard_question      – challenging MCQ shown at high mastery (multi-step reasoning)
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
# Explanations: low temp → accurate, consistent
# Questions:    higher temp → varied distractors across regenerations
# Hints:        mid-range → helpful but not repetitive
TEMPERATURE_MAP: dict[str, float] = {
    "main_explanation":   0.25,
    "simple_explanation": 0.30,
    "example":            0.40,
    "prerequisite":       0.20,
    "hint":               0.40,
    "question":           0.70,
    "easy_question":      0.65,
    "hard_question":      0.70,
}



# ── Core caller ────────────────────────────────────────────────────────────────

def _call(
    content_type: str,
    user_prompt: str,
    reference_text: str = "",
) -> dict:
    """
    Call Groq with the correct temperature for this content type.

    If the teacher supplied reference_text (pasted lecture notes / textbook
    excerpt), it is injected into the system prompt so the model stays
    grounded in the actual course material rather than free-forming content.

    Returns a parsed dict.  Raises ValueError on JSON parse failure.
    """
    temperature = TEMPERATURE_MAP.get(content_type, 0.40)

    # Build system prompt — inject reference material when available
    system_parts = [
        "You are an expert university lecturer generating content for "
        "2nd and 3rd-year engineering students studying computer networks "
        "(Kurose & Ross level) or related engineering subjects.",
        "",
        "Requirements:",
        "- Use precise technical terminology.",
        "- Include specific numerical parameters, protocol names, or "
        "  layer references where relevant.",
        "- Do NOT over-simplify. Engineering students can handle depth.",
        "- Return ONLY valid JSON. No markdown fences, no commentary "
        "  outside the JSON object.",
    ]

    if reference_text and reference_text.strip():
        system_parts += [
            "",
            "REFERENCE MATERIAL (treat as ground truth — all generated "
            "content must be consistent with this):",
            reference_text.strip(),
        ]

    system_prompt = "\n".join(system_parts)

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
        raise ValueError(f"JSON parse failed for {content_type}: {exc}\nRaw: {raw[:300]}") from exc



# ── Explanation generators ─────────────────────────────────────────────────────

def _gen_main_explanation(topic: str, subtopic: str, reference_text: str = "") -> dict:
    """
    Engineering-depth explanation shown on the student's first visit.

    Includes: formal definition, operating principle, key parameters/numbers,
    comparison to at least one alternative, and a brief worked example.
    """
    prompt = f"""Generate a technical explanation of "{subtopic}" (part of the topic: {topic}).

Target audience: 2nd/3rd-year engineering students who already know basic networking.

Return a JSON object with EXACTLY these fields:
{{
  "text": "<Explanation — minimum 5 sentences. Must include: (1) formal definition, (2) how it works mechanically/operationally, (3) at least one specific numerical parameter or protocol name, (4) comparison to one alternative approach, (5) one practical consequence or real-world example. Use precise technical language.>",
  "emoji": "<one relevant technical emoji>"
}}

Topic: {topic}
Subtopic: {subtopic}"""
    return _call("main_explanation", prompt, reference_text)


def _gen_simple_explanation(topic: str, subtopic: str, reference_text: str = "") -> dict:
    """
    Intuition-rebuilding explanation shown after a student answers wrong twice.

    Simpler than main_explanation but still technically grounded — uses a
    systems-thinking analogy rather than dumbing down the concept.
    """
    prompt = f"""A student got a question about "{subtopic}" wrong twice. Give them a fresh angle.

Return a JSON object with EXACTLY these fields:
{{
  "text": "<One clear sentence that re-explains {subtopic} using a systems-thinking analogy or a contrast with something familiar to an engineering student (e.g., compare to a known protocol, circuit, or algorithm). Keep it to 1-2 sentences — precise and memorable.>",
  "emoji": "<one relevant emoji>"
}}

Topic: {topic}
Subtopic: {subtopic}"""
    return _call("simple_explanation", prompt, reference_text)



def _gen_example(topic: str, subtopic: str, reference_text: str = "") -> dict:
    """
    Concrete engineering analogy shown after 3rd wrong answer.

    Must use a real technical system or measurable scenario — not a
    generic everyday object metaphor.
    """
    prompt = f"""A student still doesn't understand "{subtopic}" after two attempts.
Give them a concrete engineering analogy or scenario that makes the concept click.

Return a JSON object with EXACTLY these fields:
{{
  "text": "<One or two sentences. Start with 'Think of it like ' or 'Consider a ' and use a real engineering scenario — e.g. a specific protocol behaviour, a circuit analogy, a queue/buffer situation, or a measurable system state. Include at least one number or technical term to keep it precise.>",
  "emoji": "<one relevant emoji>"
}}

Topic: {topic}
Subtopic: {subtopic}"""
    return _call("example", prompt, reference_text)


def _gen_prerequisite(topic: str, subtopic: str, reference_text: str = "") -> dict:
    """
    Prerequisite concept card shown after 4th wrong answer.

    Names the exact foundational concept the student is missing, defines it
    in one sentence, and explains why it is needed to understand the subtopic.
    """
    prompt = f"""A student has answered questions about "{subtopic}" wrong four times in a row.
Identify the single most likely prerequisite concept they are missing.

Return a JSON object with EXACTLY these fields:
{{
  "text": "<Two sentences: (1) Name the prerequisite concept explicitly and give its one-sentence definition. (2) Explain in one sentence how that concept underpins {subtopic}. Be specific — name actual protocol layers, data structures, or algorithms if relevant.>",
  "emoji": "📌"
}}

Topic: {topic}
Subtopic: {subtopic}"""
    return _call("prerequisite", prompt, reference_text)


def _gen_hint(topic: str, subtopic: str, reference_text: str = "") -> dict:
    """
    Targeted hint shown after the 1st wrong answer (auto-revealed).

    Must reference the specific mechanism or property that separates the
    correct answer from the distractors — without revealing the answer itself.
    """
    prompt = f"""Write a hint for an engineering student who just got a question about "{subtopic}" wrong.

Rules:
- Do NOT state or imply the correct answer directly.
- Reference one specific technical property, trade-off, or mechanism of {subtopic} that points toward the answer.
- One sentence only.

Return a JSON object with EXACTLY these fields:
{{
  "text": "<One sentence hint that nudges toward the answer by mentioning a key technical property or constraint of {subtopic}.>",
  "emoji": "💡"
}}

Topic: {topic}
Subtopic: {subtopic}"""
    return _call("hint", prompt, reference_text)



# ── Question generators ────────────────────────────────────────────────────────

def _gen_question(topic: str, subtopic: str, reference_text: str = "") -> dict:
    """
    Standard 4-option MCQ — application or analysis level.

    Rules enforced in prompt:
    - All 4 options are the same category of thing (all protocols, all devices, etc.)
    - At least one distractor is a common misconception
    - Question tests application/reasoning, NOT pure recall of a definition
    - Distractors are technically plausible, not obviously wrong
    """
    prompt = f"""Write a multiple-choice question about "{subtopic}" (part of {topic}).

Difficulty: Application / Analysis level — the question must require reasoning, not just
recall of a definition. An engineering student who memorised the definition but doesn't
truly understand the concept should be likely to get this wrong.

Rules:
1. All 4 options must be the same category (e.g. all data rates, all protocol names, all layer names).
2. At least one wrong option must be a common student misconception about {subtopic}.
3. Do NOT repeat the correct answer text verbatim in the question.
4. Each option: 4–10 words.
5. "correct" is the index (0–3) of the correct option in the options array.
6. Shuffle your options so the correct answer is not always index 0.

Return a JSON object with EXACTLY these fields:
{{
  "text": "<The question — specific, scenario-based or consequence-based>",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "correct": <integer 0-3>,
  "explanation": "<2–3 sentences: why the correct answer is right AND why the most tempting wrong option is wrong. Name the specific technical mechanism.>"
}}

Topic: {topic}
Subtopic: {subtopic}"""
    result = _call("question", prompt, reference_text)
    result = _shuffle_options(result)
    return result


def _gen_easy_question(topic: str, subtopic: str, reference_text: str = "") -> dict:
    """
    Easier 4-option MCQ shown after the student gets the standard question wrong.

    Tests the single most important conceptual property of the subtopic.
    Still uses plausible distractors — not trivial yes/no.
    """
    prompt = f"""Write an easier multiple-choice question about "{subtopic}" (part of {topic}).

This is shown to a struggling student — it should test ONE core conceptual property,
not require multi-step reasoning. But it must still be meaningful: a student who has
NOT studied the topic should not be able to guess by elimination.

Rules:
1. All 4 options are the same category of thing.
2. No obviously absurd distractors (e.g., "Controls screen display" is banned).
3. Each option: 4–10 words.
4. "correct" is the index (0–3) of the correct option.

Return a JSON object with EXACTLY these fields:
{{
  "text": "<The question — direct and unambiguous>",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "correct": <integer 0-3>,
  "explanation": "<1–2 sentences explaining the correct answer and its key property.>"
}}

Topic: {topic}
Subtopic: {subtopic}"""
    result = _call("easy_question", prompt, reference_text)
    result = _shuffle_options(result)
    return result


def _gen_hard_question(topic: str, subtopic: str, reference_text: str = "") -> dict:
    """
    Hard MCQ shown to high-mastery students (mastery_score >= 70).

    Requires multi-step reasoning, quantitative thinking, or comparison
    across two concepts. Distractors encode common analysis errors.
    """
    prompt = f"""Write a challenging multiple-choice question about "{subtopic}" (part of {topic}).

This is shown to students who already understand the basics. It must require
multi-step reasoning, quantitative comparison, or analysis of a scenario with
a non-obvious answer. A student who only memorised definitions will likely get it wrong.

Rules:
1. Frame the question as a scenario or a "what happens when..." / "why does..." question.
2. All 4 options are the same category.
3. Each distractor encodes a specific reasoning error (e.g. confusing two related concepts,
   ignoring a constraint, applying the wrong formula).
4. Include at least one specific number, protocol name, or layer reference in the question.
5. "correct" is the index (0–3) of the correct option.

Return a JSON object with EXACTLY these fields:
{{
  "text": "<Challenging scenario-based question with technical specifics>",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "correct": <integer 0-3>,
  "explanation": "<3–4 sentences: step-by-step reasoning to the correct answer, and identify the specific error each wrong option represents.>"
}}

Topic: {topic}
Subtopic: {subtopic}"""
    result = _call("hard_question", prompt, reference_text)
    result = _shuffle_options(result)
    return result


def _shuffle_options(result: dict) -> dict:
    """Shuffle MCQ options so correct answer isn't always index 0."""
    if "options" in result and "correct" in result:
        try:
            correct_text = result["options"][int(result["correct"])]
            random.shuffle(result["options"])
            result["correct"] = result["options"].index(correct_text)
        except (IndexError, ValueError):
            pass  # leave as-is if something is malformed
    return result



# ── Public API ─────────────────────────────────────────────────────────────────

def generate_all(topic: str, subtopic: str, reference_text: str = "") -> dict:
    """
    Generate all 8 content types for a subtopic.

    Each type is a separate Groq call so a single failure doesn't kill the
    whole batch — individual failures fall back to _fallback_piece().

    Args:
        topic:          The parent topic / unit name (e.g. "Computer Networks")
        subtopic:       The specific subtopic (e.g. "Packet Switching")
        reference_text: Optional teacher-pasted notes/textbook text.
                        Passed to every _call() for grounding.

    Returns:
        dict keyed by content type, each value is the parsed JSON dict.
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
    ]

    results = {}
    for key, fn in calls:
        try:
            results[key] = fn()
            print(f"  [LLM] ✓ {key}")
        except Exception as exc:
            print(f"  [LLM] ✗ {key} failed: {exc} — using fallback")
            results[key] = _fallback_piece(key, topic, subtopic)

    return results


def generate_fallback(topic: str, subtopic: str) -> dict:
    """Full fallback when Groq is completely unavailable."""
    return {key: _fallback_piece(key, topic, subtopic) for key in [
        "main_explanation", "simple_explanation", "example",
        "prerequisite", "hint", "question", "easy_question", "hard_question",
    ]}


# ── Per-piece fallback data ────────────────────────────────────────────────────
# These are shown when an individual LLM call fails.
# They are intentionally minimal but technically correct placeholders —
# far better than crashing the student session.

def _fallback_piece(key: str, topic: str, subtopic: str) -> dict:
    _fb: dict[str, dict] = {
        "main_explanation": {
            "text": (
                f"{subtopic} is a core mechanism in {topic}. "
                f"It defines how the system handles a specific aspect of data flow or resource management. "
                f"Understanding {subtopic} requires knowing how it interacts with adjacent layers or components. "
                f"It is typically characterised by specific performance parameters such as throughput, latency, or efficiency. "
                f"In practice, {subtopic} directly affects end-to-end system behaviour."
            ),
            "emoji": "📚",
        },
        "simple_explanation": {
            "text": (
                f"{subtopic} controls how {topic} manages a particular resource or data path — "
                f"think of it as the policy that decides what happens at a specific decision point in the system."
            ),
            "emoji": "💡",
        },
        "example": {
            "text": (
                f"Think of it like a controlled-access highway: {subtopic} sets the rules "
                f"for how data enters, moves through, and exits the {topic} system, "
                f"ensuring capacity is not exceeded and order is maintained."
            ),
            "emoji": "🛣️",
        },
        "prerequisite": {
            "text": (
                f"Before studying {subtopic}, you need a solid understanding of how {topic} "
                f"is structured at a high level — specifically how data units are addressed and "
                f"routed between nodes. That foundation is required to see why {subtopic} exists."
            ),
            "emoji": "📌",
        },
        "hint": {
            "text": (
                f"Focus on what {subtopic} is responsible for managing or controlling "
                f"within {topic}, and consider what would break if it were removed."
            ),
            "emoji": "💡",
        },
        "question": {
            "text": f"Which of the following best describes the primary function of {subtopic} in {topic}?",
            "options": [
                f"Manages the specific resource or flow defined by {subtopic}",
                f"Controls physical layer signal encoding",
                f"Assigns IP addresses to end hosts",
                f"Establishes transport-layer connections",
            ],
            "correct": 0,
            "explanation": (
                f"{subtopic} is responsible for managing its designated resource or "
                f"flow within {topic}. The other options describe unrelated networking functions."
            ),
        },
        "easy_question": {
            "text": f"What layer or component in {topic} does {subtopic} belong to?",
            "options": [
                f"The component that handles {subtopic}'s designated function",
                "The physical transmission medium",
                "The application-layer protocol stack",
                "The end-host operating system scheduler",
            ],
            "correct": 0,
            "explanation": (
                f"{subtopic} operates within the part of {topic} responsible for its specific function."
            ),
        },
        "hard_question": {
            "text": (
                f"In a {topic} scenario where {subtopic} is operating under high load, "
                f"which outcome is most likely and why?"
            ),
            "options": [
                f"Performance degrades according to the limiting constraint of {subtopic}",
                "Throughput increases due to parallelism",
                "Latency decreases as buffers empty faster",
                "The system defaults to a lower-layer fallback mechanism",
            ],
            "correct": 0,
            "explanation": (
                f"Under high load, {subtopic} hits its design constraint — typically a buffer, "
                f"bandwidth ceiling, or scheduling limit — causing measurable degradation. "
                f"The other options mischaracterise how {topic} responds to overload."
            ),
        },
    }
    return _fb.get(key, {"text": f"Content about {subtopic} in {topic}.", "emoji": "📖"})
