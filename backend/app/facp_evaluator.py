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

    if audio_replay_count > 0:
        return CODE_VERBAL_PROMPT

    return CODE_INDEPENDENT


def calculate_facp_mastery(history: List[Dict[str, Any]], window_size: int = 5) -> Dict[str, Any]:
    """
    Evaluates whether the student meets the NIMH 80% criterion on the active node.
    Per FACP rules: Only '+' and 'C' count as passing items toward the 80% threshold.
    VP, PP, and '-' are recorded for programming, but do not contribute pass points.
    """
    if not history:
        return {
            "total_attempts": 0,
            "counts": {"+": 0, "C": 0, "VP": 0, "PP": 0, "-": 0},
            "qualifying_passes": 0,
            "pass_percentage": 0.0,
            "promotion_eligible": False,
        }

    # Focus on the most recent interaction window for active mastery verification
    recent_trials = history[-window_size:]
    total = len(recent_trials)

    counts = {"+": 0, "C": 0, "VP": 0, "PP": 0, "-": 0}
    for item in recent_trials:
        code = item.get("facp_code", "-")
        if code in counts:
            counts[code] += 1
        else:
            counts["-"] += 1

    # NIMH Rule: Only '+' and 'C' count for quantification
    qualifying_passes = counts[CODE_INDEPENDENT] + counts[CODE_CUEING]
    pass_percentage = round((qualifying_passes / total) * 100.0, 1)

    # 80% pass criteria required for promotion
    promotion_eligible = pass_percentage >= 80.0 and total >= 3

    return {
        "total_attempts": total,
        "counts": counts,
        "qualifying_passes": qualifying_passes,
        "pass_percentage": pass_percentage,
        "promotion_eligible": promotion_eligible,
    }