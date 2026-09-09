"""
telemetry_engine.py — Psycho-Motor Affective Governor & Cognitive De-escalation
"""

import os
import json
from pydantic import BaseModel
from typing import List, Optional
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
groq_client = Groq(api_key=GROQ_API_KEY)

# Threshold Constants for Intellectually Disabled Learner Profiles
RAGE_CLICK_INTERVAL_MS = 450  # Rapid taps indicating motor frustration
RAGE_CLICK_MIN_COUNT = 10  # Consecutive rapid clicks
HESITATION_THRESHOLD_SEC = 25.0  # Prolonged freeze / cognitive paralysis
FATIGUE_SESSION_LIMIT_SEC = 3600  # 1 hour limit


class TelemetryPayload(BaseModel):
    student_id: str
    subtopic_id: str
    question_text: str
    click_timestamps: List[int]  # Epoch millis of all screen taps
    option_switch_count: int  # Count of option changes
    time_spent_seconds: float  # Time spent on the current question
    total_session_seconds: float  # Cumulative student session time


def evaluate_affective_state(data: TelemetryPayload) -> dict:
    """
    Evaluates raw interaction dynamics against motor/affective struggle markers.
    Logs transparent diagnostic output to the backend terminal.
    """
    print("\n" + "=" * 60)
    print(f"🔍 [AFFECTIVE GOVERNOR] Evaluating Telemetry for Student: {data.student_id}")
    print(f"   • Time on card: {data.time_spent_seconds:.1f}s | Session: {data.total_session_seconds:.0f}s")
    print(f"   • Taps registered: {len(data.click_timestamps)} | Option toggles: {data.option_switch_count}")

    is_rage_clicking = False
    is_hesitating = False
    is_fatigued = False

    # 1. Analyze Inter-Tap Intervals (Rage/Frustration Detection)
    if len(data.click_timestamps) >= RAGE_CLICK_MIN_COUNT:
        rapid_intervals = 0
        for i in range(1, len(data.click_timestamps)):
            interval = data.click_timestamps[i] - data.click_timestamps[i - 1]
            if interval <= RAGE_CLICK_INTERVAL_MS:
                rapid_intervals += 1

        if rapid_intervals >= (RAGE_CLICK_MIN_COUNT - 1):
            is_rage_clicking = True
            print(f"   🚨 [TRIGGER] Rapid Motor Flutter / Rage Clicks Detected! ({rapid_intervals} burst taps)")

    # 2. Analyze Hesitation / Freezing
    if data.time_spent_seconds >= HESITATION_THRESHOLD_SEC and data.option_switch_count == 0:
        is_hesitating = True
        print(f"   ⚠️  [TRIGGER] Cognitive Inactivity / Attention Freeze Detected (> {HESITATION_THRESHOLD_SEC}s)")

    # 3. Analyze Fatigue
    if data.total_session_seconds >= FATIGUE_SESSION_LIMIT_SEC:
        is_fatigued = True
        print("   💤 [TRIGGER] Prolonged Session Fatigue Detected (> 1 hour)")

    needs_intervention = is_rage_clicking or is_hesitating or is_fatigued

    if needs_intervention:
        trigger_reason = "rage_click" if is_rage_clicking else ("hesitation" if is_hesitating else "fatigue")
        print(f"   🛡️  [INTERVENTION ACTIVATED] Reason: {trigger_reason.upper()}")
    else:
        trigger_reason = "normal"
        print("   ✅ [STATUS] Motor telemetry within calm operational bounds.")
    print("=" * 60 + "\n")

    return {
        "needs_intervention": needs_intervention,
        "trigger_reason": trigger_reason,
        "is_fatigued": is_fatigued,
        "prompt_audio": "Hey, take a breath. Do you feel this is difficult?",
    }


def generate_cognitive_deescalation(subtopic: str, question_text: str) -> dict:
    """
    Uses Groq to step down the cognitive load (CRA Concrete-Representational Tier):
    Transforms abstract C++ questions into an intuitive visual story with 2 large binary options.
    """
    print(f"⚡ [GROQ DE-ESCALATION] Synthesizing simplified concrete model for: '{subtopic}'")

    prompt = f"""You are a patient special-education tutor assisting a student with learning disabilities.
The student is feeling overwhelmed by this abstract question:
"{question_text}"
Topic: "{subtopic}"

Task:
De-escalate the cognitive load using the Concrete-Representational-Abstract (CRA) model.
1. Formulate a 2-sentence everyday visual story/analogy (e.g. using color boxes, locked toy doors, or traffic rules).
2. Give 1 super-simplified question testing this analogy.
3. Provide only TWO simple, clear options (A and B).
4. Identify which option is correct (0 or 1).

Return ONLY valid JSON matching this schema:
{{
  "comforting_message": "Let's take it easy. Think of this like...",
  "visual_analogy": "<2 sentence real-world visual picture>",
  "simplified_question": "<1 clear question using the analogy>",
  "options": ["<Option 1>", "<Option 2>"],
  "correct": 0,
  "encouragement": "You're doing great! Take all the time you need."
}}"""

    try:
        resp = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system",
                 "content": "You provide cognitive de-escalation for neurodiverse learners. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=800
        )
        data = json.loads(resp.choices[0].message.content.strip())
        print("   ✅ De-escalation package synthesized successfully.")
        return data
    except Exception as e:
        print(f"   ❌ Groq de-escalation fallback invoked: {e}")
        return {
            "comforting_message": "Let's take it step by step.",
            "visual_analogy": "Imagine a red box that only fits small round balls, and a blue box for big square blocks.",
            "simplified_question": "If you have a round ball, which box does it go into?",
            "options": ["The Red Round Box", "The Blue Square Box"],
            "correct": 0,
            "encouragement": "Nice and easy! You've got this."
        }