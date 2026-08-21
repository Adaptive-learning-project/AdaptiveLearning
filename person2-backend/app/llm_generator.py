"""
LLM content generator — generates each content type in a separate call.
This is more reliable than one giant JSON call.
Model: openai/gpt-oss-20b on Groq
"""

import os, json, random
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

client = Groq(api_key=GROQ_API_KEY)


def _call(prompt: str) -> dict:
    resp = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert educator. Return ONLY valid JSON. "
                    "No markdown, no explanation outside the JSON. "
                    "Use simple English suitable for students with low reading ability."
                )
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
        max_tokens=600,
    )
    return json.loads(resp.choices[0].message.content)


def _gen_explanation(topic: str, subtopic: str, simple: bool = False) -> dict:
    if simple:
        prompt = f"""Return JSON for a SIMPLE explanation of "{subtopic}" (part of {topic}).
Use the easiest words possible. This is shown when a student gets the answer wrong.

{{
  "text": "One sentence only. Explain {subtopic} in the simplest possible way, different from a standard definition.",
  "emoji": "one relevant emoji character"
}}"""
    else:
        prompt = f"""Return JSON for a clear explanation of "{subtopic}" (part of {topic}).

{{
  "text": "Two sentences. First: what {subtopic} is. Second: why it matters or how it works. Use simple words a school student can understand. Be specific and accurate.",
  "emoji": "one relevant emoji character"
}}"""
    return _call(prompt)


def _gen_example(topic: str, subtopic: str) -> dict:
    prompt = f"""Return JSON for a real-world analogy of "{subtopic}" (part of {topic}).

{{
  "text": "One sentence starting with 'It is like ' — use a familiar everyday comparison that makes {subtopic} easy to picture.",
  "emoji": "one relevant emoji character"
}}"""
    return _call(prompt)


def _gen_prerequisite(topic: str, subtopic: str) -> dict:
    prompt = f"""Return JSON for a prerequisite reminder for "{subtopic}" (part of {topic}).

{{
  "text": "One sentence: what simpler concept must a student already know before learning {subtopic}? Be specific.",
  "emoji": "📌"
}}"""
    return _call(prompt)


def _gen_hint(topic: str, subtopic: str) -> dict:
    prompt = f"""Return JSON for a hint about "{subtopic}" (part of {topic}).
The hint helps students answer a question WITHOUT giving away the answer.

{{
  "text": "One sentence that nudges the student toward the correct answer by mentioning a key property of {subtopic}.",
  "emoji": "💡"
}}"""
    return _call(prompt)


def _gen_question(topic: str, subtopic: str, easy: bool = False) -> dict:
    difficulty = "simpler and more direct" if easy else "clear"
    prompt = f"""Return JSON for a {difficulty} multiple-choice question about "{subtopic}" (part of {topic}).

Rules:
- All 4 options must be the same category of thing (e.g. all processes, all devices, all protocols)
- Wrong options must be plausible but clearly incorrect
- Options should be 3-7 words each
- Do NOT repeat the correct answer text in the question itself
- correct = index (0-3) of the correct option

{{
  "text": "The question text here",
  "options": ["correct answer here", "wrong option 2", "wrong option 3", "wrong option 4"],
  "correct": 0,
  "explanation": "One or two sentences explaining why the correct answer is right."
}}"""
    result = _call(prompt)
    # shuffle so correct answer isn't always option A
    if "options" in result and "correct" in result:
        correct_text = result["options"][result["correct"]]
        random.shuffle(result["options"])
        result["correct"] = result["options"].index(correct_text)
    return result


def generate_all(topic: str, subtopic: str) -> dict:
    """Generate all 7 content types for a subtopic. Each is a separate LLM call."""
    results = {}

    calls = [
        ("main_explanation",   lambda: _gen_explanation(topic, subtopic, simple=False)),
        ("simple_explanation", lambda: _gen_explanation(topic, subtopic, simple=True)),
        ("example",            lambda: _gen_example(topic, subtopic)),
        ("prerequisite",       lambda: _gen_prerequisite(topic, subtopic)),
        ("hint",               lambda: _gen_hint(topic, subtopic)),
        ("question",           lambda: _gen_question(topic, subtopic, easy=False)),
        ("easy_question",      lambda: _gen_question(topic, subtopic, easy=True)),
    ]

    for key, fn in calls:
        try:
            results[key] = fn()
        except Exception as e:
            print(f"  [LLM] {key} failed: {e} — using fallback")
            results[key] = _fallback_piece(key, topic, subtopic)

    return results


def _fallback_piece(key: str, topic: str, subtopic: str) -> dict:
    """Per-piece fallback when individual call fails."""
    fallbacks = {
        "main_explanation":  {"text": f"The {subtopic} is a fundamental concept in {topic}. It describes how a specific part of the system organises and handles data.", "emoji": "📚"},
        "simple_explanation":{"text": f"{subtopic} is the part of {topic} that organises how data flows.", "emoji": "💡"},
        "example":           {"text": f"It is like a post office — {subtopic} makes sure each piece of data goes to the right place.", "emoji": "📮"},
        "prerequisite":      {"text": f"Before learning {subtopic}, understand the basic structure of {topic}.", "emoji": "📌"},
        "hint":              {"text": f"Think about what job {subtopic} does and what would break without it.", "emoji": "💡"},
        "question": {
            "text": f"What is the main role of {subtopic} in {topic}?",
            "options": [f"Organises data flow in {topic}", "Stores physical hardware", "Manages user passwords", "Controls screen display"],
            "correct": 0,
            "explanation": f"{subtopic} is responsible for organising data flow within {topic}.",
        },
        "easy_question": {
            "text": f"Does {subtopic} belong to {topic}?",
            "options": ["Yes, it is a core part", "No, it is unrelated", "Only in wireless networks", "Only in older systems"],
            "correct": 0,
            "explanation": f"Yes, {subtopic} is a core part of {topic}.",
        },
    }
    return fallbacks.get(key, {"text": f"Content about {subtopic}", "emoji": "📖"})


def generate_fallback(topic: str, subtopic: str) -> dict:
    """Full fallback when Groq is completely unavailable."""
    return {k: _fallback_piece(k, topic, subtopic) for k in
            ["main_explanation","simple_explanation","example","prerequisite","hint","question","easy_question"]}
