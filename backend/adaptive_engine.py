def decide_next_activity(mastery_score: int):

    if mastery_score >= 50:
        return {
            "difficulty": "MEDIUM",
            "reason": "READY"
        }

    return {
        "difficulty": "EASY",
        "reason": "NEEDS_SIMPLIFICATION"
    }