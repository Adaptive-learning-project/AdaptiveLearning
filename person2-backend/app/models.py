# ============================================================
# MONGODB DOCUMENT HELPERS
# ============================================================


def create_content_version(
    content_version_id: int,
    subtopic_id: int,
    difficulty: str,
    content_text: str,
    hint_text: str = ""
):

    return {
        "content_version_id": content_version_id,
        "subtopic_id": subtopic_id,
        "difficulty": difficulty,
        "content_text": content_text,
        "hint_text": hint_text
    }


def create_question(
    question_id: int,
    content_version_id: int,
    question_text: str,
    correct_answer: str
):

    return {
        "question_id": question_id,
        "content_version_id": content_version_id,
        "question_text": question_text,
        "correct_answer": correct_answer
    }


def create_mastery_state(
    student_id: int,
    subtopic_id: int,
    mastery_probability: float = 0.10
):

    return {
        "student_id": student_id,
        "subtopic_id": subtopic_id,
        "mastery_probability": mastery_probability
    }


def create_attempt(
    student_id: int,
    question_id: int,
    subtopic_id: int,
    correct: bool,
    previous_mastery: float,
    new_mastery: float
):

    return {
        "student_id": student_id,
        "question_id": question_id,
        "subtopic_id": subtopic_id,
        "correct": correct,
        "previous_mastery": previous_mastery,
        "new_mastery": new_mastery
    }