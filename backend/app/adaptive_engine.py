"""
adaptive_engine.py — BKT + DAG Adaptive Engine Orchestrator.

Replaces the previous rule-based consecutive_wrong counter with a
mathematically grounded engine that combines:

  1. BKT (bkt.py)  — continuous P(L) belief state per concept node
  2. DAG (dag.py)  — prerequisite-gated curriculum graph navigation
  3. Scaffolding   — P(L)-zone-driven content/question selection
  4. Hybrid layer  — detects stuck-in-loop states (hint_dependent)
  5. Candidate scoring — 4-weighted-term ranking for next node selection

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCAFFOLDING DECISION (P(L)-governed, NOT counter-governed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
P(L) zone              consecutive_wrong   Action
─────────────────────  ─────────────────   ──────────────────────────
>= 0.85 (mastered)     any                 advance DAG forward
>= 0.70 (challenge)    < 5                 main_explanation + hard_question
0.40-0.70 (standard)   < 5                 main_explanation + question
< 0.40 (scaffold)      < 5                 see scaffolding sequence below
any                    >= 5                ESCALATE (lock, log)

Within the scaffold zone, consecutive_wrong selects the support asset
to avoid repeating identical content:
  0  → hint revealed on standard question
  1  → simple_explanation + easy_question
  2  → example (interest-tagged) + easy_question
  3  → prerequisite micro-lesson + easy_question (+ DAG backward check)
  >= 5 → escalate

consecutive_wrong is ONLY an asset-step selector and escalation limiter
inside the scaffold zone. It never directly selects content outside it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CANDIDATE SCORING  (which node to present next)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score = 0.35*(1 - P(L))              # w1: Knowledge Gap
      + 0.30*prerequisite_ready       # w2: 1.0 if all parents >= 0.85 else 0.0
      + 0.20*difficulty_match         # w3: 1.0 - |P(L) - target_difficulty|
      + 0.15*interest_match           # w4: 1.0 if interest asset exists else 0.5

All terms normalized to [0.0, 1.0]. Pedagogical necessity (w1+w2=0.65)
always dominates presentation preference (w3+w4=0.35).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HYBRID LAYER  (loop detection)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trigger: student passes easy_question but fails standard question >= 2 cycles.
Effect: hint_dependent = True, difficulty held, serve guided example before retry.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESET RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
consecutive_wrong resets to 0 when:
  - Any correct answer is submitted
  - Engine transitions to a new DAG node (forward OR backward)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REASON CODES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREREQUISITE_GAP       — redirected to unmastered parent node
LOW_MASTERY            — P(L) < 0.40, scaffold zone active
READY_FOR_CHALLENGE    — P(L) >= 0.70, hard question served
EVIDENCE_REQUIRED      — P(L) in standard zone, standard question
HINT_DEPENDENT         — hybrid layer active, guided example served
ESCALATED              — 5+ consecutive failures, teacher notified
UNIT_COMPLETE          — all nodes mastered
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from app.bkt import (
    get_zone,
    difficulty_match_score,
    MASTERY_THRESHOLD,
    CHALLENGE_THRESHOLD,
    SCAFFOLD_THRESHOLD,
)
from app.dag import CurriculumDAG


# ═════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═════════════════════════════════════════════════════════════════════════════

# Candidate scoring weights (must sum to 1.0)
W1_KNOWLEDGE_GAP:        float = 0.35
W2_PREREQ_READY:         float = 0.30
W3_DIFFICULTY_MATCH:     float = 0.20
W4_INTEREST_MATCH:       float = 0.15

# Escalation threshold
ESCALATION_THRESHOLD:    int   = 5

# Hybrid layer: how many easy-pass/standard-fail cycles before hint_dependent
HYBRID_LOOP_THRESHOLD:   int   = 2

# Support asset sequence within scaffold zone (consecutive_wrong → content_type)
# Index = consecutive_wrong value at time of request
SCAFFOLD_SEQUENCE = {
    0: {"content_type": "main_explanation",   "question_type": "question",      "show_hint": True,  "support_level": 1},
    1: {"content_type": "simple_explanation", "question_type": "easy_question", "show_hint": True,  "support_level": 2},
    2: {"content_type": "example",            "question_type": "easy_question", "show_hint": True,  "support_level": 3},
    3: {"content_type": "prerequisite",       "question_type": "easy_question", "show_hint": True,  "support_level": 4},
}

# Reason codes
class Reason:
    PREREQUISITE_GAP    = "PREREQUISITE_GAP"
    LOW_MASTERY         = "LOW_MASTERY"
    READY_FOR_CHALLENGE = "READY_FOR_CHALLENGE"
    EVIDENCE_REQUIRED   = "EVIDENCE_REQUIRED"
    HINT_DEPENDENT      = "HINT_DEPENDENT"
    ESCALATED           = "ESCALATED"
    UNIT_COMPLETE       = "UNIT_COMPLETE"


# ═════════════════════════════════════════════════════════════════════════════
# STUDENT NODE STATE
# ═════════════════════════════════════════════════════════════════════════════

@dataclass
class NodeState:
    """
    Snapshot of a student's state on a single concept node.
    Loaded from bkt_states_col before calling decide().
    """
    subtopic_id:        str
    p_l:                float        # current mastery probability
    consecutive_wrong:  int   = 0
    hint_dependent:     bool  = False
    easy_pass_count:    int   = 0    # passes on easy_question (hybrid layer tracker)
    standard_fail_count: int  = 0    # fails on standard question (hybrid layer tracker)


# ═════════════════════════════════════════════════════════════════════════════
# DECISION RESULT
# ═════════════════════════════════════════════════════════════════════════════

@dataclass
class EngineDecision:
    """
    Everything main.py needs to build the next-activity response.
    Backward-compatible: fields used by the old engine are preserved.
    """
    # Core routing
    subtopic_id:    str
    action:         str          # hint / reteach / example / prerequisite / escalate / advance / challenge / standard
    reason:         str          # Reason code
    message:        str          # Friendly UI message (never shows technical terms)

    # Content selection
    content_type:   str          # Which content piece to fetch
    question_type:  str          # question / easy_question / hard_question
    show_hint:      bool
    support_level:  int          # 0-5

    # BKT state
    p_l:            float
    zone:           str          # mastered / challenge / standard / scaffold

    # Hybrid layer
    hint_dependent: bool = False

    # DAG navigation
    dag_action:     str  = "stay"   # stay / forward / backward
    remediation_target: Optional[str] = None  # subtopic_id if backward

    # Escalation
    escalated:      bool = False


# ═════════════════════════════════════════════════════════════════════════════
# CANDIDATE SCORING
# ═════════════════════════════════════════════════════════════════════════════

def score_candidate(
    subtopic_id: str,
    p_l: float,
    dag: CurriculumDAG,
    mastery_map: Dict[str, float],
    interest_tag: Optional[str],
    available_interest_subtopics: Optional[List[str]] = None,
) -> float:
    """
    Compute the 4-term weighted candidate score for a node.

    Score = 0.35*(1-P(L)) + 0.30*prereq_ready + 0.20*diff_match + 0.15*interest_match

    All terms are in [0.0, 1.0].

    Args:
        subtopic_id:                  Node being scored.
        p_l:                          Current P(L) for this node.
        dag:                          CurriculumDAG instance.
        mastery_map:                  All students P(L) values.
        interest_tag:                 Student's selected interest (gaming/sports/music/cartoon).
        available_interest_subtopics: List of subtopic_ids that have interest-tagged assets.
                                      If None, interest_match defaults to 0.5 for all.

    Returns:
        Score in [0.0, 1.0].
    """
    # w1: Knowledge Gap — highest gap = highest priority
    knowledge_gap = 1.0 - p_l

    # w2: Prerequisite Readiness — binary: all parents mastered or not
    prereq_ready = 1.0 if dag.all_prerequisites_mastered(subtopic_id, mastery_map) else 0.0

    # w3: Difficulty Match — how well the node's zone aligns with available content
    diff_match = difficulty_match_score(p_l)

    # w4: Interest Match — tiebreaker
    if available_interest_subtopics is None:
        interest_match = 0.5  # default fallback when we cannot check assets
    else:
        interest_match = 1.0 if subtopic_id in available_interest_subtopics else 0.5

    score = (
        W1_KNOWLEDGE_GAP    * knowledge_gap
        + W2_PREREQ_READY   * prereq_ready
        + W3_DIFFICULTY_MATCH * diff_match
        + W4_INTEREST_MATCH * interest_match
    )
    return round(score, 6)


def select_next_node(
    dag: CurriculumDAG,
    mastery_map: Dict[str, float],
    interest_tag: Optional[str] = None,
    available_interest_subtopics: Optional[List[str]] = None,
) -> Optional[str]:
    """
    Score all unlocked, unmastered nodes and return the highest-scoring one.

    Args:
        dag:                          CurriculumDAG instance.
        mastery_map:                  All student P(L) values.
        interest_tag:                 Student interest tag.
        available_interest_subtopics: Subtopic_ids with interest-tagged content.

    Returns:
        subtopic_id of the best candidate, or None if all nodes are mastered.
    """
    candidates = dag.get_unlocked_nodes(mastery_map)
    if not candidates:
        return None

    scored = [
        (sid, score_candidate(
            sid,
            mastery_map.get(sid, 0.0),
            dag,
            mastery_map,
            interest_tag,
            available_interest_subtopics,
        ))
        for sid in candidates
    ]
    # Sort descending by score, stable (topological order is tiebreaker via candidates ordering)
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[0][0]


# ═════════════════════════════════════════════════════════════════════════════
# HYBRID LAYER
# ═════════════════════════════════════════════════════════════════════════════

def check_hybrid_loop(state: NodeState) -> bool:
    """
    Detect stuck-in-loop state:
      Student passes easy_question but fails standard question >= 2 cycles.

    When triggered, set hint_dependent=True to hold difficulty and serve
    a guided example before the next standard question attempt.

    Args:
        state: Current NodeState for the node being evaluated.

    Returns:
        True if the hybrid loop condition is met and hint_dependent should be set.
    """
    return (
        state.easy_pass_count  >= HYBRID_LOOP_THRESHOLD
        and state.standard_fail_count >= HYBRID_LOOP_THRESHOLD
        and not state.hint_dependent
    )


def update_hybrid_counters(
    state: NodeState,
    question_type_shown: str,
    correct: bool,
) -> NodeState:
    """
    Update the hybrid layer counters after a submission.

    Rules:
      - easy_question + correct   → increment easy_pass_count
      - question + wrong          → increment standard_fail_count
      - Any correct on standard   → reset both counters (loop broken)
      - hint_dependent + correct on standard → clear hint_dependent

    Args:
        state:               Current NodeState.
        question_type_shown: "question" / "easy_question" / "hard_question"
        correct:             Whether the student answered correctly.

    Returns:
        Updated NodeState (mutated in place, also returned for convenience).
    """
    if question_type_shown == "easy_question" and correct:
        state.easy_pass_count += 1

    elif question_type_shown in ("question", "hard_question") and not correct:
        state.standard_fail_count += 1

    elif question_type_shown in ("question", "hard_question") and correct:
        # Loop broken by correct standard answer — reset hybrid counters
        state.easy_pass_count    = 0
        state.standard_fail_count = 0
        state.hint_dependent     = False

    # Check and set hint_dependent
    if check_hybrid_loop(state):
        state.hint_dependent = True

    return state


# ═════════════════════════════════════════════════════════════════════════════
# MAIN DECISION FUNCTION
# ═════════════════════════════════════════════════════════════════════════════

def decide(
    current_subtopic_id: str,
    state: NodeState,
    dag: CurriculumDAG,
    mastery_map: Dict[str, float],
    interest_tag: Optional[str] = None,
    available_interest_subtopics: Optional[List[str]] = None,
) -> EngineDecision:
    """
    Core decision function — determines what the student should see next.

    Called by GET /api/student/next-activity after loading BKT states and
    the DAG config from the database.

    Decision order:
      1. Escalation check (consecutive_wrong >= 5) — highest priority
      2. Mastery check (P(L) >= 0.85) — advance DAG forward
      3. Prerequisite gap check — backward remediation
      4. Hybrid layer check — hint_dependent content
      5. P(L) zone routing — challenge / standard / scaffold

    Args:
        current_subtopic_id:          The node currently active for this student.
        state:                        NodeState loaded from bkt_states_col.
        dag:                          CurriculumDAG loaded from dag_config_col.
        mastery_map:                  All P(L) values for this student in this unit.
        interest_tag:                 Student's interest tag (or None).
        available_interest_subtopics: Subtopic_ids with interest-tagged assets.

    Returns:
        EngineDecision with all fields needed by main.py.
    """
    p_l  = state.p_l
    zone = get_zone(p_l)
    cw   = state.consecutive_wrong

    # ── 1. Escalation — consecutive_wrong >= 5 ───────────────────────────────
    if cw >= ESCALATION_THRESHOLD:
        return EngineDecision(
            subtopic_id=current_subtopic_id,
            action="escalate",
            reason=Reason.ESCALATED,
            message="Great effort! Your teacher will help you with this one 🙌",
            content_type="prerequisite",
            question_type="easy_question",
            show_hint=True,
            support_level=5,
            p_l=p_l,
            zone=zone,
            escalated=True,
        )

    # ── 2. Mastery — P(L) >= 0.85 ────────────────────────────────────────────
    if zone == "mastered":
        # Update mastery_map with this node's confirmed mastery before traversal
        updated_mastery = {**mastery_map, current_subtopic_id: p_l}
        forward = dag.get_forward_target(current_subtopic_id, updated_mastery)

        if forward is None:
            return EngineDecision(
                subtopic_id=current_subtopic_id,
                action="complete",
                reason=Reason.UNIT_COMPLETE,
                message="🎉 You've mastered everything in this unit!",
                content_type="main_explanation",
                question_type="question",
                show_hint=False,
                support_level=0,
                p_l=p_l,
                zone=zone,
                dag_action="complete",
            )

        return EngineDecision(
            subtopic_id=forward,
            action="advance",
            reason=Reason.EVIDENCE_REQUIRED,
            message="Great work! Moving to the next concept 🚀",
            content_type="main_explanation",
            question_type="question",
            show_hint=False,
            support_level=0,
            p_l=mastery_map.get(forward, 0.0),
            zone=get_zone(mastery_map.get(forward, 0.0)),
            dag_action="forward",
        )

    # ── 3. Prerequisite gap — backward remediation ───────────────────────────
    # Trigger when: P(L) < 0.40 AND scaffold step 3 (prerequisite) OR
    # any time a parent is unmastered and student is consistently failing.
    remediation_triggered = (
        zone == "scaffold"
        and cw >= 3
        and not dag.all_prerequisites_mastered(current_subtopic_id, mastery_map)
    )

    if not remediation_triggered:
        # Also check proactively: any unmastered parent with student in scaffold zone
        remediation_triggered = (
            zone == "scaffold"
            and not dag.all_prerequisites_mastered(current_subtopic_id, mastery_map)
        )

    if remediation_triggered:
        target = dag.get_remediation_target(current_subtopic_id, mastery_map)
        if target is not None:
            return EngineDecision(
                subtopic_id=target,
                action="prerequisite",
                reason=Reason.PREREQUISITE_GAP,
                message="Let's go back to the basics first 📖",
                content_type="prerequisite",
                question_type="easy_question",
                show_hint=True,
                support_level=4,
                p_l=mastery_map.get(target, 0.0),
                zone=get_zone(mastery_map.get(target, 0.0)),
                dag_action="backward",
                remediation_target=target,
            )

    # ── 4. Hybrid layer — hint_dependent ─────────────────────────────────────
    if state.hint_dependent:
        return EngineDecision(
            subtopic_id=current_subtopic_id,
            action="guided_example",
            reason=Reason.HINT_DEPENDENT,
            message="Let me walk you through a guided example 🧭",
            content_type="example",
            question_type="easy_question",
            show_hint=True,
            support_level=3,
            p_l=p_l,
            zone=zone,
            hint_dependent=True,
        )

    # ── 5. P(L) zone routing ──────────────────────────────────────────────────

    # Challenge zone: P(L) >= 0.70
    if zone == "challenge":
        return EngineDecision(
            subtopic_id=current_subtopic_id,
            action="challenge",
            reason=Reason.READY_FOR_CHALLENGE,
            message="You're doing great! Here's a harder question 💪",
            content_type="main_explanation",
            question_type="hard_question",
            show_hint=False,
            support_level=0,
            p_l=p_l,
            zone=zone,
        )

    # Standard zone: 0.40 <= P(L) < 0.70
    if zone == "standard":
        return EngineDecision(
            subtopic_id=current_subtopic_id,
            action="standard",
            reason=Reason.EVIDENCE_REQUIRED,
            message="Keep going! Let's test your understanding 📝",
            content_type="main_explanation",
            question_type="question",
            show_hint=False,
            support_level=0,
            p_l=p_l,
            zone=zone,
        )

    # Scaffold zone: P(L) < 0.40
    # Select support asset by consecutive_wrong position in SCAFFOLD_SEQUENCE
    step = min(cw, max(SCAFFOLD_SEQUENCE.keys()))  # cap at last defined step
    seq  = SCAFFOLD_SEQUENCE[step]

    action_map = {0: "hint", 1: "reteach", 2: "example", 3: "prerequisite_review"}
    action     = action_map.get(step, "reteach")

    message_map = {
        0: "Not quite — here's a hint to help you 💬",
        1: "Let me explain this a different way 🔄",
        2: "Let me show you a real-world example 💡",
        3: "Let's go back to the basics first 📖",
    }
    message = message_map.get(step, "Let's try again 🔄")

    return EngineDecision(
        subtopic_id=current_subtopic_id,
        action=action,
        reason=Reason.LOW_MASTERY,
        message=message,
        content_type=seq["content_type"],
        question_type=seq["question_type"],
        show_hint=seq["show_hint"],
        support_level=seq["support_level"],
        p_l=p_l,
        zone=zone,
    )


# ═════════════════════════════════════════════════════════════════════════════
# POST-SUBMISSION STATE UPDATE
# ═════════════════════════════════════════════════════════════════════════════

def compute_post_submission_state(
    state: NodeState,
    correct: bool,
    question_type_shown: str,
    new_p_l: float,
    transitioning_node: bool = False,
) -> NodeState:
    """
    Update NodeState fields after a student submits an answer.

    Called by POST /api/student/submit-answer after bkt.full_update() has
    already computed new_p_l. This function handles:
      - consecutive_wrong reset on correct answer or node transition
      - consecutive_wrong increment on wrong answer
      - hybrid layer counter updates
      - hint_dependent resolution on correct standard answer

    Args:
        state:                Current NodeState (will be mutated).
        correct:              Whether the answer was correct.
        question_type_shown:  "question" / "easy_question" / "hard_question"
        new_p_l:              P(L) after bkt.full_update().
        transitioning_node:   True if the engine is moving to a new DAG node
                              (mastery crossed 0.85 or backward remediation).
                              Reset rules apply regardless of correct/wrong.

    Returns:
        Updated NodeState.
    """
    state.p_l = new_p_l

    # Reset consecutive_wrong on correct answer or node transition
    if correct or transitioning_node:
        state.consecutive_wrong = 0
    else:
        state.consecutive_wrong += 1

    # Update hybrid layer counters
    state = update_hybrid_counters(state, question_type_shown, correct)

    return state


# ═════════════════════════════════════════════════════════════════════════════
# LEGACY COMPATIBILITY SHIM
# ═════════════════════════════════════════════════════════════════════════════

def decide_legacy(consecutive_wrong: int) -> dict:
    """
    Thin compatibility shim matching the old adaptive_engine.decide() signature.
    Only used by any legacy callers that haven't been updated to decide() yet.
    Returns the same dict shape as the original engine.

    DEPRECATED: Use decide() instead.
    """
    if consecutive_wrong >= 5:
        return {
            "action":        "escalate",
            "content_type":  "prerequisite",
            "question_type": "easy_question",
            "show_hint":     True,
            "message":       "Great effort! Your teacher will help you with this one 🙌",
        }
    if consecutive_wrong == 4:
        return {
            "action":        "prerequisite",
            "content_type":  "prerequisite",
            "question_type": "easy_question",
            "show_hint":     True,
            "message":       "Let's go back to the basics first 📖",
        }
    if consecutive_wrong == 3:
        return {
            "action":        "example",
            "content_type":  "example",
            "question_type": "easy_question",
            "show_hint":     True,
            "message":       "Let me show you a real-world example 💡",
        }
    if consecutive_wrong == 2:
        return {
            "action":        "reteach",
            "content_type":  "simple_explanation",
            "question_type": "easy_question",
            "show_hint":     True,
            "message":       "Let me explain this a different way 🔄",
        }
    if consecutive_wrong == 1:
        return {
            "action":        "hint",
            "content_type":  "main_explanation",
            "question_type": "question",
            "show_hint":     True,
            "message":       "Not quite — here's a hint to help you 💬",
        }
    return {
        "action":        "correct",
        "content_type":  "main_explanation",
        "question_type": "question",
        "show_hint":     False,
        "message":       "Correct! Moving on 🎉",
    }
