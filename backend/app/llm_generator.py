"""
backend/app/llm_generator.py
Just-In-Time Constrained Content & Diagnostic Generator using Groq
"""

import os
import json
import time
from groq import Groq
from app.schemas import PedagogicalDecision

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
client = Groq(api_key=GROQ_API_KEY)


def generate_diagnostic_questions(topic: str, subtopic_name: str, reference_text: str = "") -> list:
    """
    Generates 3 initial diagnostic MCQs for a subtopic when initialized by admin.
    Tests baseline recall and prerequisite understanding.
    """
    print(f"\n🩺 [DIAGNOSTIC GENERATION] Generating baseline diagnostic questions for: {subtopic_name}")

    prompt = f"""You are an expert computer science curriculum diagnostic generator.
Topic: {topic}
Subtopic: {subtopic_name}
Reference Context: {reference_text if reference_text else "Standard undergraduate computer science fundamentals."}

Generate exactly 3 baseline diagnostic multiple-choice questions to assess prior knowledge.
Questions must test prerequisite and foundational understanding.

Return ONLY a valid JSON object matching this schema:
{{
  "questions": [
    {{
      "question": "question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "difficulty": "easy",
      "explanation": "concise explanation",
      "error_tags": ["prerequisite_gap", "syntax_confusion", "misconception", "unrelated"]
    }}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You output strictly valid JSON with no introductory or conversational text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=1000
        )
        data = json.loads(response.choices[0].message.content.strip())
        questions = data.get("questions", [])
        print(f"   ✅ Diagnostic generation succeeded: {len(questions)} items ready.")
        return questions
    except Exception as e:
        print(f"   ❌ Diagnostic generation fallback invoked: {e}")
        return [
            {
                "question": f"What is the core purpose of {subtopic_name} in {topic}?",
                "options": ["Core foundation", "Memory optimization", "GUI display", "Network protocol"],
                "correct": 0,
                "difficulty": "easy",
                "explanation": "Basic definition check.",
                "error_tags": ["concept_error", "memory_confusion", "syntax_error", "unrelated"]
            }
        ]


def generate_on_the_fly_content(decision: PedagogicalDecision) -> dict:
    """
    Generates the exact pedagogical piece commanded by the Cognitive Governor.
    """
    print("\n" + "─" * 70)
    print("🤖 [LLM GENERATOR: ON-THE-FLY SYNTHESIS]")
    print(f"   • Concept:         {decision.concept}")
    print(f"   • Action Spec:     {decision.action.upper()}")
    print(f"   • Cognitive State: {decision.cognitive_state}")
    print(f"   • Difficulty Tier: {decision.difficulty}")
    print(f"   • Goal:            {decision.intervention_goal}")
    print(f"   • Error Targeted:  {decision.specific_error}")
    print("─" * 70)

    system_prompt = (
        "You are an automated pedagogical sub-processor for CS education. "
        "You are strictly forbidden from choosing the learner's path or difficulty tier. "
        "You only fulfill the exact Pedagogical Action specified. "
        "Return ONLY a valid JSON object matching the requested schema."
    )

    user_prompt = f"""
PEDAGOGICAL SPECIFICATION:
- Concept: {decision.concept}
- Required Action: {decision.action}
- Difficulty: {decision.difficulty}
- Goal: {decision.intervention_goal}
- Targeted Error: {decision.specific_error}
- Constraints: {', '.join(decision.constraints) if decision.constraints else 'None'}

SCHEMA INSTRUCTIONS:
1. If action is "hint":
   {{"type": "hint", "text": "concise targeted hint", "comfort_message": "supportive phrase"}}
2. If action is "simple_example" or "explanation":
   {{"type": "{decision.action}", "title": "short title", "explanation": "clear visual text", "code_snippet": "minimal code or empty string", "key_takeaway": "single sentence"}}
3. If action is "easy_question", "medium_question", "hard_transfer", or "bridge_rescue":
   {{"type": "{decision.action}", "question": "the question", "code_snippet": "optional snippet or empty string", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_index": 0, "explanation": "why correct", "error_tags": ["error for A", "error for B", "error for C", "error for D"]}}

Generate valid JSON:
"""

    start_time = time.time()
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=900
        )
        latency = (time.time() - start_time) * 1000
        parsed = json.loads(response.choices[0].message.content.strip())
        print(f"⚡ [LLM 200 OK] Synthesized {parsed.get('type')} in {latency:.1f}ms\n")
        return parsed
    except Exception as e:
        print(f"❌ [LLM GENERATION FAILED] Fallback invoked: {e}")
        return {
            "type": decision.action,
            "question": f"Which statement best explains {decision.concept}?",
            "options": ["Correct fundamental definition", "Wrong mechanism", "Syntactic mistake", "Irrelevant concept"],
            "correct_index": 0,
            "explanation": "Fallback recall check.",
            "error_tags": ["None", "mechanism_error", "syntax_error", "misconception"]
        }


def generate_hybrid_bridge(topic: str, subtopic: str, failed_questions: list, easy_question_passed: dict = None) -> dict:
    """Fallback bridge rescue generator for persistent oscillation loops."""
    prompt = f"""A student in topic '{topic}', subtopic '{subtopic}' is stuck in an oscillation loop.
Failed details: {json.dumps(failed_questions)}
Generate a concise conceptual bridge analogy linking what they passed to what they are failing.
Return JSON with 'bridge_title', 'analogy', and 'key_rule'."""
    try:
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=600
        )
        return json.loads(resp.choices[0].message.content.strip())
    except Exception:
        return {
            "bridge_title": f"Bridging Concept in {subtopic}",
            "analogy": "Think of the base definition as a blueprint, and the runtime call as the built house.",
            "key_rule": "Declarative syntax allows compilation, while dynamic mechanisms govern runtime resolution."
        }