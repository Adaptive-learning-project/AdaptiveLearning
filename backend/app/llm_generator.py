"""
llm_generator.py — Pedagogical C++ generator with tagged difficulty levels and question pools.
"""

import json
import os
import random
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

client = Groq(api_key=GROQ_API_KEY)

SYSTEM_PROMPT = """\
You are an expert C++ Computer Science educator.
Generate high-quality adaptive learning units with structured difficulty metadata.
Rules:
- Explanations must be complete, instructive, and free of meta template headings.
- "diagnostic_question" must be labeled difficulty "easy".
- "easy_questions" must all be labeled difficulty "easy".
- "standard_questions" MUST be ordered with strictly increasing difficulty:
    * Index 0: "easy-medium" (direct code reading/output check)
    * Index 1: "medium" (logic flow or return resolution)
    * Index 2: "medium-hard" (subtle edge condition or overload disambiguation)
- "hard_question" must be labeled difficulty "hard".
- Return ONLY valid JSON matching the schema.
"""

def generate_all(topic: str, subtopic: str, reference_text: str = "", all_subtopics: list[str] | None = None) -> dict:
    prior = [s for s in (all_subtopics or []) if s != subtopic]
    prior_str = ", ".join(prior[:2]) if prior else f"basics of {topic}"

    user_prompt = f"""Generate an adaptive C++ learning package for "{subtopic}" (Course/Topic: "{topic}").
Prior context: {prior_str}.
Reference material: {reference_text.strip() or "Standard Modern C++ (C++17/20)"}.

JSON Schema:
{{
  "overview": {{
    "what_we_know": "Recall {prior_str}.",
    "what_we_study": "1 sentence defining {subtopic}.",
    "expected_outcome": "1 sentence on practical capability mastered."
  }},
  "main_explanation": {{
    "text": "4 clean, informative sentences explaining {subtopic}, syntax rules, compiler checks, and memory behaviors without template labels.",
    "code_snippet": "// 5-8 lines of clean, compilable standard C++ code\\n",
    "takeaway": "1-line golden rule."
  }},
  "simple_explanation": {{
    "text": "2-sentence real-world analogy."
  }},
  "example": {{
    "text": "2-sentence software engineering application."
  }},
  "prerequisite": {{
    "text": "Sentence 1: Prerequisite concept. Sentence 2: Why {subtopic} fails without it."
  }},
  "hint": {{
    "text": "Targeted diagnostic clue reinforcing the rule without stating the option index."
  }},
  "diagnostic_question": {{
    "text": "Readiness diagnostic question for {subtopic}:",
    "difficulty": "easy",
    "options": ["Correct", "Distractor 1", "Distractor 2", "Distractor 3"],
    "correct": 0,
    "explanation": "Why this tests prerequisite readiness."
  }},
  "easy_questions": [
    {{
      "text": "Syntax/rule question 1:",
      "difficulty": "easy",
      "options": ["Correct", "Distractor 1", "Distractor 2", "Distractor 3"],
      "correct": 0,
      "explanation": "Rule rationale."
    }},
    {{
      "text": "Syntax/rule question 2:",
      "difficulty": "easy",
      "options": ["Correct", "Distractor 1", "Distractor 2", "Distractor 3"],
      "correct": 0,
      "explanation": "Rule rationale."
    }},
    {{
      "text": "Syntax/rule question 3:",
      "difficulty": "easy",
      "options": ["Correct", "Distractor 1", "Distractor 2", "Distractor 3"],
      "correct": 0,
      "explanation": "Rule rationale."
    }}
  ],
  "standard_questions": [
    {{
      "text": "Direct output tracing of the code snippet:",
      "difficulty": "easy-medium",
      "options": ["Correct output", "Distractor 1", "Distractor 2", "Distractor 3"],
      "correct": 0,
      "explanation": "Step-by-step execution."
    }},
    {{
      "text": "Behavioral prediction when inputs or types are altered:",
      "difficulty": "medium",
      "options": ["Correct outcome", "Distractor 1", "Distractor 2", "Distractor 3"],
      "correct": 0,
      "explanation": "Resolution mechanics."
    }},
    {{
      "text": "Deep resolution question testing parameter binding or overload rules:",
      "difficulty": "medium-hard",
      "options": ["Correct outcome", "Distractor 1", "Distractor 2", "Distractor 3"],
      "correct": 0,
      "explanation": "Detailed standard breakdown."
    }}
  ],
  "hard_question": {{
    "text": "Code modification introducing an edge-case bug or compiler error:",
    "difficulty": "hard",
    "options": ["Accurate diagnosis", "Distractor 1", "Distractor 2", "Distractor 3"],
    "correct": 0,
    "explanation": "In-depth standard C++ explanation."
  }}
}}"""

    try:
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.25,
            response_format={"type": "json_object"},
            max_tokens=3200,
        )
        data = json.loads(resp.choices[0].message.content.strip())

        # Shuffle options while preserving structure and difficulty tags
        for k in ["diagnostic_question", "hard_question"]:
            if k in data and isinstance(data[k], dict):
                data[k] = _shuffle_options(data[k])

        for pool in ["easy_questions", "standard_questions"]:
            if pool in data and isinstance(data[pool], list):
                data[pool] = [_shuffle_options(q) for q in data[pool] if isinstance(q, dict)]

        return data
    except Exception as exc:
        print(f"[Generator] Call failed: {exc} — invoking fallback.")
        return generate_fallback(topic, subtopic)

def _shuffle_options(q: dict) -> dict:
    if "options" in q and "correct" in q:
        try:
            correct_val = q["options"][int(q["correct"])]
            random.shuffle(q["options"])
            q["correct"] = q["options"].index(correct_val)
        except Exception:
            pass
    return q

def generate_fallback(topic: str, subtopic: str) -> dict:
    return {
        "overview": {
            "what_we_know": f"You understand fundamental principles in {topic}.",
            "what_we_study": f"We explore {subtopic} and how standard C++ handles execution.",
            "expected_outcome": f"Implement and debug {subtopic} confidently."
        },
        "main_explanation": {
            "text": (
                f"{subtopic} provides essential modularity and interface contracts in modern C++.\n"
                "The compiler verifies all calls and types at compile-time to maintain strict type safety.\n"
                "Methods and operators must adhere strictly to declaration signatures and scope limits.\n"
                "Understanding these mechanics prevents costly runtime errors and undefined behavior."
            ),
            "code_snippet": (
                "#include <iostream>\n\n"
                "class Demo {\n"
                "public:\n"
                "    void execute(int x) { std::cout << x * 2; }\n"
                "    void execute(double x) { std::cout << x + 1.5; }\n"
                "};\n\n"
                "int main() {\n"
                "    Demo d;\n"
                "    d.execute(5);\n"
                "    return 0;\n"
                "}"
            ),
            "takeaway": f"Properly declare and match parameter signatures for {subtopic}."
        },
        "simple_explanation": {
            "text": f"Think of {subtopic} like a multi-tool: the core handle is constant, but the specific tool engaged depends on the task at hand."
        },
        "example": {
            "text": "Game and physics engines rely on this to route input actions and coordinate transformations seamlessly."
        },
        "prerequisite": {
            "text": f"Familiarity with foundational C++ data types, functions, and scoping rules is required for {subtopic}."
        },
        "hint": {
            "text": "Check parameter count and exact type signatures to predict compiler resolution."
        },
        "diagnostic_question": {
            "text": f"What is a primary compile-time check enforced for {subtopic}?",
            "difficulty": "easy",
            "options": ["Signature and type matching", "Automatic variable allocation", "Dynamic garbage cleanup", "Heap fragmentation checks"],
            "correct": 0,
            "explanation": "C++ checks function signatures and types at compile time."
        },
        "easy_questions": [
            {
                "text": "Which condition must be met to satisfy C++ signature matching?",
                "difficulty": "easy",
                "options": ["Parameter types, count, or order must differ", "Return types alone must differ", "Function names must be distinct", "Variables must be global"],
                "correct": 0,
                "explanation": "Signatures depend on parameter types, order, and count."
            },
            {
                "text": "When are standard static overloads resolved?",
                "difficulty": "easy",
                "options": ["At compile time", "During runtime dispatch", "After program exit", "Inside the OS loader"],
                "correct": 0,
                "explanation": "Static resolution occurs during compilation."
            },
            {
                "text": "Can two identical function signatures differ only by return type?",
                "difficulty": "easy",
                "options": ["No, the compiler flags a redefinition error", "Yes, always allowed", "Yes, if marked static", "Yes, in namespaces"],
                "correct": 0,
                "explanation": "Return types alone are insufficient to distinguish signatures."
            }
        ],
        "standard_questions": [
            {
                "text": "Given the code snippet, what output is printed when d.execute(5) runs?",
                "difficulty": "easy-medium",
                "options": ["10", "6.5", "5", "Compilation error"],
                "correct": 0,
                "explanation": "The integer 5 calls execute(int), computing 5 * 2 = 10."
            },
            {
                "text": "If d.execute(4.0) is called instead, which overload executes?",
                "difficulty": "medium",
                "options": ["execute(double)", "execute(int)", "Both simultaneously", "None; ambiguous call"],
                "correct": 0,
                "explanation": "4.0 is a double literal and resolves cleanly to execute(double)."
            },
            {
                "text": "What happens if a call d.execute('a') is made?",
                "difficulty": "medium-hard",
                "options": ["Promotes to int and invokes execute(int)", "Causes an ambiguous call compiler error", "Produces a runtime fault", "Fails compilation due to missing char overload"],
                "correct": 0,
                "explanation": "Standard integral promotion converts 'a' to int, matching execute(int) cleanly."
            }
        ],
        "hard_question": {
            "text": "Suppose execute is modified to take (int, double) and (double, int). What happens upon calling d.execute(5, 5)?",
            "difficulty": "hard",
            "options": ["Compilation error: ambiguous call", "Executes (int, double)", "Executes (double, int)", "Implicitly casts to (double, double)"],
            "correct": 0,
            "explanation": "Both overloads require one exact match and one conversion, producing an ambiguous call error."
        }
    }