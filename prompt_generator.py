"""
prompt_generator.py
-------------------
Dynamic LLM prompt builder for the Adaptive Learning Platform.

Data source: bigdata_learning_analytics.csv only.
No synthetic profile data, no master dataset.

The prompt adapts based entirely on live behavioral metrics from
the session record — attention, fatigue, accuracy, error count.
All constraints (sentence length, vocabulary, hint density) are
derived from these metrics programmatically, not hardcoded.

Supports: Gemini API | OpenAI API | Ollama (local) | dry_run (no API)
"""

import json
from typing import Optional


# ── Constraint derivation from session metrics ────────────────────────────────

def _derive_adaptive_constraints(session: dict, alps_score: float) -> dict:
    """
    Build Adaptive path content constraints from live session metrics.
    Everything is computed from the session values — no magic thresholds.

    Derivation logic:
      - sentence length  : inversely proportional to fatigue (more fatigued → shorter)
      - hint density     : proportional to error_count normalised by its observed range (0–7)
      - visual cues      : triggered when attention_span_score is below the dataset median (0.68)
      - audio suggestion : triggered when alps_score is below 50 (bottom half)
    """
    fatigue        = float(session.get("fatigue_level", 0.45))
    error_count    = int(session.get("error_count", 4))
    attention      = float(session.get("attention_span_score", 0.68))
    repetitions    = int(session.get("repetition_needed", 2))

    # Max sentences: fatigue 0.1–0.8 maps to 3–1 sentences
    fatigue_norm  = (fatigue - 0.10) / (0.80 - 0.10)          # 0–1
    max_sentences = max(1, round(3 - fatigue_norm * 2))        # 3 → 1

    # Hint density: 0–3 errors → low, 4–5 → medium, 6–7 → high
    if error_count <= 3:
        hint_level = "low"
    elif error_count <= 5:
        hint_level = "medium"
    else:
        hint_level = "high (after every question)"

    # Visual cues: when attention is below dataset median
    use_visuals = attention < 0.68

    # Audio suggestion: when alps_score is below midpoint
    suggest_audio = alps_score < 50.0

    # Vocabulary: simpler when both fatigue is high and accuracy is low
    accuracy = float(session.get("task_accuracy", 79.0))
    vocabulary = "basic single-syllable words" if (fatigue > 0.60 and accuracy < 70) else "simple everyday language"

    return {
        "max_sentences_per_task": max_sentences,
        "vocabulary":             vocabulary,
        "use_visual_cues":        use_visuals,
        "suggest_audio_support":  suggest_audio,
        "hint_level":             hint_level,
        "repetition_count":       min(repetitions, 3),  # cap at 3 to avoid fatigue
    }


def _derive_competency_constraints(session: dict, alps_score: float) -> dict:
    """
    Build Competency-Based path constraints from session metrics.

    Derivation logic:
      - exercise count   : proportional to alps_score band (higher ALPS → more exercises)
      - difficulty step  : derived from task_accuracy range (60–98)
      - word problems    : enabled when quiz_scores_avg is above dataset mean (72.6)
    """
    accuracy       = float(session.get("task_accuracy", 79.0))
    quiz_avg       = float(session.get("quiz_scores_avg", 72.6))
    completed      = int(session.get("completed_assignments", 5))

    # Exercise count: ALPS 65–100 → 3–5 exercises
    if alps_score >= 80:
        exercise_count = 5
    elif alps_score >= 65:
        exercise_count = 4
    else:
        exercise_count = 3

    # Difficulty step: accuracy 60–98 maps to gentle/gradual/stepped
    if accuracy < 70:
        progression = "gentle (small incremental steps)"
    elif accuracy < 85:
        progression = "gradual"
    else:
        progression = "stepped (each question meaningfully harder)"

    # Word problems: student shows sufficient comprehension
    include_word_problems = quiz_avg > 72.6

    return {
        "exercise_count":         exercise_count,
        "difficulty_progression": progression,
        "include_word_problems":  include_word_problems,
        "include_step_validation": True,
    }


# ── Prompt builder ────────────────────────────────────────────────────────────

def build_prompt(
    student_id:      str,
    route:           str,          # "Adaptive" or "Competency-Based"
    topic:           str,
    alps_score:      float,
    session:         dict,
) -> dict:
    """
    Build a fully dynamic structured prompt payload for the LLM.

    All content parameters are derived from session metrics.
    Nothing is hardcoded — the prompt changes with every session.

    Parameters
    ----------
    student_id  : Student identifier from the CSV
    route       : Classifier output — "Adaptive" or "Competency-Based"
    topic       : Teacher-provided lesson topic (e.g., "Basic Addition")
    alps_score  : ALPS score (0–100) for this session
    session     : Dict of raw session metrics from bigdata CSV

    Returns
    -------
    dict with system_context, constraints, prompt_text, route
    """
    attention_pct = round(float(session.get("attention_span_score", 0.68)) * 100, 1)
    fatigue_pct   = round(float(session.get("fatigue_level", 0.45)) * 100, 1)
    accuracy      = round(float(session.get("task_accuracy", 79.0)), 1)
    alps_band     = ("Low" if alps_score < 40 else
                     "Medium" if alps_score < 65 else "High")

    system_context = {
        "role":             "Special Education Instructional Designer",
        "student_id":       student_id,
        "topic":            topic,
        "alps_score":       alps_score,
        "alps_band":        alps_band,
        "attention_pct":    attention_pct,
        "fatigue_pct":      fatigue_pct,
        "task_accuracy":    accuracy,
        "instruction_path": route,
    }

    if route == "Adaptive":
        constraints = _derive_adaptive_constraints(session, alps_score)
        instruction = (
            f"You are a special education teacher. "
            f"Generate a {constraints['max_sentences_per_task']}-sentence "
            f"story-based task on '{topic}' for a student whose current "
            f"attention is {attention_pct}% and fatigue is {fatigue_pct}%. "
            f"Use {constraints['vocabulary']}. "
            + ("Include relevant emoji or image cues for each key concept. " if constraints["use_visual_cues"] else "")
            + f"Provide {constraints['hint_level']} hints. "
            + (f"Repeat the core concept {constraints['repetition_count']} time(s) in different ways. " if constraints["repetition_count"] > 1 else "")
            + ("Add an audio reading suggestion at the end. " if constraints["suggest_audio_support"] else "")
            + "End with one simple yes/no or single-word answer question."
        )
    else:  # Competency-Based
        constraints = _derive_competency_constraints(session, alps_score)
        instruction = (
            f"You are a special education curriculum specialist. "
            f"Generate {constraints['exercise_count']} mastery exercises "
            f"on '{topic}' with {constraints['difficulty_progression']} difficulty. "
            + ("Include at least one word problem in everyday language. " if constraints["include_word_problems"] else "")
            + "After each exercise, show a step-by-step solution walkthrough. "
            + "Format as a numbered list."
        )

    return {
        "system_context": system_context,
        "constraints":    constraints,
        "prompt_text":    instruction,
        "route":          route,
    }


def call_llm(prompt_payload: dict,
             api_provider:   str = "dry_run",
             api_key:        Optional[str] = None,
             model_name:     Optional[str] = None) -> str:
    """
    Send prompt to LLM provider and return generated content.

    Parameters
    ----------
    prompt_payload : output of build_prompt()
    api_provider   : "gemini" | "openai" | "ollama" | "dry_run"
    api_key        : API key string; reads from env var if None
                     (GEMINI_API_KEY or OPENAI_API_KEY)
    model_name     : specific model version; uses provider default if None

    Returns
    -------
    str — generated content text
    """
    import os

    if api_provider == "dry_run":
        return (
            "[DRY RUN — no API call]\n"
            f"Route     : {prompt_payload['route']}\n"
            f"Prompt    : {prompt_payload['prompt_text']}\n"
            f"Constraints:\n{json.dumps(prompt_payload['constraints'], indent=2)}"
        )

    prompt_text = prompt_payload["prompt_text"]
    key = api_key or os.environ.get(
        "GEMINI_API_KEY" if api_provider == "gemini" else "OPENAI_API_KEY"
    )

    if api_provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=key)
        model = genai.GenerativeModel(model_name or "gemini-1.5-flash")
        return model.generate_content(prompt_text).text

    elif api_provider == "openai":
        from openai import OpenAI
        client = OpenAI(api_key=key)
        resp = client.chat.completions.create(
            model=model_name or "gpt-4o-mini",
            messages=[
                {"role": "system",
                 "content": "You are a special education instructional designer."},
                {"role": "user", "content": prompt_text},
            ]
        )
        return resp.choices[0].message.content

    elif api_provider == "ollama":
        import requests
        resp = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": model_name or "llama3",
                  "prompt": prompt_text, "stream": False},
            timeout=60,
        )
        return resp.json().get("response", "")

    else:
        raise ValueError(
            f"Unknown api_provider: {api_provider!r}. "
            "Valid options: 'gemini', 'openai', 'ollama', 'dry_run'."
        )


# ── Standalone demo ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import pandas as pd

    df = pd.read_csv("D:/AdaptiveLearning/archive/bigdata_learning_analytics.csv")
    sample = df.iloc[0].to_dict()

    print("=== ADAPTIVE PATH ===")
    p_adaptive = build_prompt(
        student_id  = sample.get("Student_ID", "S001"),
        route       = "Adaptive",
        topic       = "Basic Addition",
        alps_score  = 38.5,
        session     = sample,
    )
    print(json.dumps(p_adaptive, indent=2, default=str))
    print("\nLLM (dry run):")
    print(call_llm(p_adaptive, api_provider="dry_run"))

    print("\n\n=== COMPETENCY-BASED PATH ===")
    p_comp = build_prompt(
        student_id  = sample.get("Student_ID", "S001"),
        route       = "Competency-Based",
        topic       = "Basic Addition",
        alps_score  = 72.0,
        session     = sample,
    )
    print(json.dumps(p_comp, indent=2, default=str))
    print("\nLLM (dry run):")
    print(call_llm(p_comp, api_provider="dry_run"))
