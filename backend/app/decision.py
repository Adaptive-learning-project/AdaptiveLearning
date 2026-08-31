

def determine_difficulty(mastery_probability: float) -> str:
    """
    Determine the appropriate difficulty based on BKT mastery.

    < 0.40  -> easy
    < 0.70  -> medium
    >= 0.70 -> hard
    """

    if mastery_probability < 0.40:
        return "easy"

    elif mastery_probability < 0.70:
        return "medium"

    else:
        return "hard"


def determine_status(mastery_probability: float) -> str:
    """
    Determine student's learning status.
    """

    if mastery_probability >= 0.85:
        return "MASTERED"

    elif mastery_probability < 0.40:
        return "NEEDS_REMEDIATION"

    else:
        return "CONTINUE"


def create_decision(
    student_id: int,
    subtopic_id: int,
    mastery_probability: float
) -> dict:
    """
    Create an adaptive learning decision.
    """

    difficulty = determine_difficulty(
        mastery_probability
    )

    status = determine_status(
        mastery_probability
    )

    if status == "MASTERED":
        reason = "Student has mastered the subtopic"

    elif status == "NEEDS_REMEDIATION":
        reason = "Low mastery; provide easier/remedial content"

    else:
        reason = "Continue learning with appropriate difficulty"

    return {
        "student_id": student_id,
        "subtopic_id": subtopic_id,
        "mastery_probability": mastery_probability,
        "difficulty": difficulty,
        "status": status,
        "reason": reason
    }