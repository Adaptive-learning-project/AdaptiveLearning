# ============================================================
# BAYESIAN KNOWLEDGE TRACING (BKT)
# ============================================================


# Initial probability that the student already knows
# the concept.
P_L0 = 0.10


# Probability of learning the concept after an attempt.
P_T = 0.20


# Probability that a student guesses correctly
# even when they don't know the concept.
P_G = 0.20


# Probability that a student makes a mistake
# even when they know the concept.
P_S = 0.10


# ============================================================
# UPDATE MASTERY
# ============================================================

def update_mastery(
    previous_mastery: float,
    correct: bool
) -> float:

    """
    Update student's mastery probability using BKT.

    previous_mastery:
        Probability that the student knows the concept
        before the current question.

    correct:
        True  -> student answered correctly
        False -> student answered incorrectly

    Returns:
        Updated mastery probability between 0 and 1.
    """

    # --------------------------------------------------------
    # Make sure mastery is within valid range
    # --------------------------------------------------------

    previous_mastery = max(
        0.0,
        min(1.0, previous_mastery)
    )


    # ========================================================
    # CORRECT ANSWER
    # ========================================================

    if correct:

        probability_correct = (
            previous_mastery * (1 - P_S)
            +
            (1 - previous_mastery) * P_G
        )

        posterior = (
            previous_mastery * (1 - P_S)
        ) / probability_correct


    # ========================================================
    # INCORRECT ANSWER
    # ========================================================

    else:

        probability_incorrect = (
            previous_mastery * P_S
            +
            (1 - previous_mastery) * (1 - P_G)
        )

        posterior = (
            previous_mastery * P_S
        ) / probability_incorrect


    # ========================================================
    # LEARNING TRANSITION
    # ========================================================

    new_mastery = (
        posterior
        +
        (1 - posterior) * P_T
    )


    # Keep probability between 0 and 1

    new_mastery = max(
        0.0,
        min(1.0, new_mastery)
    )


    return round(new_mastery, 4)