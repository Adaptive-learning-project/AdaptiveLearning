import json
import sys

from app.llm_generator import (
    GROQ_MODEL,
    GROQ_API_KEY,
    generate_jit_visual_activity,
)


def main():
    print("\n" + "=" * 78)
    print("D1 JIT LLM SMOKE TEST")
    print("=" * 78)

    print("Model:", GROQ_MODEL)
    print(
        "API key loaded:",
        "YES" if GROQ_API_KEY else "NO"
    )

    if not GROQ_API_KEY:
        print("\nERROR: GROQ_API_KEY was not loaded.")
        print("Check backend/.env")
        sys.exit(1)

    # Simulated decision from the Adaptive Engine
    learning_objective = "Identify big and small objects"
    difficulty = "easy"
    activity_type = "picture_choice"

    image_asset_descriptions = {
        "ball_big_red": "a big red ball",
        "ball_small_green": "a small green ball",
    }

    allowed_image_keys = list(
        image_asset_descriptions.keys()
    )

    print("\nAdaptive decision supplied to JIT generator:")
    print("  Objective:", learning_objective)
    print("  Difficulty:", difficulty)
    print("  Activity:", activity_type)
    print("  Assets:", allowed_image_keys)

    try:
        result = generate_jit_visual_activity(
            learning_objective=learning_objective,
            allowed_image_keys=allowed_image_keys,
            difficulty=difficulty,
            activity_type=activity_type,
            image_asset_descriptions=image_asset_descriptions,
        )

        print("\n" + "=" * 78)
        print("SUCCESS — LLM GENERATED VALID D1 ACTIVITY")
        print("=" * 78)

        print(json.dumps(result, indent=2))

        print("\nVerification:")
        print("  Model:", GROQ_MODEL)
        print(
            "  Attempts:",
            result.get("generation_attempts")
        )
        print(
            "  Prompt:",
            result["spoken_prompt"]
        )
        print(
            "  Choices:",
            len(result["choices"])
        )

        assert result["activity_type"] == activity_type
        assert len(result["spoken_prompt"].split()) < 6
        assert len(result["choices"]) in (2, 3)

        correct_count = sum(
            choice["is_correct"]
            for choice in result["choices"]
        )

        assert correct_count == 1

        for choice in result["choices"]:
            assert "image_key" in choice
            assert "text" not in choice
            assert (
                choice["image_key"]
                in allowed_image_keys
            )

        print("\nALL D1 ASSERTIONS PASSED.")
        print(
            "This confirms the activity was generated through"
        )
        print(
            "the configured LLM generator and passed validation."
        )

    except Exception as exc:
        print("\n" + "=" * 78)
        print("D1 LLM TEST FAILED")
        print("=" * 78)
        print(type(exc).__name__ + ":", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()