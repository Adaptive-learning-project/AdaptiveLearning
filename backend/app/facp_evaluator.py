"""
facp_evaluator.py — NIMH FACP Protocol Evaluation & Promotion Engine
Maps telemetry and assistance levels into standard FACP codes (+, C, VP, PP, -)
and calculates 80% advancement criteria.
"""

from typing import Dict, Any, List

# Official FACP Evaluation Codes
CODE_INDEPENDENT = "+"  # Yes: Performs independently without any prompt
CODE_CUEING = "C"  # Occasional Cueing: Visual/attentional hint
CODE_VERBAL_PROMPT = "VP"  # Verbal Prompting: Spoken audio instruction replayed
CODE_PHYSICAL_PROMPT = "PP"  # Physical Prompting: Errorless stepdown (distractor removed)
CODE_DEPENDENT = "-"  # No: Incorrect or completely dependent


def classify_facp_code(
        correct: bool,
        active_scaffold: str = "NONE",
        audio_replay_count: int = 0,
) -> str:
    """
    Classifies a student trial into an official NIMH FACP performance code.

    Priority Order:
    1. Incorrect attempt -> "-"
    2. Submitted under Errorless mode (distractor removed) -> "PP"
    3. Submitted with visual cue active -> "C"
    4. Submitted after verbal/audio replay -> "VP"
    5. Clean execution without assistance -> "+"
    """
    if not correct:
        return CODE_DEPENDENT

    if active_scaffold == "ELIMINATE_DISTRACTOR":
        return CODE_PHYSICAL_PROMPT

    if active_scaffold == "HIGHLIGHT_TARGET":
        return CODE_CUEING

    if audio_replay_count > 0 or active_scaffold == "VERBAL_PROMPT":
        return CODE_VERBAL_PROMPT

    return CODE_INDEPENDENT


def calculate_facp_mastery(history: list, window_size: int = 5) -> dict:
    """
    Per NIMH FACP Guidelines:
    - Only Independent (+) and Occasional Cueing (C) count as a pass.
    - VP (Verbal Prompt), PP (Physical Prompt), and (-) do not count as points.
    - 80% qualifying pass rate in the window triggers milestone mastery.
    """
    if not history:
        return {
            "total_attempts": 0,
            "qualifying_passes": 0,
            "pass_percentage": 0,
            "promotion_eligible": False,
        }

    recent_trials = history[-window_size:]

    # Official NIMH Rule: Count only '+' and 'C'
    qualifying_passes = sum(
        1 for t in recent_trials if t.get("facp_code") in ["+", "C"]
    )

    pass_percentage = round((qualifying_passes / len(recent_trials)) * 100, 1)

    return {
        "total_attempts": len(recent_trials),
        "qualifying_passes": qualifying_passes,
        "pass_percentage": pass_percentage,
        "promotion_eligible": pass_percentage >= 80.0 and len(recent_trials) >= 4,
        "breakdown": {
            "+": sum(1 for t in recent_trials if t.get("facp_code") == "+"),
            "C": sum(1 for t in recent_trials if t.get("facp_code") == "C"),
            "VP": sum(1 for t in recent_trials if t.get("facp_code") == "VP"),
            "PP": sum(1 for t in recent_trials if t.get("facp_code") == "PP"),
            "-": sum(1 for t in recent_trials if t.get("facp_code") == "-"),
        }
    }