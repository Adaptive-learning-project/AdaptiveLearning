from app.database import (
    content_versions_collection,
    questions_collection,
    mastery_state_collection
)


# -----------------------------------------
# Clear old test data
# -----------------------------------------

content_versions_collection.delete_many({})

questions_collection.delete_many({})

mastery_state_collection.delete_many({})


# -----------------------------------------
# Insert content
# -----------------------------------------

content_versions_collection.insert_one(
    {
        "content_version_id": 1,
        "subtopic_id": 1,
        "difficulty": "easy",
        "content_text": "Basic arithmetic concepts"
    }
)


# -----------------------------------------
# Insert question
# -----------------------------------------

questions_collection.insert_one(
    {
        "question_id": 1,
        "content_version_id": 1,
        "question_text": "What is 2 + 2?",
        "correct_answer": "4"
    }
)


# -----------------------------------------
# Insert second question
# -----------------------------------------

questions_collection.insert_one(
    {
        "question_id": 2,
        "content_version_id": 1,
        "question_text": "What is 5 + 5?",
        "correct_answer": "10"
    }
)


print("===================================")
print("Test data inserted successfully")
print("===================================")

print("Question 1: What is 2 + 2?")
print("Correct answer: 4")

print("Question 2: What is 5 + 5?")
print("Correct answer: 10")