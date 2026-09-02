"""
adaptive_engine.py — BKT + DAG Adaptive Engine Orchestrator.

Flow summary:
  scaffold zone  → simple/example/prerequisite + easy_question → escalate at 5
  standard zone  → main_explanation + question
  correct on std → hard_question (no re-explanation)
    hard attempt 0 wrong → hard_question + hint
    hard attempt 1 wrong → hard_question + hint + can_skip=True
  challenge zone → main_explanation + hard_question
  mastered       → advance DAG forward
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

W1_KNOWLEDGE_GAP:     float = 0.35
W2_PREREQ_READY:      float = 0.30
W3_DIFFICULTY_MATCH:  float = 0.20
W4_INTEREST_MATCH:    float = 0.15

ESCALATION_THRESHOLD: int = 5
HYBRID_LOOP_THRESHOLD: int = 2

SCAFFOLD_SEQUENCE = {
    0: {"content_type": "main_explanation",   "question_type": "question",      "show_hint": True,  "support_level": 1},
    1: {"content_type": "simple_explanation", "question_type": "easy_question", "show_hint": True,  "support_level": 2},
    2: {"content_type": "example",            "question_type": "easy_question", "show_hint": True,  "support_level": 3},
    3: {"content_type": "prerequisite",       "question_type": "easy_question", "show_hint": True,  "support_level": 4},
}


class Reason:
    PREREQUISITE_GAP    = "PREREQUISITE_GAP"
    LOW_MASTERY         = "LOW_MASTERY"
    READY_FOR_CHALLENGE = "READY_FOR_CHALLENGE"
    EVIDENCE_REQUIRED   = "EVIDENCE_REQUIRED"
    HINT_DEPENDENT      = "HINT_DEPENDENT"
    ESCALATED           = "ESCALATED"
    UNIT_COMPLETE       = "UNIT_COMPLETE"
    POST_CORRECT_HARD   = "POST_CORRECT_HARD"


@dataclass
class NodeState:
    """Per-node student state loaded from bkt_states_col before decide()."""
    subtopic_id:          str
    p_l:                  float = 0.10
    consecutive_wrong:    int   = 0
    hint_dependent:       bool  = False
    easy_pass_count:      int   = 0
    standard_fail_count:  int   = 0
    hard_question_attempt: int  = 0  # times hard question failed after standard correct
    std_question_index:   int   = 0  # 0 = first standard question, 1 = second standard question


@dataclass
class EngineDecision:
    """Everything main.py needs to build the next-activity response."""
    subtopic_id:    str
    action:         str
    reason:         str
    message:        str
    content_type:   Optional[str]  # None = skip explanation, serve only question
    question_type:  str
    show_hint:      bool
    support_level:  int
    p_l:            float
    zone:           str
    can_skip:       bool  = False   # show "Go to next topic" button on frontend
    hint_dependent: bool  = False
    dag_action:     str   = "stay"
    remediation_target: Optional[str] = None
    escalated:      bool  = False
    std_question_index: int  = 0    # which standard question index to serve (0 or 1)
    serve_hard:     bool  = False   # True when engine wants a hard_question served


def score_candidate(
    subtopic_id: str,
    p_l: float,
    dag: CurriculumDAG,
    mastery_map: Dict[str, float],
    interest_tag: Optional[str],
    available_interest_subtopics: Optional[List[str]] = None,
) -> float:
    """Compute the 4-term weighted candidate score for a DAG node."""
    knowledge_gap  = 1.0 - p_l
    prereq_ready   = 1.0 if dag.all_prerequisites_mastered(subtopic_id, mastery_map) else 0.0
    diff_match     = difficulty_match_score(p_l)
    interest_match = (
        1.0 if (available_interest_subtopics and subtopic_id in available_interest_subtopics)
        else 0.5
    )
    return round(
        W1_KNOWLEDGE_GAP    * knowledge_gap
        + W2_PREREQ_READY   * prereq_ready
        + W3_DIFFICULTY_MATCH * diff_match
        + W4_INTEREST_MATCH * interest_match,
        6,
    )


def select_next_node(
    dag: CurriculumDAG,
    mastery_map: Dict[str, float],
    interest_tag: Optional[str] = None,
    available_interest_subtopics: Optional[List[str]] = None,
) -> Optional[str]:
    """Score all unlocked unmastered nodes and return the best candidate."""
    candidates = dag.get_unlocked_nodes(mastery_map)
    if not candidates:
        return None
    scored = [
        (sid, score_candidate(sid, mastery_map.get(sid, 0.0), dag, mastery_map,
                              interest_tag, available_interest_subtopics))
        for sid in candidates
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[0][0]


def check_hybrid_loop(state: NodeState) -> bool:
    """Detect stuck-in-loop: passes easy but fails standard >= 2 cycles."""
    return (
        state.easy_pass_count   >= HYBRID_LOOP_THRESHOLD
        and state.standard_fail_count >= HYBRID_LOOP_THRESHOLD
        and not state.hint_dependent
    )


def update_hybrid_counters(state: NodeState, question_type_shown: str, correct: bool) -> NodeState:
    """Update hybrid layer counters after a submission."""
    if question_type_shown == "easy_question" and correct:
        state.easy_pass_count += 1
    elif question_type_shown in ("question", "hard_question") and not correct:
        state.standard_fail_count += 1
    elif question_type_shown in ("question", "hard_question") and correct:
        state.easy_pass_count     = 0
        state.standard_fail_count = 0
        state.hint_dependent      = False
    if check_hybrid_loop(state):
        state.hint_dependent = True
    return state


def decide(
    current_subtopic_id: str,
    state: NodeState,
    dag: CurriculumDAG,
    mastery_map: Dict[str, float],
    interest_tag: Optional[str] = None,
    available_interest_subtopics: Optional[List[str]] = None,
) -> EngineDecision:
    """
    Core decision: what does the student see next?

    Order: escalation → mastery → prereq gap → hybrid → zone routing.
    Standard-zone correct answer triggers hard question flow tracked by
    hard_question_attempt before zone routing runs.
    """
    p_l  = state.p_l
    zone = get_zone(p_l)
    cw   = state.consecutive_wrong
    hqa  = state.hard_question_attempt

    # ── 1. Escalation ────────────────────────────────────────────────────────
    if cw >= ESCALATION_THRESHOLD:
        return EngineDecision(
            subtopic_id=current_subtopic_id,
            action="escalate", reason=Reason.ESCALATED,
            message="Great effort! Your teacher will help you with this one 🙌",
            content_type="prerequisite", question_type="easy_question",
            show_hint=True, support_level=5, p_l=p_l, zone=zone, escalated=True,
        )

    # ── 2. Mastery ────────────────────────────────────────────────────────────
    if zone == "mastered":
        updated_mastery = {**mastery_map, current_subtopic_id: p_l}
        forward = dag.get_forward_target(current_subtopic_id, updated_mastery)
        if forward is None:
            return EngineDecision(
                subtopic_id=current_subtopic_id,
                action="complete", reason=Reason.UNIT_COMPLETE,
                message="🎉 You've mastered everything in this unit!",
                content_type="main_explanation", question_type="question",
                show_hint=False, support_level=0, p_l=p_l, zone=zone,
                dag_action="complete",
            )
        return EngineDecision(
            subtopic_id=forward,
            action="advance", reason=Reason.EVIDENCE_REQUIRED,
            message="Great work! Moving to the next concept 🚀",
            content_type="main_explanation", question_type="question",
            show_hint=False, support_level=0,
            p_l=mastery_map.get(forward, 0.0),
            zone=get_zone(mastery_map.get(forward, 0.0)),
            dag_action="forward",
        )

    # ── 3. Prerequisite gap ───────────────────────────────────────────────────
    remediation_triggered = (
        zone == "scaffold"
        and not dag.all_prerequisites_mastered(current_subtopic_id, mastery_map)
    )
    if remediation_triggered:
        target = dag.get_remediation_target(current_subtopic_id, mastery_map)
        if target is not None:
            return EngineDecision(
                subtopic_id=target,
                action="prerequisite", reason=Reason.PREREQUISITE_GAP,
                message="Let's go back to the basics first 📖",
                content_type="prerequisite", question_type="easy_question",
                show_hint=True, support_level=4,
                p_l=mastery_map.get(target, 0.0),
                zone=get_zone(mastery_map.get(target, 0.0)),
                dag_action="backward", remediation_target=target,
            )

    # ── 4. Hybrid layer ───────────────────────────────────────────────────────
    if state.hint_dependent:
        return EngineDecision(
            subtopic_id=current_subtopic_id,
            action="guided_example", reason=Reason.HINT_DEPENDENT,
            message="Let me walk you through a guided example 🧭",
            content_type="example", question_type="easy_question",
            show_hint=True, support_level=3, p_l=p_l, zone=zone,
            hint_dependent=True,
        )
    # ── 5. Zone routing ──
    sqi = state.std_question_index  # 0, 1, or 2
    serve_hard_now = (zone == "challenge") or (hqa > 0)

    if serve_hard_now:
        # attempt 0 -> hard question, no hint
        # attempt >= 1 -> hard question + hint + CAN_SKIP enabled
        show_hint = hqa >= 1
        can_skip = hqa >= 1  # Student can move on immediately after failing with hint
        msg = (
            "You're doing great! Let's push further with a challenge 💪" if hqa == 0 else
            "Here's a hint to help you crack this edge case 💡" if hqa == 1 else
            "Take your time — or skip forward to the next topic 🙌"
        )
        return EngineDecision(
            subtopic_id=current_subtopic_id,
            action="challenge",
            reason=Reason.POST_CORRECT_HARD if hqa > 0 else Reason.READY_FOR_CHALLENGE,
            message=msg,
            content_type=None,  # No re-explanation, jump straight to question
            question_type="hard_question",
            show_hint=show_hint, support_level=0,
            p_l=p_l, zone=zone, can_skip=can_skip,
            std_question_index=0, serve_hard=True,
        )

    # Standard zone — progression across the 3 pool questions
    if zone == "standard":
        if cw > 0:
            # Re-attempting standard question: re-show explanation card
            return EngineDecision(
                subtopic_id=current_subtopic_id,
                action="standard", reason=Reason.EVIDENCE_REQUIRED,
                message="Not quite — review the rule and try again 🔄",
                content_type="main_explanation", question_type="question",
                show_hint=False, support_level=0, p_l=p_l, zone=zone,
                std_question_index=sqi, serve_hard=False,
            )
        if sqi == 0:
            # First time on subtopic: show explanation + std_q[0]
            return EngineDecision(
                subtopic_id=current_subtopic_id,
                action="standard", reason=Reason.EVIDENCE_REQUIRED,
                message="Let's test your understanding with this code snippet 📝",
                content_type="main_explanation", question_type="question",
                show_hint=False, support_level=0, p_l=p_l, zone=zone,
                std_question_index=0, serve_hard=False,
            )
        # sqi is 1 or 2: already saw explanation; serve question directly (content_type=None)
        return EngineDecision(
            subtopic_id=current_subtopic_id,
            action="standard", reason=Reason.EVIDENCE_REQUIRED,
            message=f"Nice job! Let's try question {sqi + 1} 🎯",
            content_type=None, question_type="question",
            show_hint=False, support_level=0, p_l=p_l, zone=zone,
            std_question_index=sqi, serve_hard=False,
        )

    # Scaffold zone — step through support sequence
    step = min(cw, max(SCAFFOLD_SEQUENCE.keys()))
    seq  = SCAFFOLD_SEQUENCE[step]
    action_map  = {0: "hint", 1: "reteach", 2: "example", 3: "prerequisite_review"}
    message_map = {
        0: "Not quite — here's a hint to help you 💬",
        1: "Let me explain this a different way 🔄",
        2: "Let me show you a real-world example 💡",
        3: "Let's go back to the basics first 📖",
    }
    return EngineDecision(
        subtopic_id=current_subtopic_id,
        action=action_map.get(step, "reteach"),
        reason=Reason.LOW_MASTERY,
        message=message_map.get(step, "Let's try again 🔄"),
        content_type=seq["content_type"],
        question_type=seq["question_type"],
        show_hint=seq["show_hint"],
        support_level=seq["support_level"],
        p_l=p_l, zone=zone,
    )


def compute_post_submission_state(
    state: NodeState,
    correct: bool,
    question_type_shown: str,
    new_p_l: float,
    transitioning_node: bool = False,
) -> NodeState:
    """Update NodeState after submission — handles standard 0->1->2 advancement and hard flow."""
    state.p_l = new_p_l

    if correct or transitioning_node:
        state.consecutive_wrong = 0

        if correct and question_type_shown == "question":
            # Advance through the 3-question standard pool (0 -> 1 -> 2)
            if state.std_question_index < 2:
                state.std_question_index += 1
                state.hard_question_attempt = 0
            else:
                # Completed all 3 standard questions; cycle index and prepare for hard
                state.std_question_index = 0
                state.hard_question_attempt = 0

        elif correct and question_type_shown == "hard_question":
            state.hard_question_attempt = 0
            state.std_question_index = 0

    else:
        state.consecutive_wrong += 1

        if question_type_shown == "question":
            # Standard question wrong: stay on current index for re-attempt
            state.hard_question_attempt = 0

        elif question_type_shown == "hard_question":
            # Hard question failed
            state.hard_question_attempt += 1

    state = update_hybrid_counters(state, question_type_shown, correct)
    return state


def decide_legacy(consecutive_wrong: int) -> dict:
    """Thin legacy shim — DEPRECATED, use decide()."""
    if consecutive_wrong >= 5:
        return {"action": "escalate",    "content_type": "prerequisite",       "question_type": "easy_question", "show_hint": True,  "message": "Great effort! Your teacher will help you 🙌"}
    if consecutive_wrong == 4:
        return {"action": "prerequisite","content_type": "prerequisite",       "question_type": "easy_question", "show_hint": True,  "message": "Let's go back to the basics 📖"}
    if consecutive_wrong == 3:
        return {"action": "example",     "content_type": "example",            "question_type": "easy_question", "show_hint": True,  "message": "Let me show you a real-world example 💡"}
    if consecutive_wrong == 2:
        return {"action": "reteach",     "content_type": "simple_explanation", "question_type": "easy_question", "show_hint": True,  "message": "Let me explain this a different way 🔄"}
    if consecutive_wrong == 1:
        return {"action": "hint",        "content_type": "main_explanation",   "question_type": "question",      "show_hint": True,  "message": "Not quite — here's a hint 💬"}
    return     {"action": "correct",     "content_type": "main_explanation",   "question_type": "question",      "show_hint": False, "message": "Correct! Moving on 🎉"}
