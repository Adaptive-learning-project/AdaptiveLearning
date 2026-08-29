from app.database import (
    content_versions_collection,
    questions_collection,
    mastery_state_collection,
    attempts_collection
)


# ============================================================
# CLEAR TEST DATA
# ============================================================

content_versions_collection.delete_many({})

questions_collection.delete_many({})

mastery_state_collection.delete_many({})

attempts_collection.delete_many({})


# ============================================================
# CONTENT
# ============================================================

content_versions_collection.insert_one(
    {
        "content_version_id": 1,
        "subtopic_id": 1,
        "difficulty": "easy",
        "content_text": "Basic arithmetic concepts",
        "hint_text": "Think about adding the two numbers."
    }
)


# ============================================================
# QUESTIONS
# ============================================================

questions_collection.insert_many(
    [

        {
            "question_id": 1,
            "content_version_id": 1,
            "question_text": "What is 2 + 2?",
            "correct_answer": "4"
        },

        {
            "question_id": 2,
            "content_version_id": 1,
            "question_text": "What is 5 + 5?",
            "correct_answer": "10"
        },

        {
            "question_id": 3,
            "content_version_id": 1,
            "question_text": "What is 3 + 4?",
            "correct_answer": "7"
        }

    ]
)


# ============================================================
# FINISHED
# ============================================================

print("======================================")
print("Adaptive Learning seed completed")
print("======================================")

print("Content inserted: 1")

print("Questions inserted: 3")

print("Question 1: What is 2 + 2?")
print("Answer: 4")

print("Question 2: What is 5 + 5?")
print("Answer: 10")

print("Question 3: What is 3 + 4?")
print("Answer: 7")

print("======================================")