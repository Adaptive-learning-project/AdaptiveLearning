import os
import json

from dotenv import load_dotenv
from groq import Groq


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "openai/gpt-oss-120b"
)

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set")

client = Groq(api_key=GROQ_API_KEY)


# ============================================================
# HELPER
# ============================================================

def normalize_interest(interest):
    """
    Converts empty interest into General.
    """

    if interest is None:
        return "General"

    if not isinstance(interest, str):
        interest = str(interest)

    interest = interest.strip()

    if interest == "":
        return "General"

    return interest


# ============================================================
# 1. ADAPTIVE LEARNING EXPLANATION
# ============================================================

def generate_learning_explanation(
    question,
    student_answer,
    correct_answer,
    correct,
    mastery_probability,
    difficulty,
    interest=None
):

    interest = normalize_interest(interest)

    if correct:
        result_type = "The student answered correctly."
    else:
        result_type = "The student answered incorrectly."

    # Difficulty-specific teaching
    if difficulty == "easy":

        difficulty_instruction = """
The student has low mastery.

Use very simple language.
Explain the concept step by step.
Avoid complicated terminology.
Use a small familiar example.
Focus on correcting basic misunderstandings.
"""

    elif difficulty == "medium":

        difficulty_instruction = """
The student has developing mastery.

Give a moderately detailed explanation.
Explain the reasoning behind the answer.
Use a practical example.
Add one small challenge or related idea.
"""

    else:

        difficulty_instruction = """
The student has high mastery.

Keep the explanation concise.
Use more advanced reasoning.
Give a challenging insight, edge case, or variation.
Do not over-explain basic concepts.
"""

    prompt = f"""
You are an adaptive learning tutor.

Question:
{question}

Student answer:
{student_answer}

Correct answer:
{correct_answer}

Result:
{result_type}

Current mastery probability:
{mastery_probability}

Difficulty:
{difficulty}

Student interest:
{interest}

{difficulty_instruction}

IMPORTANT PERSONALIZATION RULE
------------------------------

The student's interest should be used to make explanations easier
to understand through a relevant scenario or example.

The interest MUST NOT replace the educational concept.

For example:

Topic = Programming
Subtopic = Arrays
Interest = Movies

The explanation may use:

- movie ratings
- movie titles
- cinema tickets
- movie watchlists

But the concept being taught must remain ARRAY concepts.

Topic = Mathematics
Subtopic = Linear Equations
Interest = Gaming

The explanation may use:

- game tokens
- game scores
- game purchases

But the concept being taught must remain LINEAR EQUATIONS.

Do NOT simply mention the interest.
Use it meaningfully in the example.

If the answer is wrong:
1. Explain why the student's answer is wrong.
2. Give the correct answer.
3. Explain the concept simply.
4. Give an interest-based example when appropriate.

If the answer is correct:
1. Confirm the answer.
2. Explain why it is correct.
3. Give an interest-based insight appropriate for mastery.

Keep the explanation educational and student-friendly.
Do not change the learning objective.
"""

    try:

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful adaptive learning tutor. "
                        "Teach the exact requested concept while using "
                        "the student's interest to make explanations "
                        "more engaging."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=500
        )

        return response.choices[0].message.content.strip()

    except Exception as e:

        return f"Unable to generate explanation: {str(e)}"


# ============================================================
# 2. GENERATE PERSONALIZED ADAPTIVE QUESTION
# ============================================================

def generate_question(
    topic,
    subtopic,
    difficulty,
    mastery_probability,
    interest=None,
    previous_question=None
):

    interest = normalize_interest(interest)

    # --------------------------------------------------------
    # Difficulty instructions
    # --------------------------------------------------------

    if difficulty == "easy":

        difficulty_instruction = """
Generate a basic question.

Test fundamental understanding of the exact subtopic.

Use:
- simple wording
- small numbers
- direct application
- one main concept

The student should be able to understand the question without
unnecessary complexity.
"""

    elif difficulty == "medium":

        difficulty_instruction = """
Generate a moderately challenging question.

Test application of the exact subtopic.

The student should:
- apply the concept
- perform some reasoning
- work with a realistic scenario
- avoid unnecessary complexity
"""

    else:

        difficulty_instruction = """
Generate a challenging question.

Test deeper understanding of the exact subtopic.

The student should:
- reason about the concept
- solve a multi-step problem when appropriate
- handle a variation or edge case
- demonstrate genuine understanding
"""

    # --------------------------------------------------------
    # Previous question handling
    # --------------------------------------------------------

    if previous_question is None:
        previous_question = "None"

    # --------------------------------------------------------
    # IMPORTANT PROMPT
    # --------------------------------------------------------

    prompt = f"""
You are an expert adaptive learning question generator.

============================================================
STUDENT INFORMATION
============================================================

Topic:
{topic}

Subtopic:
{subtopic}

Student Interest:
{interest}

Mastery Probability:
{mastery_probability}

Difficulty:
{difficulty}

Previous Question:
{previous_question}


============================================================
MAIN OBJECTIVE
============================================================

Generate ONE educational question.

The question MUST test the exact educational concept represented by:

Topic: {topic}
Subtopic: {subtopic}

The student's interest is ONLY the context/scenario.

The interest must NEVER replace the learning objective.


============================================================
CRITICAL PERSONALIZATION REQUIREMENT
============================================================

The student's interest MUST be used INSIDE the actual question.

Do NOT merely return the interest as metadata.

Create a realistic scenario based on the student's interest.

The scenario can contain:

- objects
- characters
- activities
- stories
- data
- real-world situations
- examples

related to the student's interest.

The student should feel that the question was created specifically
for their interest.

BUT:

The actual skill/concept being tested MUST remain exactly the same.


============================================================
EXAMPLE 1: PROGRAMMING + ARRAYS + MOVIES
============================================================

Topic:
Programming

Subtopic:
Arrays

Interest:
Movies

GOOD QUESTION:

"A movie application stores the ratings of five movies in an array:
[4, 5, 3, 2, 5]. What value is stored at index 2?"

Educational concept:
ARRAY INDEXING

Interest:
MOVIES

The student is still learning array indexing.


============================================================
EXAMPLE 2: PROGRAMMING + ARRAYS + GAMING
============================================================

Topic:
Programming

Subtopic:
Arrays

Interest:
Gaming

GOOD QUESTION:

"A game stores the scores of four players in an array:
[120, 250, 180, 300]. What value is stored at index 1?"

Educational concept:
ARRAY INDEXING

Interest:
GAMING


============================================================
EXAMPLE 3: MATHEMATICS + LINEAR EQUATIONS + MOVIES
============================================================

Topic:
Mathematics

Subtopic:
Linear Equations

Interest:
Movies

GOOD QUESTION:

"A cinema charges ₹150 for each movie ticket. If a student spends
₹600, how many tickets did they buy? Form an equation using x and
solve it."

Educational concept:
LINEAR EQUATIONS

Interest:
MOVIES


============================================================
EXAMPLE 4: MATHEMATICS + LINEAR EQUATIONS + GAMING
============================================================

Topic:
Mathematics

Subtopic:
Linear Equations

Interest:
Gaming

GOOD QUESTION:

"A gamer buys several game tokens costing ₹50 each and spends
₹300. Using x as the number of tokens, form and solve the equation."

Educational concept:
LINEAR EQUATIONS

Interest:
GAMING


============================================================
VERY IMPORTANT RULE
============================================================

DO NOT make the question about the interest itself.

For example:

BAD:
"What is your favorite movie?"

This tests MOVIE PREFERENCE.

It does NOT test the requested educational concept.

Instead:

GOOD:
"A movie application stores the ratings [4, 5, 3, 2, 5].
What is the value at index 2?"

This tests ARRAY INDEXING.

Therefore:

INTEREST = CONTEXT

TOPIC + SUBTOPIC = LEARNING OBJECTIVE


============================================================
PERSONALIZATION RULES
============================================================

1. The interest MUST appear naturally in the question scenario.

2. Do not simply mention the word "{interest}".

3. The interest must meaningfully influence the scenario.

4. Keep the question directly related to:
   {topic} / {subtopic}

5. Do NOT change the educational objective.

6. Do NOT introduce an unrelated concept because of the interest.

7. Do NOT make the question unnecessarily complicated because of
   the scenario.

8. The scenario should make the concept easier or more engaging.

9. The scenario should feel natural.

10. If the interest is Coding, programming-related scenarios can be
    used when appropriate.

11. If the interest is Gaming, game-related scenarios can be used
    when appropriate.

12. If the interest is Movies, movie-related scenarios can be used
    when appropriate.

13. Other interests should also be handled naturally.

14. Do not force an interest into a scenario where it does not fit.

15. The question must have a definite correct answer.


============================================================
DIFFICULTY
============================================================

{difficulty_instruction}


============================================================
LEARNING OBJECTIVE
============================================================

The generated question must test:

Topic:
{topic}

Subtopic:
{subtopic}

The learning objective must be more important than the scenario.


============================================================
PREVIOUS QUESTION
============================================================

Previous question:
{previous_question}

If a previous question exists:

- Do not simply repeat it.
- Generate a different question.
- Test the same learning objective.
- You may change the values or scenario.
- Keep the interest-based personalization.


============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Do not return markdown.

Do not return ```json.

Do not return explanations outside JSON.

Return exactly:

{{
    "question": "...",
    "correct_answer": "...",
    "difficulty": "{difficulty}",
    "topic": "{topic}",
    "subtopic": "{subtopic}",
    "interest": "{interest}",
    "learning_objective": "...",
    "personalization": "..."
}}
"""

    try:

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert adaptive learning tutor. "
                        "Generate personalized educational questions. "
                        "The student's interest must affect the scenario "
                        "while the exact educational learning objective "
                        "must remain unchanged. "
                        "Always return valid JSON."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=600,
            response_format={
                "type": "json_object"
            }
        )

        text = response.choices[0].message.content.strip()

        print("\n==============================")
        print("GROQ PERSONALIZED QUESTION")
        print("==============================")
        print(text)
        print("==============================\n")

        result = json.loads(text)

        return {
            "question": result.get("question", ""),
            "correct_answer": result.get("correct_answer", ""),
            "difficulty": difficulty,
            "topic": topic,
            "subtopic": subtopic,
            "interest": interest,
            "learning_objective": result.get(
                "learning_objective",
                subtopic
            ),
            "personalization": result.get(
                "personalization",
                interest
            )
        }

    except Exception as e:

        print("\nQUESTION GENERATION ERROR:")
        print(str(e))

        return {
            "question": "",
            "correct_answer": "",
            "difficulty": difficulty,
            "topic": topic,
            "subtopic": subtopic,
            "interest": interest,
            "learning_objective": subtopic,
            "personalization": interest,
            "error": str(e)
        }


# ============================================================
# 3. DIAGNOSTIC QUESTIONS
# ============================================================

def generate_diagnostic_questions(
    topic,
    subtopic,
    number_of_questions=3,
    interest=None
):

    interest = normalize_interest(interest)

    # Support 1-3 questions
    number_of_questions = max(
        1,
        min(number_of_questions, 3)
    )

    prompt = f"""
You are an expert adaptive learning diagnostic assessment generator.

============================================================
TOPIC
============================================================

{topic}

SUBTOPIC
============================================================

{subtopic}

STUDENT INTEREST
============================================================

{interest}


============================================================
MAIN OBJECTIVE
============================================================

Generate exactly {number_of_questions} diagnostic questions.

The questions must determine how well the student understands:

Topic:
{topic}

Subtopic:
{subtopic}


============================================================
DIFFICULTY LEVELS
============================================================

For 3 questions:

1. Basic understanding - easy
2. Application - medium
3. Reasoning/problem solving - hard

For fewer than 3 questions, use the difficulty levels in order.


============================================================
PERSONALIZATION
============================================================

The student's interest MUST be used as the scenario/context.

Interest:
{interest}

The interest should make the questions engaging.

However:

INTEREST = CONTEXT

TOPIC + SUBTOPIC = LEARNING OBJECTIVE

Do NOT change the educational concept.

Example:

Topic = Programming
Subtopic = Arrays
Interest = Movies

GOOD:

"A movie app stores ratings [4, 5, 3, 2].
What value is stored at index 2?"

The concept is ARRAY INDEXING.

Another example:

Topic = Programming
Subtopic = Arrays
Interest = Gaming

GOOD:

"A game stores player scores [120, 250, 180, 300].
What value is stored at index 1?"

The concept is still ARRAY INDEXING.


============================================================
IMPORTANT
============================================================

Do NOT ask questions about the interest itself.

BAD:
"What is your favorite movie?"

GOOD:
"A movie application stores the ratings of five movies in an
array. What value is stored at index 2?"

The question must evaluate the educational concept.


============================================================
RULES
============================================================

- Every question must have a definite correct answer.
- Every question must directly test the subtopic.
- Use the interest naturally.
- Do not force unrelated scenarios.
- Do not change the educational objective.
- Do not generate explanations.
- Do not generate markdown.
- Return ONLY valid JSON.
- Generate exactly {number_of_questions} questions.


============================================================
OUTPUT
============================================================

Return:

{{
    "topic": "{topic}",
    "subtopic": "{subtopic}",
    "interest": "{interest}",
    "questions": [
        {{
            "question": "...",
            "correct_answer": "...",
            "difficulty": "easy"
        }},
        {{
            "question": "...",
            "correct_answer": "...",
            "difficulty": "medium"
        }},
        {{
            "question": "...",
            "correct_answer": "...",
            "difficulty": "hard"
        }}
    ]
}}
"""

    try:

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You generate personalized diagnostic "
                        "educational questions. "
                        "The interest must be used as context while "
                        "preserving the exact learning objective. "
                        "Always return valid JSON."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=800,
            response_format={
                "type": "json_object"
            }
        )

        text = response.choices[0].message.content.strip()

        print("\n==============================")
        print("GROQ DIAGNOSTIC RESPONSE")
        print("==============================")
        print(text)
        print("==============================\n")

        result = json.loads(text)

        questions = result.get("questions", [])

        if not isinstance(questions, list):
            questions = []

        questions = questions[:number_of_questions]

        valid_questions = []

        for q in questions:

            if not isinstance(q, dict):
                continue

            question_text = q.get("question", "")
            correct_answer = q.get("correct_answer", "")
            difficulty = q.get("difficulty", "")

            if question_text and correct_answer:

                valid_questions.append({
                    "question": question_text,
                    "correct_answer": correct_answer,
                    "difficulty": difficulty
                })

        return {
            "topic": topic,
            "subtopic": subtopic,
            "interest": interest,
            "questions": valid_questions
        }

    except Exception as e:

        print("\nDIAGNOSTIC GENERATION ERROR:")
        print(str(e))

        return {
            "topic": topic,
            "subtopic": subtopic,
            "interest": interest,
            "questions": [],
            "error": str(e)
        }


# ============================================================
# 4. PERSONALIZED LEARNING CONTENT
# ============================================================

def generate_personalized_content(
    topic,
    subtopic,
    difficulty,
    mastery_probability,
    interest=None
):

    interest = normalize_interest(interest)

    prompt = f"""
You are an expert adaptive learning tutor.

Topic:
{topic}

Subtopic:
{subtopic}

Student mastery:
{mastery_probability}

Difficulty:
{difficulty}

Student interest:
{interest}


============================================================
MAIN OBJECTIVE
============================================================

Generate personalized learning content that helps the student
understand the EXACT concept:

{topic} -> {subtopic}


============================================================
PERSONALIZATION
============================================================

Use the student's interest as the scenario for teaching.

INTEREST = CONTEXT

TOPIC + SUBTOPIC = LEARNING OBJECTIVE

For example:

Programming + Arrays + Movies:

Use examples such as:

movie ratings
movie titles
movie watchlists
cinema data

But teach ARRAY concepts.

Programming + Arrays + Gaming:

Use:

player scores
game inventory
game levels

But teach ARRAY concepts.

Mathematics + Linear Equations + Movies:

Use:

movie tickets
cinema prices
box office calculations

But teach LINEAR EQUATIONS.

The interest should help the student understand the concept,
not replace the concept.


============================================================
DIFFICULTY
============================================================

If easy:

- Use simple language.
- Teach step by step.
- Use a simple interest-based example.
- Focus on fundamentals.

If medium:

- Give moderate explanation.
- Use a practical interest-based example.
- Explain reasoning.
- Include a small challenge.

If hard:

- Give concise explanation.
- Use deeper reasoning.
- Include an edge case or variation.
- Provide challenging practice.


============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Return exactly:

{{
    "explanation": "...",
    "example": "...",
    "key_takeaway": "...",
    "practice_question": "..."
}}
"""

    try:

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You generate personalized adaptive learning "
                        "content. Use student interests as context "
                        "while preserving the exact educational "
                        "learning objective. Always return JSON."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=700,
            response_format={
                "type": "json_object"
            }
        )

        text = response.choices[0].message.content.strip()

        print("\n==============================")
        print("GROQ PERSONALIZED CONTENT")
        print("==============================")
        print(text)
        print("==============================\n")

        return json.loads(text)

    except Exception as e:

        print("PERSONALIZED CONTENT ERROR:")
        print(str(e))

        return {
            "explanation": "",
            "example": "",
            "key_takeaway": "",
            "practice_question": "",
            "error": str(e)
        }


# ============================================================
# 5. HYBRID ADAPTIVE CONTENT
# ============================================================

def generate_hybrid_content(
    topic,
    subtopic,
    mastery_probability,
    previous_question=None,
    interest=None
):

    interest = normalize_interest(interest)

    # --------------------------------------------------------
    # BKT / RULE-BASED DECISION
    # --------------------------------------------------------

    if mastery_probability < 0.40:

        difficulty = "easy"
        status = "NEEDS_REMEDIATION"
        reason = (
            "Low mastery; provide easier/remedial content"
        )

    elif mastery_probability < 0.70:

        difficulty = "medium"
        status = "CONTINUE"
        reason = (
            "Developing mastery; continue with moderate content"
        )

    else:

        difficulty = "hard"
        status = "MASTERED"
        reason = (
            "High mastery; provide challenging content"
        )

    # --------------------------------------------------------
    # GROQ PERSONALIZED QUESTION
    # --------------------------------------------------------

    question = generate_question(
        topic=topic,
        subtopic=subtopic,
        difficulty=difficulty,
        mastery_probability=mastery_probability,
        interest=interest,
        previous_question=previous_question
    )

    # --------------------------------------------------------
    # GROQ PERSONALIZED LEARNING CONTENT
    # --------------------------------------------------------

    personalized_content = generate_personalized_content(
        topic=topic,
        subtopic=subtopic,
        difficulty=difficulty,
        mastery_probability=mastery_probability,
        interest=interest
    )

    # --------------------------------------------------------
    # FINAL HYBRID RESULT
    # --------------------------------------------------------

    return {
        "topic": topic,
        "subtopic": subtopic,

        "mastery_probability": mastery_probability,

        "mastery_percentage": round(
            mastery_probability * 100
        ),

        "difficulty": difficulty,

        "status": status,

        "reason": reason,

        "source": "BKT + Rule-based Decision + Groq",

        "student_interest": interest,

        "previous_question": previous_question,

        "generated_question": question,

        "personalized_content": personalized_content
    }