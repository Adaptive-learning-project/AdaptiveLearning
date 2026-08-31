"""
bkt.py — Bayesian Knowledge Tracing (BKT) core math.

No database, no FastAPI. Pure probability calculations only.

Parameters (cold-start ITS baseline defaults):
    P(L0) = 0.10  — initial mastery prior for an unassessed concept
    P(T)  = 0.20  — probability of learning per practice step
    P(G)  = 0.20  — probability of guessing correctly without mastery
    P(S)  = 0.10  — probability of slipping (error despite mastery)

Hint penalty:
    When a hint was used, P(T) is reduced to 0.10 to reflect that
    the learning gain came from scaffolding assistance, not independent
    retrieval.

Mastery thresholds:
    P(L) >= 0.85  → mastered      — advance DAG forward
    P(L) >= 0.70  → challenge     — serve hard_question
    0.40 <= P(L) < 0.70 → standard — main_explanation + question
    P(L)  < 0.40  → scaffold      — simple_explanation + easy_question

Diagnostic initialization (Option 2 — standard BKT from prior):
    Treat the diagnostic answer as Observation 1 from P(L0) = 0.10.
    Diagnostic correct → P(L1) ≈ 0.4667  (Standard Zone)
    Diagnostic wrong   → P(L1) ≈ 0.2110  (Scaffold Zone)
    No hard-coded jumps. Same formula everywhere.

Prerequisite gating:
    If a child node answered correctly in diagnostic but its parent was
    answered incorrectly, the child's P(L1) is overridden to the parent's
    wrong-answer value (≈ 0.2110) so it stays in the scaffold zone until
    the parent prerequisite is cleared.
"""

from __future__ import annotations

# ── Default BKT parameters ───────────────────────────────────────────────────

DEFAULT_P_L0: float = 0.10   # initial mastery prior
DEFAULT_P_T:  float = 0.20   # transition (learning gain per step)
DEFAULT_P_G:  float = 0.20   # guess probability
DEFAULT_P_S:  float = 0.10   # slip probability
HINT_P_T:     float = 0.10   # reduced transition when hint was used

# ── Mastery / zone thresholds ────────────────────────────────────────────────

MASTERY_THRESHOLD:    float = 0.85   # P(L) >= this → node mastered
CHALLENGE_THRESHOLD:  float = 0.70   # P(L) >= this → hard_question
SCAFFOLD_THRESHOLD:   float = 0.40   # P(L) <  this → scaffold zone

# ── Target difficulty midpoints for candidate scoring ────────────────────────
# Used in difficulty_match = 1.0 - |P(L) - target|

TARGET_DIFFICULTY = {
    "scaffold":  0.30,   # P(L) < 0.40
    "standard":  0.60,   # 0.40 <= P(L) < 0.70
    "challenge": 0.80,   # P(L) >= 0.70
}


# ═════════════════════════════════════════════════════════════════════════════
# POSTERIOR UPDATE
# ═════════════════════════════════════════════════════════════════════════════

def update(
    p_l: float,
    correct: bool,
    p_g: float = DEFAULT_P_G,
    p_s: float = DEFAULT_P_S,
) -> float:
    """
    Apply Bayes' Rule to update P(L) given one observed response.

    Correct:
        P(L|correct) = P(L)*(1-P(S)) / [P(L)*(1-P(S)) + (1-P(L))*P(G)]

    Wrong:
        P(L|wrong) = P(L)*P(S) / [P(L)*P(S) + (1-P(L))*(1-P(G))]

    Args:
        p_l:     Current mastery probability P(L_t).
        correct: True if the student answered correctly.
        p_g:     Guess probability for this item.
        p_s:     Slip probability for this item.

    Returns:
        Updated posterior P(L | observation).
    """
    if correct:
        numerator   = p_l * (1.0 - p_s)
        denominator = numerator + (1.0 - p_l) * p_g
    else:
        numerator   = p_l * p_s
        denominator = numerator + (1.0 - p_l) * (1.0 - p_g)

    # Guard against degenerate denominator (should never happen with valid params)
    if denominator == 0.0:
        return p_l

    return numerator / denominator


def transition(
    p_l_posterior: float,
    hint_used: bool = False,
    p_t: float = DEFAULT_P_T,
) -> float:
    """
    Apply the learning transition step.

    P(L_next) = P(L|obs) + (1 - P(L|obs)) * P(T)

    If a hint was revealed, P(T) is reduced to HINT_P_T (0.10) to account
    for the scaffolding assistance — learning gain from prompted retrieval
    is weaker than independent retrieval.

    Args:
        p_l_posterior: Posterior after Bayesian update.
        hint_used:     Whether a hint was revealed before answering.
        p_t:           Base transition probability (overridden by HINT_P_T
                       when hint_used is True).

    Returns:
        P(L_{t+1}) after the transition step.
    """
    effective_p_t = HINT_P_T if hint_used else p_t
    p_l_next = p_l_posterior + (1.0 - p_l_posterior) * effective_p_t
    return min(1.0, max(0.0, p_l_next))


def full_update(
    p_l: float,
    correct: bool,
    hint_used: bool = False,
    p_g: float = DEFAULT_P_G,
    p_s: float = DEFAULT_P_S,
    p_t: float = DEFAULT_P_T,
) -> float:
    """
    Convenience: run update() then transition() in one call.

    Returns P(L_{t+1}) ready to persist to bkt_states_col.
    """
    posterior = update(p_l, correct, p_g=p_g, p_s=p_s)
    return transition(posterior, hint_used=hint_used, p_t=p_t)


# ═════════════════════════════════════════════════════════════════════════════
# DIAGNOSTIC INITIALIZATION  (Option 2 — standard BKT from prior)
# ═════════════════════════════════════════════════════════════════════════════

def diagnostic_init(
    correct: bool,
    p_g: float = DEFAULT_P_G,
    p_s: float = DEFAULT_P_S,
    p_t: float = DEFAULT_P_T,
) -> float:
    """
    Treat the diagnostic question as Observation 1, starting from P(L0)=0.10.
    No hard-coded jumps — same BKT formula used everywhere.

    Diagnostic correct:
        P(L|correct) = 0.10*0.90 / (0.10*0.90 + 0.90*0.20) = 0.3333
        P(L1)        = 0.3333 + (1-0.3333)*0.20             ≈ 0.4667
        → Standard Zone (0.40 ≤ P(L) < 0.70)
        → Student skips simple remediation, needs 1-2 more correct to reach 0.85

    Diagnostic wrong:
        P(L|wrong) = 0.10*0.10 / (0.10*0.10 + 0.90*0.80) = 0.0137
        P(L1)      = 0.0137 + (1-0.0137)*0.20             ≈ 0.2110
        → Scaffold Zone (P(L) < 0.40)
        → Student starts with simplified content and easy questions

    Args:
        correct: Whether the student answered the diagnostic question correctly.
        p_g:     Guess probability.
        p_s:     Slip probability.
        p_t:     Transition probability.

    Returns:
        P(L1) — the initialized mastery prior for this concept.
    """
    # Diagnostic is never hint-assisted (it's an assessment, not instruction)
    return full_update(DEFAULT_P_L0, correct, hint_used=False, p_g=p_g, p_s=p_s, p_t=p_t)


def apply_prerequisite_gating(
    child_p_l: float,
    parent_correct_in_diagnostic: bool,
    p_g: float = DEFAULT_P_G,
    p_s: float = DEFAULT_P_S,
    p_t: float = DEFAULT_P_T,
) -> float:
    """
    Prerequisite gating override for diagnostic initialization.

    If a child concept was answered correctly in the diagnostic but its
    parent prerequisite was answered incorrectly, override the child's
    P(L1) to the parent's wrong-answer diagnostic value (≈ 0.2110).

    This keeps the child in the scaffold zone until the parent is cleared
    in the live learning loop.

    Args:
        child_p_l:                    Child's P(L1) after diagnostic_init.
        parent_correct_in_diagnostic: Whether the parent was correct in diagnostic.
        p_g, p_s, p_t:               BKT parameters.

    Returns:
        Gated P(L1) for the child node.
    """
    if not parent_correct_in_diagnostic:
        # Pull child down to the parent's wrong-answer diagnostic value
        return diagnostic_init(correct=False, p_g=p_g, p_s=p_s, p_t=p_t)
    return child_p_l


# ═════════════════════════════════════════════════════════════════════════════
# THRESHOLD HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def is_mastered(p_l: float) -> bool:
    """P(L) >= 0.85 — node is mastered, DAG can advance forward."""
    return p_l >= MASTERY_THRESHOLD


def get_zone(p_l: float) -> str:
    """
    Return the learning zone label for a given P(L).

    Returns:
        "mastered"  — P(L) >= 0.85
        "challenge" — 0.70 <= P(L) < 0.85
        "standard"  — 0.40 <= P(L) < 0.70
        "scaffold"  — P(L) < 0.40
    """
    if p_l >= MASTERY_THRESHOLD:
        return "mastered"
    if p_l >= CHALLENGE_THRESHOLD:
        return "challenge"
    if p_l >= SCAFFOLD_THRESHOLD:
        return "standard"
    return "scaffold"


def get_target_difficulty(p_l: float) -> float:
    """
    Return the target difficulty midpoint for candidate scoring.

    Used in: difficulty_match = 1.0 - |P(L) - target_difficulty|

    Returns:
        0.30 for scaffold zone (P(L) < 0.40)
        0.60 for standard zone (0.40 <= P(L) < 0.70)
        0.80 for challenge zone (P(L) >= 0.70)
    """
    zone = get_zone(p_l)
    if zone in ("mastered", "challenge"):
        return TARGET_DIFFICULTY["challenge"]
    if zone == "standard":
        return TARGET_DIFFICULTY["standard"]
    return TARGET_DIFFICULTY["scaffold"]


def difficulty_match_score(p_l: float) -> float:
    """
    Normalized difficulty match for candidate scoring [0.0, 1.0].

    difficulty_match = 1.0 - |P(L) - target_difficulty|
    """
    target = get_target_difficulty(p_l)
    return max(0.0, 1.0 - abs(p_l - target))
