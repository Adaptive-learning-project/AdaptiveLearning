import os
import json
import time

from dotenv import load_dotenv
from groq import Groq

from app.schemas import (
    PedagogicalDecision,
    JITActivity,
    JITTeachingContent,
    ALLOWED_IMAGE_KEYS,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

client = Groq(api_key=GROQ_API_KEY)

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def _ensure_api_key():
    """
    Make sure the Groq API key exists before making an API call.
    """

    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Add GROQ_API_KEY to backend/.env"
        )


def _parse_json_response(response) -> dict:
    """
    Safely parse a Groq JSON response.
    """

    content = response.choices[0].message.content

    if not content:
        raise ValueError("LLM returned an empty response.")

    content = content.strip()

    return json.loads(content)


# =============================================================================
# DIAGNOSTIC QUESTION GENERATOR
# =============================================================================


def generate_diagnostic_questions(
    topic: str,
    subtopic_name: str,
    reference_text: str = ""
) -> list:
    """
    Generates 3 initial diagnostic MCQs for a subtopic when initialized
    by admin.

    Tests baseline recall and prerequisite understanding.
    """

    print(
        f"\n🩺 [DIAGNOSTIC GENERATION] "
        f"Generating baseline diagnostic questions for: "
        f"{subtopic_name}"
    )

    prompt = f"""
You are an expert computer science curriculum diagnostic generator.

Topic:
{topic}

Subtopic:
{subtopic_name}

Reference Context:
{
    reference_text
    if reference_text
    else
    "Standard undergraduate computer science fundamentals."
}

Generate exactly 3 baseline diagnostic multiple-choice questions
to assess prior knowledge.

Questions must test prerequisite and foundational understanding.

Return ONLY a valid JSON object matching this schema:

{{
  "questions": [
    {{
      "question": "question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correct": 0,
      "difficulty": "easy",
      "explanation": "concise explanation",
      "error_tags": [
        "prerequisite_gap",
        "syntax_confusion",
        "misconception",
        "unrelated"
      ]
    }}
  ]
}}
"""

    try:
        _ensure_api_key()

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You output strictly valid JSON with no "
                        "introductory or conversational text."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=1000
        )

        data = _parse_json_response(response)

        questions = data.get("questions", [])

        print(
            f"   ✅ Diagnostic generation succeeded: "
            f"{len(questions)} items ready."
        )

        return questions

    except Exception as e:

        print(
            f"   ❌ Diagnostic generation fallback invoked: {e}"
        )

        return [
            {
                "question": (
                    f"What is the core purpose of "
                    f"{subtopic_name} in {topic}?"
                ),
                "options": [
                    "Core foundation",
                    "Memory optimization",
                    "GUI display",
                    "Network protocol"
                ],
                "correct": 0,
                "difficulty": "easy",
                "explanation": "Basic definition check.",
                "error_tags": [
                    "concept_error",
                    "memory_confusion",
                    "syntax_error",
                    "unrelated"
                ]
            }
        ]


# =============================================================================
# EXISTING ON-THE-FLY PEDAGOGICAL CONTENT GENERATOR
# =============================================================================


def generate_on_the_fly_content(
    decision: PedagogicalDecision
) -> dict:
    """
    Generates the exact pedagogical piece commanded by
    the Cognitive Governor.
    """

    print("\n" + "─" * 70)
    print("🤖 [LLM GENERATOR: ON-THE-FLY SYNTHESIS]")
    print(f"   • Concept:         {decision.concept}")
    print(f"   • Action Spec:     {decision.action.upper()}")
    print(f"   • Cognitive State: {decision.cognitive_state}")

    # These attributes may exist in your extended PedagogicalDecision model.
    # getattr() prevents this function from crashing if they are absent.
    difficulty = getattr(
        decision,
        "difficulty",
        "standard"
    )

    specific_error = getattr(
        decision,
        "specific_error",
        "None"
    )

    print(f"   • Difficulty Tier: {difficulty}")
    print(f"   • Goal:            {decision.intervention_goal}")
    print(f"   • Error Targeted:  {specific_error}")
    print("─" * 70)

    system_prompt = (
        "You are an automated pedagogical sub-processor for "
        "computer science education. "
        "You are strictly forbidden from choosing the learner's "
        "path or difficulty tier. "
        "You only fulfill the exact Pedagogical Action specified. "
        "Return ONLY a valid JSON object matching the requested schema."
    )

    user_prompt = f"""
PEDAGOGICAL SPECIFICATION:

- Concept: {decision.concept}
- Required Action: {decision.action}
- Difficulty: {difficulty}
- Goal: {decision.intervention_goal}
- Targeted Error: {specific_error}
- Constraints: {
    ", ".join(decision.constraints)
    if decision.constraints
    else "None"
}

SCHEMA INSTRUCTIONS:

1. If action is "hint":

{{
  "type": "hint",
  "text": "concise targeted hint",
  "comfort_message": "supportive phrase"
}}

2. If action is "simple_example" or "explanation":

{{
  "type": "{decision.action}",
  "title": "short title",
  "explanation": "clear visual text",
  "code_snippet": "minimal code or empty string",
  "key_takeaway": "single sentence"
}}

3. If action is "easy_question",
   "medium_question",
   "hard_transfer", or "bridge_rescue":

{{
  "type": "{decision.action}",
  "question": "the question",
  "code_snippet": "optional snippet or empty string",
  "options": [
    "Option A",
    "Option B",
    "Option C",
    "Option D"
  ],
  "correct_index": 0,
  "explanation": "why correct",
  "error_tags": [
    "error for A",
    "error for B",
    "error for C",
    "error for D"
  ]
}}

Generate valid JSON only.
"""

    start_time = time.time()

    try:

        _ensure_api_key()

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=900
        )

        latency = (
            time.time() - start_time
        ) * 1000

        parsed = _parse_json_response(response)

        print(
            f"⚡ [LLM 200 OK] "
            f"Synthesized {parsed.get('type')} "
            f"in {latency:.1f}ms\n"
        )

        return parsed

    except Exception as e:

        print(
            f"❌ [LLM GENERATION FAILED] "
            f"Fallback invoked: {e}"
        )

        return {
            "type": decision.action,
            "question": (
                f"Which statement best explains "
                f"{decision.concept}?"
            ),
            "options": [
                "Correct fundamental definition",
                "Wrong mechanism",
                "Syntactic mistake",
                "Irrelevant concept"
            ],
            "correct_index": 0,
            "explanation": "Fallback recall check.",
            "error_tags": [
                "None",
                "mechanism_error",
                "syntax_error",
                "misconception"
            ]
        }


# =============================================================================
# D1 - JIT TEACHING + QUESTION GENERATORS
# =============================================================================
#
# Required learner flow:
#
#   1. Adaptive Engine / Cognitive Governor decides:
#        - learning objective
#        - difficulty
#        - activity type
#        - allowed visual assets
#
#   2. Teaching LLM generates a short lesson.
#
#   3. Backend stores that lesson as the active teaching content.
#
#   4. Student presses "I Understand".
#
#   5. Question LLM receives the exact stored teaching content and generates
#      one visual question from that content only.
#
# The LLM never chooses the learner's path, mastery state, or difficulty.
# =============================================================================


# -----------------------------------------------------------------------------
# Shared D1 system prompts
# -----------------------------------------------------------------------------


JIT_TEACHING_SYSTEM_PROMPT = """
You are the TEACHING stage of an adaptive learning system.

Your job is to teach ONE small learning objective before any question is asked.

The learner may have limited reading ability, so teaching must be:
- simple
- concrete
- short
- directly connected to the learning objective
- supported by controlled visual assets

IMPORTANT ARCHITECTURAL RULE:
- You do NOT choose the learner's topic.
- You do NOT choose the learner's difficulty.
- You do NOT choose the learning path.
- You do NOT introduce a new concept.
- You only teach the exact objective provided by the adaptive engine.

STRICT OUTPUT RULES:
1. Return ONLY valid JSON.
2. Do NOT return markdown.
3. Do NOT return commentary outside JSON.
4. phase MUST be "teach".
5. spoken_teaching must be short and learner-friendly.
6. Use very simple concrete language.
7. visuals MUST use only supplied image_key values.
8. NEVER invent an image key.
9. Use 1 to 4 visuals.
10. Do not duplicate image_key values.
11. The visuals should directly support what is being taught.
12. Do not include a quiz, question, answer choices, or correctness fields.
13. Do not teach concepts that are not in the learning objective.
14. Do not change the requested difficulty.
15. Do not rely on the learner reading long text.

RETURN THIS SHAPE:
{
  "phase": "teach",
  "spoken_teaching": "short simple teaching statement",
  "visuals": [
    {
      "image_key": "allowed_asset_key",
      "role": "what this picture demonstrates"
    }
  ]
}
"""


JIT_QUESTION_SYSTEM_PROMPT = """
You are the QUESTION stage of an adaptive learning system.

The learner has ALREADY been taught a concept.

Your job is to generate ONE simple visual question that checks ONLY
the concept that was just taught.

IMPORTANT ARCHITECTURAL RULE:
- The learning objective, difficulty, activity type, and allowed assets are
  decided by the Adaptive Engine / Cognitive Governor.
- You do NOT change the learning objective.
- You do NOT change the difficulty.
- You do NOT introduce a new concept.
- You MUST ground the question in the exact TEACHING CONTENT supplied to you.
- The question must test what the learner was just shown/explained.

STRICT OUTPUT RULES:
1. Return ONLY valid JSON.
2. Do NOT return markdown.
3. Do NOT return commentary outside JSON.
4. activity_type MUST exactly match the requested activity type.
5. spoken_prompt MUST contain fewer than 6 words.
6. spoken_prompt must be a short spoken action instruction.
7. Use simple concrete language.
8. The learner must be able to solve the question visually.
9. choices MUST contain image_key.
10. NEVER create a "text" field inside a choice.
11. image_key MUST come only from the supplied allowed asset keys.
12. NEVER invent an image key.
13. Generate exactly 2 or 3 choices.
14. Exactly ONE choice must have is_correct=true.
15. All remaining choices must have is_correct=false.
16. Do not duplicate image_key values.
17. Do not add explanations, question text, labels, or paragraphs inside choices.
18. Check ONLY the concept taught in TEACHING CONTENT.
19. Do not introduce a concept that was not taught.
20. Do not make the question harder than the requested difficulty.

RETURN THIS SHAPE:
{
  "activity_type": "picture_choice",
  "spoken_prompt": "short action with fewer than 6 words",
  "choices": [
    {
      "image_key": "allowed_asset_key",
      "is_correct": true
    },
    {
      "image_key": "allowed_asset_key",
      "is_correct": false
    }
  ]
}
"""


# -----------------------------------------------------------------------------
# Teaching validation helpers
# -----------------------------------------------------------------------------


def _validate_jit_teaching_content(
    teaching: JITTeachingContent,
    allowed_image_keys: list,
) -> JITTeachingContent:
    """
    Validate teaching content against the exact asset vocabulary supplied by
    the Adaptive Engine.

    Pydantic validates the global asset vocabulary. This function validates
    the narrower per-request vocabulary.
    """

    if teaching.phase != "teach":
        raise ValueError(
            f"Teaching phase must be 'teach', received '{teaching.phase}'."
        )

    spoken_teaching = teaching.spoken_teaching.strip()

    if not spoken_teaching:
        raise ValueError("spoken_teaching cannot be empty.")

    # Keep the lesson genuinely short for the intended learner experience.
    teaching_word_count = len(spoken_teaching.split())

    if teaching_word_count > 60:
        raise ValueError(
            "spoken_teaching must contain no more than 60 words. "
            f"Received {teaching_word_count} words."
        )

    if len(teaching.visuals) not in (1, 2, 3, 4):
        raise ValueError(
            "Teaching content must contain between 1 and 4 visuals."
        )

    for visual in teaching.visuals:
        if visual.image_key not in allowed_image_keys:
            raise ValueError(
                f"LLM returned teaching image_key '{visual.image_key}' "
                "which was not allowed for this lesson."
            )

    image_keys = [visual.image_key for visual in teaching.visuals]

    if len(image_keys) != len(set(image_keys)):
        raise ValueError(
            "Teaching content contains duplicate image keys."
        )

    return teaching


def _prepare_d1_request_context(
    learning_objective: str,
    allowed_image_keys: list,
    difficulty: str,
    activity_type: str,
    image_asset_descriptions: dict = None,
) -> tuple[list, str, dict]:
    """
    Shared validation and asset-catalog preparation for D1 teaching/question
    generation.
    """

    if not learning_objective or not learning_objective.strip():
        raise ValueError("learning_objective cannot be empty.")

    if difficulty not in {"easy", "medium", "hard"}:
        raise ValueError(
            f"Unsupported difficulty '{difficulty}'. "
            "Expected easy, medium, or hard."
        )

    if activity_type not in {
        "picture_choice",
        "picture_sort",
        "picture_match",
    }:
        raise ValueError(
            f"Unsupported activity_type '{activity_type}'."
        )

    # Remove duplicates while preserving the order supplied by the
    # Adaptive Engine / asset selector.
    allowed_image_keys = list(
        dict.fromkeys(allowed_image_keys or [])
    )

    if len(allowed_image_keys) < 2:
        raise ValueError(
            "At least 2 image keys are required for a visual activity."
        )

    invalid_requested_keys = [
        key
        for key in allowed_image_keys
        if key not in ALLOWED_IMAGE_KEYS
    ]

    if invalid_requested_keys:
        raise ValueError(
            "Unknown requested image keys: "
            f"{invalid_requested_keys}"
        )

    image_asset_descriptions = image_asset_descriptions or {}

    asset_lines = []

    for key in allowed_image_keys:
        description = (
            image_asset_descriptions.get(key)
            or _humanize_image_key(key)
        )

        asset_lines.append(
            f"- {key}: {description}"
        )

    asset_catalog_text = "\n".join(asset_lines)

    return (
        allowed_image_keys,
        asset_catalog_text,
        image_asset_descriptions,
    )


# -----------------------------------------------------------------------------
# D1 teaching generator
# -----------------------------------------------------------------------------


def generate_jit_teaching_content(
    learning_objective: str,
    allowed_image_keys: list,
    difficulty: str = "easy",
    activity_type: str = "picture_choice",
    max_attempts: int = 3,
    image_asset_descriptions: dict = None,
    reference_context: str = "",
) -> dict:
    """
    D1 TEACHING STAGE.

    Generates the lesson that is shown BEFORE a question.

    The Adaptive Engine supplies:
        - learning_objective
        - difficulty
        - activity_type
        - allowed_image_keys

    The LLM only synthesizes the teaching content.
    """

    (
        allowed_image_keys,
        asset_catalog_text,
        image_asset_descriptions,
    ) = _prepare_d1_request_context(
        learning_objective=learning_objective,
        allowed_image_keys=allowed_image_keys,
        difficulty=difficulty,
        activity_type=activity_type,
        image_asset_descriptions=image_asset_descriptions,
    )

    reference_block = (
        reference_context.strip()
        if reference_context and reference_context.strip()
        else "No additional reference context supplied."
    )

    print("\n" + "=" * 78)
    print("📘 D1 JIT TEACHING — LLM GENERATION")
    print(f"   Model:              {GROQ_MODEL}")
    print(f"   Learning objective:  {learning_objective}")
    print(f"   Difficulty:          {difficulty}")
    print(f"   Activity type:       {activity_type}")
    print("   Allowed assets:")
    print(asset_catalog_text)
    print("=" * 78)

    user_prompt = f"""
ADAPTIVE LEARNING OBJECTIVE:
{learning_objective}

DIFFICULTY:
{difficulty}

ACTIVITY TYPE:
{activity_type}

AVAILABLE VISUAL ASSETS:
{asset_catalog_text}

CURRICULUM / RAG REFERENCE CONTEXT:
{reference_block}

TEACHING TASK:
Teach the learner this ONE objective before any question is asked.

TEACHING REQUIREMENTS:
- Teach only the supplied learning objective.
- Keep the explanation short and concrete.
- Use no more than 60 words.
- Use simple vocabulary.
- Make the concept understandable without requiring the learner to read
  a long explanation.
- Use 1 to 4 visual assets from AVAILABLE VISUAL ASSETS.
- Each visual role must explain how that picture demonstrates the concept.
- Use only the supplied image_key values.
- Do not introduce a new concept.
- Do not ask a question.
- Do not provide answer choices.
- Do not mark anything correct or incorrect.

RETURN EXACTLY THIS JSON SHAPE:
{{
  "phase": "teach",
  "spoken_teaching": "short simple teaching statement",
  "visuals": [
    {{
      "image_key": "allowed_asset_key",
      "role": "simple description of what the picture teaches"
    }}
  ]
}}
"""

    for attempt in range(1, max_attempts + 1):
        start_time = time.time()

        try:
            _ensure_api_key()

            print(
                f"\n📡 TEACHING LLM request attempt "
                f"{attempt}/{max_attempts}"
            )

            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": JIT_TEACHING_SYSTEM_PROMPT,
                    },
                    {
                        "role": "user",
                        "content": user_prompt,
                    },
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
                max_tokens=500,
            )

            latency = (
                time.time() - start_time
            ) * 1000

            raw_data = _parse_json_response(response)

            print(
                f"📦 Teaching JSON received in "
                f"{latency:.1f}ms"
            )

            print("🧠 RAW TEACHING LLM JSON:")
            print(
                json.dumps(
                    raw_data,
                    indent=2,
                    ensure_ascii=False,
                )
            )

            if not isinstance(raw_data, dict):
                raise ValueError(
                    "Teaching response must be a JSON object."
                )

            if raw_data.get("phase") != "teach":
                raise ValueError(
                    "Teaching response must contain phase='teach'."
                )

            raw_visuals = raw_data.get("visuals")

            if not isinstance(raw_visuals, list):
                raise ValueError(
                    "Teaching response must contain a visuals array."
                )

            for visual in raw_visuals:
                if (
                    isinstance(visual, dict)
                    and "text" in visual
                ):
                    raise ValueError(
                        "Teaching visual objects must not contain "
                        "a forbidden 'text' field."
                    )

            teaching = JITTeachingContent.model_validate(
                raw_data
            )

            teaching = _validate_jit_teaching_content(
                teaching,
                allowed_image_keys,
            )

            print(
                "✅ D1 LLM-generated teaching content "
                "validated successfully."
            )
            print(
                f"   Spoken teaching: "
                f"{teaching.spoken_teaching}"
            )
            print(
                f"   Visuals: {len(teaching.visuals)}"
            )
            print(
                f"   Generation attempts: {attempt}"
            )
            print("=" * 78)

            return {
                "phase": "teach",
                "spoken_teaching": teaching.spoken_teaching,
                "visuals": [
                    {
                        "image_key": visual.image_key,
                        "role": visual.role,
                    }
                    for visual in teaching.visuals
                ],
                "generation_attempts": attempt,
            }

        except Exception as e:
            print(
                f"⚠️ Teaching LLM attempt {attempt} failed: {e}"
            )

            if attempt < max_attempts:
                print(
                    "🔄 Retrying teaching generation with "
                    "the same adaptive constraints..."
                )
                continue

            print(
                "❌ D1 teaching generation failed after "
                "all attempts."
            )

            # Do not return hardcoded teaching here. The point of D1 is to
            # prove that teaching content is actually generated by the LLM.
            raise RuntimeError(
                "Unable to generate valid LLM-based teaching "
                f"content after {max_attempts} attempts. "
                f"Last error: {e}"
            ) from e

    raise RuntimeError(
        "Unexpected D1 teaching generation failure."
    )


# -----------------------------------------------------------------------------
# D1 question generator
# -----------------------------------------------------------------------------


def _build_taught_content_text(
    taught_content,
) -> str:
    """
    Convert stored teaching content into a compact JSON/text block that can
    be passed to the question-generation LLM.

    The backend should pass the exact stored teaching output. The frontend
    must not be responsible for reconstructing or modifying it.
    """

    if taught_content is None:
        raise ValueError(
            "taught_content is required before generating a question."
        )

    if isinstance(taught_content, dict):
        # Accept either the response wrapper's "teaching" field or the
        # teaching object itself for backend convenience.
        payload = taught_content.get(
            "teaching",
            taught_content,
        )
    else:
        payload = taught_content

    if isinstance(payload, JITTeachingContent):
        payload = payload.model_dump()

    if not isinstance(payload, dict):
        raise ValueError(
            "taught_content must be a dict or JITTeachingContent object."
        )

    if payload.get("phase") != "teach":
        raise ValueError(
            "taught_content must represent the completed teaching phase."
        )

    spoken_teaching = payload.get("spoken_teaching")

    if not isinstance(spoken_teaching, str) or not spoken_teaching.strip():
        raise ValueError(
            "taught_content.spoken_teaching is missing or empty."
        )

    visuals = payload.get("visuals")

    if not isinstance(visuals, list) or not visuals:
        raise ValueError(
            "taught_content.visuals must contain at least one visual."
        )

    compact_payload = {
        "phase": "teach",
        "spoken_teaching": spoken_teaching.strip(),
        "visuals": visuals,
    }

    return json.dumps(
        compact_payload,
        ensure_ascii=False,
        indent=2,
    )


def generate_jit_question_from_teaching(
    learning_objective: str,
    allowed_image_keys: list,
    taught_content,
    difficulty: str = "easy",
    activity_type: str = "picture_choice",
    max_attempts: int = 3,
    image_asset_descriptions: dict = None,
) -> dict:
    """
    D1 QUESTION STAGE.

    Generates the question ONLY after teaching content exists.

    `taught_content` must be the exact lesson stored by the backend after the
    teaching endpoint succeeds.

    The LLM can synthesize the question, but the adaptive decision still
    comes from the Cognitive Governor / Adaptive Engine.
    """

    taught_content_text = _build_taught_content_text(
        taught_content
    )

    (
        allowed_image_keys,
        asset_catalog_text,
        image_asset_descriptions,
    ) = _prepare_d1_request_context(
        learning_objective=learning_objective,
        allowed_image_keys=allowed_image_keys,
        difficulty=difficulty,
        activity_type=activity_type,
        image_asset_descriptions=image_asset_descriptions,
    )

    print("\n" + "=" * 78)
    print("❓ D1 JIT QUESTION — LLM GENERATION")
    print(f"   Model:              {GROQ_MODEL}")
    print(f"   Learning objective:  {learning_objective}")
    print(f"   Difficulty:          {difficulty}")
    print(f"   Activity type:       {activity_type}")
    print("   Allowed assets:")
    print(asset_catalog_text)
    print("   Stored teaching content:")
    print(taught_content_text)
    print("=" * 78)

    user_prompt = f"""
ADAPTIVE LEARNING OBJECTIVE:
{learning_objective}

DIFFICULTY:
{difficulty}

REQUESTED ACTIVITY TYPE:
{activity_type}

AVAILABLE VISUAL ASSETS:
{asset_catalog_text}

EXACT TEACHING CONTENT ALREADY SHOWN TO THE LEARNER:
{taught_content_text}

QUESTION TASK:
Generate exactly ONE simple visual question that checks only the concept
that was just taught.

CRITICAL GROUNDING RULE:
The question MUST be answerable from EXACTLY what appears in
EXACT TEACHING CONTENT ALREADY SHOWN TO THE LEARNER.

QUESTION REQUIREMENTS:
- Do not introduce a new concept.
- Do not test an attribute or rule that was not taught.
- Do not change the requested difficulty.
- Use only image_key values from AVAILABLE VISUAL ASSETS.
- Generate exactly 2 or 3 choices.
- Exactly one choice must have is_correct=true.
- Every other choice must have is_correct=false.
- Do not duplicate image_key values.
- spoken_prompt must contain fewer than 6 words.
- spoken_prompt must be a short spoken action.
- Do not place text labels in choices.
- Do not add a "text" field to choices.
- The learner should solve the task visually.

SELF-CHECK BEFORE RETURNING:
1. What exact concept was taught?
2. Can the question be answered using only that teaching?
3. Did you introduce anything new?
4. Are all image_key values allowed?
5. Is there exactly one correct choice?

RETURN EXACTLY THIS JSON SHAPE:
{{
  "activity_type": "{activity_type}",
  "spoken_prompt": "short action with fewer than 6 words",
  "choices": [
    {{
      "image_key": "allowed_asset_key",
      "is_correct": true
    }},
    {{
      "image_key": "allowed_asset_key",
      "is_correct": false
    }}
  ]
}}
"""

    for attempt in range(1, max_attempts + 1):
        start_time = time.time()

        try:
            _ensure_api_key()

            print(
                f"\n📡 QUESTION LLM request attempt "
                f"{attempt}/{max_attempts}"
            )

            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": JIT_QUESTION_SYSTEM_PROMPT,
                    },
                    {
                        "role": "user",
                        "content": user_prompt,
                    },
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
                max_tokens=500,
            )

            latency = (
                time.time() - start_time
            ) * 1000

            raw_data = _parse_json_response(response)

            print(
                f"📦 Question JSON received in "
                f"{latency:.1f}ms"
            )

            print("🧠 RAW QUESTION LLM JSON:")
            print(
                json.dumps(
                    raw_data,
                    indent=2,
                    ensure_ascii=False,
                )
            )

            if not isinstance(raw_data, dict):
                raise ValueError(
                    "Question response must be a JSON object."
                )

            returned_activity_type = raw_data.get(
                "activity_type"
            )

            if returned_activity_type != activity_type:
                raise ValueError(
                    "LLM changed the requested activity type. "
                    f"Expected '{activity_type}', "
                    f"received '{returned_activity_type}'."
                )

            raw_choices = raw_data.get("choices")

            if not isinstance(raw_choices, list):
                raise ValueError(
                    "Question response must contain a choices array."
                )

            for choice in raw_choices:
                if isinstance(choice, dict) and "text" in choice:
                    raise ValueError(
                        "LLM returned a forbidden 'text' field "
                        "inside a choice."
                    )

            activity = JITActivity.model_validate(
                raw_data
            )

            activity = _validate_jit_activity(
                activity,
                allowed_image_keys,
            )

            print(
                "✅ D1 LLM-generated question "
                "validated successfully."
            )
            print(
                f"   Prompt: {activity.spoken_prompt}"
            )
            print(
                f"   Choices: {len(activity.choices)}"
            )
            print(
                f"   Generation attempts: {attempt}"
            )
            print("=" * 78)

            return {
                "activity_type": activity.activity_type,
                "spoken_prompt": activity.spoken_prompt,
                "choices": [
                    {
                        "image_key": choice.image_key,
                        "is_correct": choice.is_correct,
                    }
                    for choice in activity.choices
                ],
                "generation_attempts": attempt,
            }

        except Exception as e:
            print(
                f"⚠️ Question LLM attempt {attempt} failed: {e}"
            )

            if attempt < max_attempts:
                print(
                    "🔄 Retrying with the same adaptive "
                    "constraints and exact teaching content..."
                )
                continue

            print(
                "❌ D1 question generation failed after "
                "all attempts."
            )

            # Do not fabricate a hardcoded question. This keeps D1 genuinely
            # LLM-driven and makes failures visible to the backend.
            raise RuntimeError(
                "Unable to generate a valid LLM-based question "
                f"after {max_attempts} attempts. "
                f"Last error: {e}"
            ) from e

    raise RuntimeError(
        "Unexpected D1 question generation failure."
    )


# -----------------------------------------------------------------------------
# Backward-compatible D1 question wrapper
# -----------------------------------------------------------------------------


def _validate_jit_activity(
    activity: JITActivity,
    allowed_image_keys: list,
) -> JITActivity:
    """
    Additional runtime validation for D1.

    Pydantic already validates the basic JITActivity schema.
    This function validates the activity against the specific
    asset vocabulary supplied for this generation request.
    """

    # -------------------------------------------------------------------------
    # Validate prompt length
    # -------------------------------------------------------------------------

    word_count = len(
        activity.spoken_prompt.strip().split()
    )

    if word_count >= 6:
        raise ValueError(
            "spoken_prompt must contain fewer than 6 words. "
            f"Received {word_count} words."
        )

    # -------------------------------------------------------------------------
    # Validate number of choices
    # -------------------------------------------------------------------------

    if len(activity.choices) not in (2, 3):
        raise ValueError(
            "JIT activity must contain exactly 2 or 3 choices."
        )

    # -------------------------------------------------------------------------
    # Validate image keys against request
    # -------------------------------------------------------------------------

    for choice in activity.choices:

        if choice.image_key not in allowed_image_keys:
            raise ValueError(
                f"LLM returned image_key "
                f"'{choice.image_key}' which was not "
                f"allowed for this activity."
            )

    # -------------------------------------------------------------------------
    # Exactly one correct answer
    # -------------------------------------------------------------------------

    correct_count = sum(
        choice.is_correct
        for choice in activity.choices
    )

    if correct_count != 1:
        raise ValueError(
            "JIT activity must contain exactly "
            "one correct choice."
        )

    # -------------------------------------------------------------------------
    # No duplicate images
    # -------------------------------------------------------------------------

    image_keys = [
        choice.image_key
        for choice in activity.choices
    ]

    if len(image_keys) != len(set(image_keys)):
        raise ValueError(
            "JIT activity contains duplicate image keys."
        )

    return activity


def _humanize_image_key(image_key: str) -> str:
    """
    Convert an asset key such as ``ball_big_red`` into a simple
    human-readable description for the LLM.
    """
    return image_key.replace("_", " ")


def generate_jit_visual_activity(
    learning_objective: str,
    allowed_image_keys: list,
    difficulty: str = "easy",
    activity_type: str = "picture_choice",
    max_attempts: int = 3,
    image_asset_descriptions: dict = None,
    taught_content=None,
) -> dict:
    """
    D1 QUESTION GENERATOR / BACKWARD-COMPATIBLE ENTRY POINT.

    Existing callers may continue using this function, but for the new
    architecture `taught_content` should ALWAYS be supplied after the
    teaching stage.

    When `taught_content` is provided:
        -> question is generated from the exact stored teaching content.

    When `taught_content` is omitted:
        -> this function preserves the old direct-question behavior for
           backward compatibility with existing tests/routes.

    New FastAPI code should prefer:
        generate_jit_teaching_content(...)
        followed by
        generate_jit_question_from_teaching(...)
    """

    if taught_content is not None:
        return generate_jit_question_from_teaching(
            learning_objective=learning_objective,
            allowed_image_keys=allowed_image_keys,
            taught_content=taught_content,
            difficulty=difficulty,
            activity_type=activity_type,
            max_attempts=max_attempts,
            image_asset_descriptions=image_asset_descriptions,
        )

    # -------------------------------------------------------------------------
    # Legacy direct-question mode
    # -------------------------------------------------------------------------
    (
        allowed_image_keys,
        asset_catalog_text,
        image_asset_descriptions,
    ) = _prepare_d1_request_context(
        learning_objective=learning_objective,
        allowed_image_keys=allowed_image_keys,
        difficulty=difficulty,
        activity_type=activity_type,
        image_asset_descriptions=image_asset_descriptions,
    )

    print("\n" + "=" * 78)
    print("🎨 D1 JIT VISUAL ACTIVITY — LEGACY DIRECT QUESTION MODE")
    print(f"   Model:              {GROQ_MODEL}")
    print(f"   Learning objective:  {learning_objective}")
    print(f"   Difficulty:          {difficulty}")
    print(f"   Activity type:       {activity_type}")
    print("   Allowed assets:")
    print(asset_catalog_text)
    print("=" * 78)

    user_prompt = f"""
LEARNING OBJECTIVE:
{learning_objective}

DIFFICULTY:
{difficulty}

REQUESTED ACTIVITY TYPE:
{activity_type}

AVAILABLE VISUAL ASSETS:
{asset_catalog_text}

TASK:
Generate exactly ONE simple, non-text visual learning activity
that directly practices the learning objective.

OUTPUT REQUIREMENTS:
- Return ONLY one valid JSON object.
- Do not return markdown.
- Do not return commentary.
- spoken_prompt MUST contain fewer than 6 words.
- spoken_prompt must be a short spoken action.
- The learner must be able to solve the task visually.
- Do not require reading text in the answer choices.
- Use ONLY image_key values from AVAILABLE VISUAL ASSETS.
- Never invent an image_key.
- Generate exactly 2 or 3 choices.
- Exactly ONE choice must have is_correct=true.
- All remaining choices must have is_correct=false.
- Do not duplicate image_key values.
- Do not add a "text" property to any choice.
- Keep the activity concrete and easy to understand.
- Follow the learning objective exactly.
- Do not change the difficulty.
- Do not choose a different pedagogical objective.

RETURN THIS SHAPE:
{{
  "activity_type": "{activity_type}",
  "spoken_prompt": "short action with fewer than 6 words",
  "choices": [
    {{
      "image_key": "allowed_asset_key",
      "is_correct": true
    }},
    {{
      "image_key": "allowed_asset_key",
      "is_correct": false
    }}
  ]
}}
"""

    for attempt in range(1, max_attempts + 1):
        start_time = time.time()

        try:
            _ensure_api_key()

            print(
                f"\n📡 LLM request attempt {attempt}/{max_attempts}"
            )

            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": JIT_QUESTION_SYSTEM_PROMPT,
                    },
                    {
                        "role": "user",
                        "content": user_prompt,
                    },
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
                max_tokens=500,
            )

            latency = (
                time.time() - start_time
            ) * 1000

            raw_data = _parse_json_response(response)

            print(
                f"📦 LLM JSON received in {latency:.1f}ms"
            )

            print("🧠 RAW LLM JSON:")
            print(
                json.dumps(
                    raw_data,
                    indent=2,
                    ensure_ascii=False,
                )
            )

            if not isinstance(raw_data, dict):
                raise ValueError(
                    "LLM response must be a JSON object."
                )

            returned_activity_type = raw_data.get(
                "activity_type"
            )

            if returned_activity_type != activity_type:
                raise ValueError(
                    "LLM changed the requested activity type. "
                    f"Expected '{activity_type}', "
                    f"received '{returned_activity_type}'."
                )

            raw_choices = raw_data.get("choices")

            if not isinstance(raw_choices, list):
                raise ValueError(
                    "LLM response must contain a choices array."
                )

            for choice in raw_choices:
                if isinstance(choice, dict) and "text" in choice:
                    raise ValueError(
                        "LLM returned a forbidden 'text' field "
                        "inside a choice."
                    )

            activity = JITActivity.model_validate(
                raw_data
            )

            activity = _validate_jit_activity(
                activity,
                allowed_image_keys,
            )

            print(
                "✅ D1 LLM-generated activity validated successfully."
            )
            print(
                f"   Prompt: {activity.spoken_prompt}"
            )
            print(
                f"   Choices: {len(activity.choices)}"
            )
            print(
                f"   Generation attempts: {attempt}"
            )
            print("=" * 78)

            return {
                "activity_type": activity.activity_type,
                "spoken_prompt": activity.spoken_prompt,
                "choices": [
                    {
                        "image_key": choice.image_key,
                        "is_correct": choice.is_correct,
                    }
                    for choice in activity.choices
                ],
                "generation_attempts": attempt,
            }

        except Exception as e:
            print(
                f"⚠️ D1 LLM attempt {attempt} failed: {e}"
            )

            if attempt < max_attempts:
                print(
                    "🔄 Retrying with the same adaptive "
                    "constraints..."
                )
                continue

            print(
                "❌ D1 LLM generation failed after all attempts."
            )

            raise RuntimeError(
                "Unable to generate a valid LLM-based JIT "
                f"visual activity after {max_attempts} attempts. "
                f"Last error: {e}"
            ) from e

    raise RuntimeError(
        "Unexpected D1 LLM generation failure."
    )


# =============================================================================
# D1 - CONVENIENCE FUNCTION
# =============================================================================


def generate_simple_picture_choice(
    learning_objective: str,
    image_keys: list,
    difficulty: str = "easy"
) -> dict:
    """
    Convenience wrapper for the most common D1 activity:
    picture choice.

    Example:

    activity = generate_simple_picture_choice(
        learning_objective="Identify a big object",
        image_keys=[
            "ball_big_red",
            "ball_small_green"
        ]
    )
    """

    return generate_jit_visual_activity(
        learning_objective=learning_objective,
        allowed_image_keys=image_keys,
        difficulty=difficulty,
        activity_type="picture_choice"
    )


# =============================================================================
# HYBRID BRIDGE GENERATOR
# =============================================================================


def generate_hybrid_bridge(
    topic: str,
    subtopic: str,
    failed_questions: list,
    easy_question_passed: dict = None
) -> dict:
    """
    Fallback bridge rescue generator for persistent
    oscillation loops.
    """

    prompt = f"""
A student in topic '{topic}', subtopic '{subtopic}'
is stuck in an oscillation loop.

Failed details:
{json.dumps(failed_questions)}

Previously passed easy question:
{json.dumps(easy_question_passed) if easy_question_passed else "None"}

Generate a concise conceptual bridge analogy linking
what they passed to what they are failing.

Return JSON with:

- bridge_title
- analogy
- key_rule
"""

    try:

        _ensure_api_key()

        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={
                "type": "json_object"
            },
            max_tokens=600
        )

        return _parse_json_response(resp)

    except Exception:

        return {
            "bridge_title": (
                f"Bridging Concept in {subtopic}"
            ),
            "analogy": (
                "Think of the base definition as a "
                "blueprint, and the runtime call as "
                "the built house."
            ),
            "key_rule": (
                "Declarative syntax allows compilation, "
                "while dynamic mechanisms govern "
                "runtime resolution."
            )
        }