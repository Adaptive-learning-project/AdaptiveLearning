"""
Rule-based adaptive engine.

Core rules:
- 1 correct answer = concept understood → move to next subtopic
- Wrong answer triggers a SUPPORT sequence (NOT difficulty drop):
    attempt 1 wrong → auto-show hint + retry same question
    attempt 2 wrong → show simple_explanation + easy_question
    attempt 3 wrong → show example (analogy) + easy_question
    attempt 4 wrong → show prerequisite + easy_question
    attempt 5 wrong → escalate to teacher
"""


def decide(consecutive_wrong: int) -> dict:
    """
    Called AFTER a wrong answer to decide what support to show next.
    consecutive_wrong = how many times wrong IN A ROW on current subtopic.

    Returns:
        action:           what the engine is doing
        content_type:     which content piece to fetch from DB
        question_type:    "question" | "easy_question"
        show_hint:        whether to auto-show hint
        message:          short friendly UI message (read aloud)
    """

    if consecutive_wrong >= 5:
        return {
            "action":        "escalate",
            "content_type":  "prerequisite",
            "question_type": "easy_question",
            "show_hint":     True,
            "message":       "Great effort! Your teacher will help you with this one 🙌",
        }

    if consecutive_wrong == 4:
        return {
            "action":        "prerequisite",
            "content_type":  "prerequisite",
            "question_type": "easy_question",
            "show_hint":     True,
            "message":       "Let's go back to the basics first 📖",
        }

    if consecutive_wrong == 3:
        return {
            "action":        "example",
            "content_type":  "example",
            "question_type": "easy_question",
            "show_hint":     True,
            "message":       "Let me show you a real-world example 💡",
        }

    if consecutive_wrong == 2:
        return {
            "action":        "reteach",
            "content_type":  "simple_explanation",
            "question_type": "easy_question",
            "show_hint":     True,
            "message":       "Let me explain this a different way 🔄",
        }

    if consecutive_wrong == 1:
        # First wrong: show hint, retry same question
        return {
            "action":        "hint",
            "content_type":  "main_explanation",   # keep same content
            "question_type": "question",            # same question
            "show_hint":     True,                  # auto-reveal hint
            "message":       "Not quite — here's a hint to help you 💬",
        }

    # consecutive_wrong == 0 means correct — caller should handle this
    return {
        "action":        "correct",
        "content_type":  "main_explanation",
        "question_type": "question",
        "show_hint":     False,
        "message":       "Correct! Moving on 🎉",
    }
