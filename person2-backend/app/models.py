def create_content_version(
    content_version_id: int,
    subtopic_id: int,
    difficulty: str,
    content_text: str
):
    return {
        "content_version_id": content_version_id,
        "subtopic_id": subtopic_id,
        "difficulty": difficulty,
        "content_text": content_text
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
    mastery_score: int = 0
):
    return {
        "student_id": student_id,
        "subtopic_id": subtopic_id,
        "mastery_score": mastery_score
    }