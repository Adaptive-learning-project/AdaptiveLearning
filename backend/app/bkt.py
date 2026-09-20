"""
bkt.py — Bayesian Knowledge Tracing (BKT) core math.

Calibrated for Early-Childhood Assistive Education (Ages 4–7, IDD demographic):
    P(L0) = 0.20  — Conservative initial mastery prior for developmental milestones.
    P(T)  = 0.10  — Steady learning transition step per trial.
    P(G)  = 0.35  — Guess probability (elevated to reflect dual-choice / 2-option pictorial canvases).
    P(S)  = 0.20  — Slip probability (elevated to accommodate fine motor planning delays & accidental taps).

Prompting / Scaffolding attenuation:
    When a scaffold/hint is used, P(T) is halved to 0.05 to reflect that
    concept execution was assisted (scaffolded retrieval vs. independent retrieval).

Mastery thresholds (aligned with FACP 80% advancement criteria):
    P(L) >= 0.80  → mastered      — meets FACP promotion threshold / advance DAG node
    P(L) >= 0.60  → challenge     — unprompted independent trials
    0.35 <= P(L) < 0.60 → standard — standard trial with auditory reinforcement
    P(L)  < 0.35  → scaffold      — errorless mode / prompt fading (highlight target / eliminate distractor)

Diagnostic initialization:
    Observation 1 starting from P(L0) = 0.20:
    Correct:   P(L|1) = (0.20 * 0.80) / [(0.20 * 0.80) + (0.80 * 0.35)] = 0.16 / 0.44 ≈ 0.3636
               P(L1)  = 0.3636 + (1 - 0.3636) * 0.10 ≈ 0.4273 (Standard Zone)
    Incorrect: P(L|0) = (0.20 * 0.20) / [(0.20 * 0.20) + (0.80 * 0.65)] = 0.04 / 0.56 ≈ 0.0714
               P(L1)  = 0.0714 + (1 - 0.0714) * 0.10 ≈ 0.1643 (Scaffold Zone)
"""

from __future__ import annotations

# ── Calibrated BKT Parameters for IDD Dual-Choice Assistive Setting ──────────

DEFAULT_P_L0: float = 0.20   # initial mastery prior
DEFAULT_P_T:  float = 0.10   # transition (learning gain per step)
DEFAULT_P_G:  float = 0.35   # guess probability (2-choice canvas baseline)
DEFAULT_P_S:  float = 0.20   # slip probability (fine motor tremor / mis-tap allowance)
HINT_P_T:     float = 0.05   # attenuated transition when prompt/cue is used

# ── Mastery / Zone Thresholds ────────────────────────────────────────────────

MASTERY_THRESHOLD:    float = 0.80   # P(L) >= 0.80 → FACP 80% node advancement criterion
CHALLENGE_THRESHOLD:  float = 0.60   # P(L) >= 0.60 → independent unprompted trial
SCAFFOLD_THRESHOLD:   float = 0.35   # P(L) <  0.35 → errorless learning / scaffold zone

# ── Target Difficulty Midpoints for Candidate Scoring ────────────────────────

TARGET_DIFFICULTY = {
    "scaffold":  0.25,   # P(L) < 0.35
    "standard":  0.50,   # 0.35 <= P(L) < 0.60
    "challenge": 0.70,   # P(L) >= 0.60
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
    """
    if correct:
        numerator   = p_l * (1.0 - p_s)
        denominator = numerator + (1.0 - p_l) * p_g
    else:
        numerator   = p_l * p_s
        denominator = numerator + (1.0 - p_l) * (1.0 - p_g)

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

    If a prompt/cue was used, effective transition drops to HINT_P_T (0.05).
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
    """Run Bayesian posterior update followed by transition."""
    posterior = update(p_l, correct, p_g=p_g, p_s=p_s)
    return transition(posterior, hint_used=hint_used, p_t=p_t)


# ═════════════════════════════════════════════════════════════════════════════
# DIAGNOSTIC INITIALIZATION
# ═════════════════════════════════════════════════════════════════════════════

def diagnostic_init(
    correct: bool,
    p_g: float = DEFAULT_P_G,
    p_s: float = DEFAULT_P_S,
    p_t: float = DEFAULT_P_T,
) -> float:
    """
    Initialize skill node from baseline prior P(L0) = 0.20.

    Diagnostic correct → P(L1) ≈ 0.4273 (Standard Zone)
    Diagnostic wrong   → P(L1) ≈ 0.1643 (Scaffold Zone)
    """
    return full_update(DEFAULT_P_L0, correct, hint_used=False, p_g=p_g, p_s=p_s, p_t=p_t)


def apply_prerequisite_gating(
    child_p_l: float,
    parent_correct_in_diagnostic: bool,
    p_g: float = DEFAULT_P_G,
    p_s: float = DEFAULT_P_S,
    p_t: float = DEFAULT_P_T,
) -> float:
    """Prerequisite gating: child node remains in scaffold zone if parent failed."""
    if not parent_correct_in_diagnostic:
        return diagnostic_init(correct=False, p_g=p_g, p_s=p_s, p_t=p_t)
    return child_p_l


# ═════════════════════════════════════════════════════════════════════════════
# THRESHOLD HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def is_mastered(p_l: float) -> bool:
    """P(L) >= 0.80 — concept meets FACP 80% threshold for node promotion."""
    return p_l >= MASTERY_THRESHOLD


def get_zone(p_l: float) -> str:
    """
    Return the learning zone label for a given P(L).

    Returns:
        "mastered"  — P(L) >= 0.80
        "challenge" — 0.60 <= P(L) < 0.80
        "standard"  — 0.35 <= P(L) < 0.60
        "scaffold"  — P(L) < 0.35
    """
    if p_l >= MASTERY_THRESHOLD:
        return "mastered"
    if p_l >= CHALLENGE_THRESHOLD:
        return "challenge"
    if p_l >= SCAFFOLD_THRESHOLD:
        return "standard"
    return "scaffold"


def get_target_difficulty(p_l: float) -> float:
    zone = get_zone(p_l)
    if zone in ("mastered", "challenge"):
        return TARGET_DIFFICULTY["challenge"]
    if zone == "standard":
        return TARGET_DIFFICULTY["standard"]
    return TARGET_DIFFICULTY["scaffold"]


def difficulty_match_score(p_l: float) -> float:
    target = get_target_difficulty(p_l)
    return max(0.0, 1.0 - abs(p_l - target))