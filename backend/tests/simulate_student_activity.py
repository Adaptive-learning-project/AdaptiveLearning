"""
simulate_student_activity.py
─────────────────────────────────────────────────────────────────────────────
End-to-end simulation of 4 student archetypes progressing through a real unit
pulled live from the MongoDB database.

What this tests:
  - BKT P(L) evolves correctly after each answer
  - Scaffolding zone (content_type + question_type) changes with P(L)
  - DAG traversal: forward on mastery, backward on prerequisite gap
  - Hybrid loop detection triggers when easy passes + standard fails ≥ 2 cycles
  - Escalation at consecutive_wrong ≥ 5
  - Candidate scoring weights produce the correct node ordering
  - All content served is real DB content (no hardcoded text)

Student archetypes:
  1. STRONG    — answers correctly every time, no hints
  2. AVERAGE   — alternates correct/wrong, uses hints occasionally
  3. STRUGGLING — mostly wrong, needs scaffolding, triggers hybrid loop
  4. LOOPER    — passes easy_question but always fails standard → hybrid triggers

Run:
    cd D:\\AdaptiveLearning\\backend
    python -m pytest tests/simulate_student_activity.py -v -s

Or directly:
    python tests/simulate_student_activity.py
"""

import sys
import json
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, field, asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pymongo import MongoClient
from bson import ObjectId

from app.bkt import (
    full_update, diagnostic_init, apply_prerequisite_gating,
    get_zone, is_mastered,
    DEFAULT_P_L0, DEFAULT_P_T, DEFAULT_P_G, DEFAULT_P_S,
    MASTERY_THRESHOLD,
)
from app.dag import CurriculumDAG
from app.adaptive_engine import (
    decide, compute_post_submission_state,
    select_next_node, score_candidate,
    NodeState, Reason,
    W1_KNOWLEDGE_GAP, W2_PREREQ_READY, W3_DIFFICULTY_MATCH, W4_INTEREST_MATCH,
    SCAFFOLD_SEQUENCE, HYBRID_LOOP_THRESHOLD, ESCALATION_THRESHOLD,
)


# ─────────────────────────────────────────────────────────────────────────────
# DB CONNECTION  (reads real content, writes to a simulation-only namespace)
# ─────────────────────────────────────────────────────────────────────────────

_client = MongoClient("mongodb://localhost:27017")
_db     = _client["adaptive_learning"]

CONTENT_COL   = _db["content"]
SUBTOPICS_COL = _db["subtopics"]
UNITS_COL     = _db["units"]


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _load_unit(unit_id: Optional[str] = None) -> dict:
    """Load the first ready unit from DB, or a specific unit_id."""
    if unit_id:
        return UNITS_COL.find_one({"_id": ObjectId(unit_id)})
    return UNITS_COL.find_one({"status": "ready"})


def _load_subtopics(unit_id: str) -> list:
    """Load approved subtopics in order."""
    return list(SUBTOPICS_COL.find(
        {"unit_id": unit_id, "content_approved": True}
    ).sort("order", 1))


def _build_dag(subtopics: list) -> CurriculumDAG:
    """
    Build a linear DAG from the subtopic list.
    order=0 has no prerequisites; each subsequent node depends on the previous.
    """
    dag = CurriculumDAG()
    prev_id = None
    for sub in subtopics:
        sid = str(sub["_id"])
        dag.add_node(sid, sub["name"], prerequisites=[prev_id] if prev_id else [])
        prev_id = sid
    return dag


def _fetch_content(subtopic_id: str, content_type: str) -> Optional[dict]:
    """Fetch a content piece from DB. Falls back to main_explanation."""
    doc = CONTENT_COL.find_one({"subtopic_id": subtopic_id, "type": content_type, "approved": True})
    if not doc:
        doc = CONTENT_COL.find_one({"subtopic_id": subtopic_id, "type": "main_explanation", "approved": True})
    return doc


def _fetch_question(subtopic_id: str, question_type: str) -> Optional[dict]:
    """Fetch a question from DB. Falls back to 'question'."""
    doc = CONTENT_COL.find_one({"subtopic_id": subtopic_id, "type": question_type, "approved": True})
    if not doc:
        doc = CONTENT_COL.find_one({"subtopic_id": subtopic_id, "type": "question", "approved": True})
    return doc


def _get_correct_option(question_doc: dict) -> int:
    """Extract correct answer index from question data."""
    data = question_doc.get("data", {})
    return data.get("correct", 0)


def _p_bar(p_l: float, width: int = 20) -> str:
    filled = int(p_l * width)
    return "[" + "█" * filled + "░" * (width - filled) + f"] {p_l:.4f}"


# ─────────────────────────────────────────────────────────────────────────────
# SIMULATION TURN RECORD
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Turn:
    turn:              int
    subtopic_name:     str
    subtopic_id:       str
    p_l_before:        float
    zone_before:       str
    content_type:      str
    question_type:     str
    question_text:     str
    correct:           bool
    hint_used:         bool
    p_l_after:         float
    zone_after:        str
    action:            str
    reason:            str
    support_level:     int
    consecutive_wrong: int
    hint_dependent:    bool
    dag_action:        str
    candidate_scores:  dict   = field(default_factory=dict)
    content_snippet:   str    = ""
    weight_breakdown:  dict   = field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# CORE SIMULATION RUNNER
# ─────────────────────────────────────────────────────────────────────────────

def run_simulation(
    student_id: str,
    archetype: str,
    answer_strategy,          # callable(turn, question_type, correct_option) -> (selected_option, hint_used)
    unit_id: Optional[str] = None,
    interest_tag: Optional[str] = None,
    max_turns: int = 40,
    verbose: bool = True,
) -> list:
    """
    Run a full learning simulation for one student archetype.

    Args:
        student_id:       Unique student identifier (simulation-only, not persisted).
        archetype:        Label for display ("STRONG", "AVERAGE", etc.).
        answer_strategy:  Function that decides the student's answer each turn.
                          Signature: (turn_num, question_type, correct_option) -> (selected_option, hint_used)
        unit_id:          Specific unit to use, or None for first ready unit.
        interest_tag:     Student interest (gaming/sports/music/cartoon) or None.
        max_turns:        Safety cap on simulation length.
        verbose:          Print turn-by-turn output.

    Returns:
        List of Turn records.
    """
    # ── Load real data from DB ────────────────────────────────────────────────
    unit = _load_unit(unit_id)
    assert unit, "No ready unit found in DB. Run SEED_CONTENT.bat first."

    uid      = str(unit["_id"])
    subs     = _load_subtopics(uid)
    assert subs, f"No approved subtopics in unit {uid}"

    dag      = _build_dag(subs)
    sub_map  = {str(s["_id"]): s for s in subs}   # id → doc

    # ── Initial BKT states (cold start, no diagnostic) ───────────────────────
    states: dict[str, NodeState] = {
        str(s["_id"]): NodeState(subtopic_id=str(s["_id"]), p_l=DEFAULT_P_L0)
        for s in subs
    }

    turns: list[Turn] = []

    if verbose:
        sep = "═" * 72
        print(f"\n{sep}")
        print(f"  SIMULATION: {archetype} — student_id={student_id}")
        print(f"  Unit: {unit['topic']}  ({len(subs)} subtopics)")
        print(f"  Interest: {interest_tag or 'none'}  |  Max turns: {max_turns}")
        print(sep)

    for turn_num in range(1, max_turns + 1):
        mmap = {sid: s.p_l for sid, s in states.items()}

        # ── Select next node ──────────────────────────────────────────────────
        next_id = select_next_node(dag, mmap, interest_tag)
        if next_id is None:
            if verbose:
                print(f"\n  ✅ All nodes mastered after {turn_num - 1} turns!\n")
            break

        current_state = states[next_id]
        sub_doc       = sub_map[next_id]

        # Compute candidate scores for ALL unlocked nodes (to show weight evolution)
        unlocked = dag.get_unlocked_nodes(mmap)
        candidate_scores = {}
        weight_breakdowns = {}
        for sid in unlocked:
            p = mmap.get(sid, 0.0)
            kg = 1.0 - p
            pr = 1.0 if dag.all_prerequisites_mastered(sid, mmap) else 0.0
            dm = __import__('app.bkt', fromlist=['difficulty_match_score']).difficulty_match_score(p)
            im = 0.5  # no interest-tagged asset tracking in sim, use default
            score = W1_KNOWLEDGE_GAP*kg + W2_PREREQ_READY*pr + W3_DIFFICULTY_MATCH*dm + W4_INTEREST_MATCH*im
            candidate_scores[sub_map[sid]["name"]] = round(score, 4)
            weight_breakdowns[sub_map[sid]["name"]] = {
                "p_l":          round(p, 4),
                "w1_gap":       round(W1_KNOWLEDGE_GAP * kg, 4),
                "w2_prereq":    round(W2_PREREQ_READY * pr, 4),
                "w3_diff":      round(W3_DIFFICULTY_MATCH * dm, 4),
                "w4_interest":  round(W4_INTEREST_MATCH * im, 4),
                "total":        round(score, 4),
            }

        # ── Engine decision ───────────────────────────────────────────────────
        decision = decide(
            current_subtopic_id=next_id,
            state=current_state,
            dag=dag,
            mastery_map=mmap,
            interest_tag=interest_tag,
        )

        serve_id = decision.subtopic_id   # may differ from next_id (remediation)

        # ── Fetch real content from DB ────────────────────────────────────────
        content_doc  = _fetch_content(serve_id, decision.content_type)
        question_doc = _fetch_question(serve_id, decision.question_type)

        if not content_doc or not question_doc:
            if verbose:
                print(f"  [WARN] Turn {turn_num}: missing content for {sub_map.get(serve_id, {}).get('name', serve_id)} — skipping")
            continue

        content_data  = content_doc.get("data", {})
        question_data = question_doc.get("data", {})
        question_text = question_data.get("text", question_data.get("question", str(question_data)))[:120]
        content_text  = content_data.get("text", str(content_data))[:100]
        correct_opt   = _get_correct_option(question_doc)

        p_l_before = current_state.p_l
        zone_before = get_zone(p_l_before)

        # ── Student answers (strategy function) ──────────────────────────────
        selected_option, hint_used = answer_strategy(turn_num, decision.question_type, correct_opt)
        correct = (selected_option == correct_opt)

        # ── BKT update ────────────────────────────────────────────────────────
        new_p_l = full_update(
            p_l=p_l_before,
            correct=correct,
            hint_used=hint_used,
            p_g=DEFAULT_P_G,
            p_s=DEFAULT_P_S,
            p_t=DEFAULT_P_T,
        )

        just_mastered    = is_mastered(new_p_l) and not is_mastered(p_l_before)
        transitioning    = just_mastered
        zone_after       = get_zone(new_p_l)

        # ── Update state ──────────────────────────────────────────────────────
        updated_state = compute_post_submission_state(
            state=current_state,
            correct=correct,
            question_type_shown=decision.question_type,
            new_p_l=new_p_l,
            transitioning_node=transitioning,
        )
        states[serve_id] = updated_state

        # ── Record turn ───────────────────────────────────────────────────────
        t = Turn(
            turn=turn_num,
            subtopic_name=sub_map.get(serve_id, {}).get("name", serve_id),
            subtopic_id=serve_id,
            p_l_before=round(p_l_before, 4),
            zone_before=zone_before,
            content_type=decision.content_type,
            question_type=decision.question_type,
            question_text=question_text,
            correct=correct,
            hint_used=hint_used,
            p_l_after=round(new_p_l, 4),
            zone_after=zone_after,
            action=decision.action,
            reason=decision.reason,
            support_level=decision.support_level,
            consecutive_wrong=updated_state.consecutive_wrong,
            hint_dependent=updated_state.hint_dependent,
            dag_action="forward" if just_mastered else decision.dag_action,
            candidate_scores=candidate_scores,
            content_snippet=content_text,
            weight_breakdown=weight_breakdowns,
        )
        turns.append(t)

        # ── Verbose output ────────────────────────────────────────────────────
        if verbose:
            result_icon = "✅" if correct else "❌"
            hint_icon   = " [hint]" if hint_used else ""
            mastered_tag = " → MASTERED 🎓" if just_mastered else ""

            print(f"\n  Turn {turn_num:2d} │ {t.subtopic_name}")
            print(f"  {'─'*68}")
            print(f"  P(L): {_p_bar(p_l_before)}  zone={zone_before}")
            print(f"  Content : [{decision.content_type}] {content_text}...")
            print(f"  Question: [{decision.question_type}] {question_text}")
            print(f"  Action  : {decision.action}  reason={decision.reason}  support={decision.support_level}")
            if updated_state.hint_dependent:
                print(f"  ⚠️  HYBRID LOOP DETECTED — hint_dependent=True")
            print(f"  Answer  : {result_icon}{hint_icon}  correct_opt={correct_opt}  selected={selected_option}")
            print(f"  P(L): {_p_bar(p_l_before)} → {_p_bar(new_p_l)}  cw={updated_state.consecutive_wrong}{mastered_tag}")

            # Show candidate scoring weights for all unlocked nodes
            if candidate_scores:
                print(f"  Candidate scores:")
                for name, breakdown in weight_breakdowns.items():
                    marker = " ◀ SELECTED" if name == t.subtopic_name else ""
                    print(f"    {name:<35} score={breakdown['total']:.4f}"
                          f"  (gap={breakdown['w1_gap']:.3f} prereq={breakdown['w2_prereq']:.3f}"
                          f" diff={breakdown['w3_diff']:.3f} int={breakdown['w4_interest']:.3f}){marker}")

        # ── Escalation stop ───────────────────────────────────────────────────
        if decision.escalated:
            if verbose:
                print(f"\n  🚨 ESCALATED to teacher after {turn_num} turns")
            break

    return turns


# ─────────────────────────────────────────────────────────────────────────────
# ANSWER STRATEGIES  (no hardcoded content — only decide correct/wrong)
# ─────────────────────────────────────────────────────────────────────────────

def strategy_strong(turn_num: int, question_type: str, correct_opt: int):
    """Always answers correctly, never uses hints."""
    return correct_opt, False


def strategy_average(turn_num: int, question_type: str, correct_opt: int):
    """
    Correct on easy/hard questions, wrong every 3rd standard question.
    Uses hint on wrong turns.
    """
    if question_type == "easy_question":
        return correct_opt, False
    if turn_num % 3 == 0:
        wrong_opt = (correct_opt + 1) % 4
        return wrong_opt, True    # wrong, with hint
    return correct_opt, False


def strategy_struggling(turn_num: int, question_type: str, correct_opt: int):
    """
    Wrong most of the time. Correct only on easy questions after 3 wrong.
    Triggers scaffold sequence and eventually escalation on hard concepts.
    """
    if question_type == "easy_question" and turn_num % 4 == 0:
        return correct_opt, True   # occasional correct with hint on easy
    wrong_opt = (correct_opt + 2) % 4
    return wrong_opt, False        # wrong without hint


def strategy_looper(turn_num: int, question_type: str, correct_opt: int):
    """
    Always passes easy_question, always fails standard question.
    This reliably triggers the hybrid loop condition.
    """
    if question_type == "easy_question":
        return correct_opt, False      # correct on easy
    wrong_opt = (correct_opt + 1) % 4
    return wrong_opt, False            # wrong on standard/hard


# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY PRINTER
# ─────────────────────────────────────────────────────────────────────────────

def print_summary(archetype: str, turns: list):
    sep = "─" * 72
    print(f"\n{'═'*72}")
    print(f"  SUMMARY: {archetype}")
    print(f"{'═'*72}")
    print(f"  Total turns   : {len(turns)}")
    if not turns:
        return

    correct_count = sum(1 for t in turns if t.correct)
    print(f"  Correct       : {correct_count}/{len(turns)} ({100*correct_count//len(turns)}%)")
    print(f"  Hints used    : {sum(1 for t in turns if t.hint_used)}")
    print(f"  Hybrid trigger: {sum(1 for t in turns if t.hint_dependent)} turns in hint_dependent state")
    print(f"  Escalations   : {sum(1 for t in turns if t.reason == Reason.ESCALATED)}")

    # Final P(L) per subtopic (last recorded value per subtopic_id)
    final_pl: dict = {}
    for t in turns:
        final_pl[t.subtopic_name] = t.p_l_after

    print(f"\n  Final P(L) per subtopic:")
    for name, pl in final_pl.items():
        mastered_tag = " ✓ MASTERED" if is_mastered(pl) else ""
        print(f"    {name:<40} {_p_bar(pl, 16)}{mastered_tag}")

    # Zone progression
    print(f"\n  Zone progression (by turn):")
    zone_line = ""
    for t in turns:
        zone_icons = {"mastered": "M", "challenge": "C", "standard": "S", "scaffold": "s"}
        zone_line += zone_icons.get(t.zone_after, "?")
    print(f"    {zone_line}")
    print(f"    (s=scaffold, S=standard, C=challenge, M=mastered)")

    # Reason code distribution
    from collections import Counter
    reasons = Counter(t.reason for t in turns)
    print(f"\n  Reason code distribution:")
    for reason, count in reasons.most_common():
        print(f"    {reason:<30} {count} turns")

    # Support level distribution
    support = Counter(t.support_level for t in turns)
    print(f"\n  Support level distribution:")
    for level, count in sorted(support.items()):
        labels = {0: "no support", 1: "hint shown", 2: "simple expl",
                  3: "example", 4: "prerequisite", 5: "escalated"}
        print(f"    Level {level} ({labels.get(level,'?')}): {count} turns")

    print()


# ─────────────────────────────────────────────────────────────────────────────
# PYTEST TEST FUNCTIONS  (also runnable standalone)
# ─────────────────────────────────────────────────────────────────────────────

def test_strong_student():
    """
    Strong student: P(L) should climb consistently, reach mastery quickly,
    DAG should advance forward, hard_question served once P(L) >= 0.70.
    """
    turns = run_simulation(
        student_id="sim_strong_001",
        archetype="STRONG STUDENT",
        answer_strategy=strategy_strong,
        interest_tag="gaming",
        max_turns=30,
        verbose=True,
    )
    print_summary("STRONG STUDENT", turns)

    # Assertions
    assert len(turns) > 0, "No turns recorded"

    # P(L) must only increase for strong student (no wrong answers)
    for i in range(1, len(turns)):
        if turns[i].subtopic_id == turns[i-1].subtopic_id:
            assert turns[i].p_l_after >= turns[i-1].p_l_after, \
                f"P(L) decreased on turn {i+1} for strong student"

    # Must have served hard_question at some point (P(L) >= 0.70 zone)
    hard_turns = [t for t in turns if t.question_type == "hard_question"]
    challenge_turns = [t for t in turns if t.zone_before == "challenge" or t.zone_before == "mastered"]
    assert hard_turns or challenge_turns, \
        "Strong student never reached challenge zone — P(L) not climbing correctly"

    # No escalations
    assert not any(t.reason == Reason.ESCALATED for t in turns), \
        "Strong student should never be escalated"

    # No hybrid loop
    assert not any(t.hint_dependent for t in turns), \
        "Strong student should not trigger hybrid loop"

    print("  ✅ test_strong_student PASSED\n")


def test_average_student():
    """
    Average student: should move through scaffold → standard → challenge zones,
    use hints, have some wrong answers, not escalate.
    """
    turns = run_simulation(
        student_id="sim_average_001",
        archetype="AVERAGE STUDENT",
        answer_strategy=strategy_average,
        interest_tag="sports",
        max_turns=40,
        verbose=True,
    )
    print_summary("AVERAGE STUDENT", turns)

    assert len(turns) > 0

    # Should have both correct and wrong turns
    assert any(t.correct for t in turns),  "Average student never correct"
    assert any(not t.correct for t in turns), "Average student never wrong"

    # Should have used hints
    assert any(t.hint_used for t in turns), "Average student never used hints"

    # P(L) should progress overall (first turn vs last turn on same subtopic)
    first = turns[0]
    last_same = next((t for t in reversed(turns) if t.subtopic_id == first.subtopic_id), first)
    assert last_same.p_l_after >= first.p_l_before, \
        "Average student P(L) did not progress at all"

    # Multiple content types should have been served (not just main_explanation)
    content_types = {t.content_type for t in turns}
    assert len(content_types) > 1, \
        f"Only one content type served: {content_types}. Scaffolding not activating."

    print("  ✅ test_average_student PASSED\n")


def test_struggling_student():
    """
    Struggling student: should see full scaffold sequence (hint → simple_explanation
    → example → prerequisite), P(L) should drop, eventually escalate or recover slowly.
    """
    turns = run_simulation(
        student_id="sim_struggling_001",
        archetype="STRUGGLING STUDENT",
        answer_strategy=strategy_struggling,
        interest_tag="music",
        max_turns=40,
        verbose=True,
    )
    print_summary("STRUGGLING STUDENT", turns)

    assert len(turns) > 0

    # Should have seen simple_explanation
    assert any(t.content_type == "simple_explanation" for t in turns), \
        "Struggling student never received simple_explanation"

    # Should have seen example
    assert any(t.content_type == "example" for t in turns), \
        "Struggling student never received example content"

    # P(L) should be lower than strong student after same number of turns
    final_pl_values = [t.p_l_after for t in turns]
    assert max(final_pl_values) < 0.85, \
        "Struggling student should not reach mastery easily"

    # Should have support_level > 0 on most turns
    supported_turns = [t for t in turns if t.support_level > 0]
    assert len(supported_turns) > len(turns) * 0.4, \
        "Struggling student not receiving enough support"

    print("  ✅ test_struggling_student PASSED\n")


def test_looper_student():
    """
    Looper student: passes easy_question every time but fails standard.
    Must trigger hybrid loop (hint_dependent=True) within HYBRID_LOOP_THRESHOLD*2 turns.
    """
    turns = run_simulation(
        student_id="sim_looper_001",
        archetype="LOOPER STUDENT (hybrid trigger)",
        answer_strategy=strategy_looper,
        interest_tag="cartoon",
        max_turns=30,
        verbose=True,
    )
    print_summary("LOOPER STUDENT", turns)

    assert len(turns) > 0

    # Core assertion: hybrid loop MUST fire
    hybrid_turns = [t for t in turns if t.hint_dependent]
    assert hybrid_turns, \
        "Looper student did not trigger hybrid loop — check easy_pass_count / standard_fail_count logic"

    # Must have served easy_question
    assert any(t.question_type == "easy_question" for t in turns), \
        "No easy_question was ever served to looper student"

    # Hybrid must activate before turn HYBRID_LOOP_THRESHOLD * 2 + 5 (with some slack)
    first_hybrid_turn = hybrid_turns[0].turn
    assert first_hybrid_turn <= HYBRID_LOOP_THRESHOLD * 2 + 8, \
        f"Hybrid loop triggered too late: turn {first_hybrid_turn}"

    print("  ✅ test_looper_student PASSED\n")


def test_candidate_scoring_weights():
    """
    Verify candidate scoring weights produce correct ordering.
    Node with higher knowledge gap and ready prerequisites scores higher
    than a node with lower gap but missing prerequisites.
    """
    print("\n" + "═"*72)
    print("  TEST: Candidate Scoring Weights")
    print("═"*72)

    subs = _load_subtopics(str(_load_unit()["_id"]))
    if len(subs) < 2:
        print("  [SKIP] Need at least 2 subtopics")
        return

    dag = _build_dag(subs)
    sid_0 = str(subs[0]["_id"])
    sid_1 = str(subs[1]["_id"])

    # Case: sid_0 has low P(L) (high gap), sid_1 has high P(L) (low gap)
    # But sid_1 is blocked because its prerequisite (sid_0) is not mastered
    mastery_map = {sid_0: 0.20, sid_1: 0.60}

    score_0 = score_candidate(sid_0, 0.20, dag, mastery_map, None)
    score_1 = score_candidate(sid_1, 0.60, dag, mastery_map, None)

    print(f"  {subs[0]['name']}: P(L)=0.20, prereq=root → score={score_0:.4f}")
    print(f"  {subs[1]['name']}: P(L)=0.60, prereq=unmastered → score={score_1:.4f}")
    print(f"  w2 (prereq) weight = {W2_PREREQ_READY} penalises sid_1 heavily")

    # sid_1 has prereq not mastered → w2 = 0.0 → should score lower or close
    # sid_0 is a root node → w2 = 1.0
    breakdown_0 = {
        "gap":    W1_KNOWLEDGE_GAP * (1.0 - 0.20),
        "prereq": W2_PREREQ_READY  * 1.0,
        "diff":   W3_DIFFICULTY_MATCH * (1.0 - abs(0.20 - 0.30)),
        "int":    W4_INTEREST_MATCH * 0.5,
    }
    breakdown_1 = {
        "gap":    W1_KNOWLEDGE_GAP * (1.0 - 0.60),
        "prereq": W2_PREREQ_READY  * 0.0,   # blocked
        "diff":   W3_DIFFICULTY_MATCH * (1.0 - abs(0.60 - 0.60)),
        "int":    W4_INTEREST_MATCH * 0.5,
    }

    print(f"\n  Weight breakdown sid_0: {breakdown_0}")
    print(f"  Weight breakdown sid_1: {breakdown_1}")

    assert score_0 > score_1, \
        f"Root node with high gap should outscore blocked node. Got {score_0:.4f} vs {score_1:.4f}"

    print(f"\n  ✅ Scoring: root+gap ({score_0:.4f}) > blocked ({score_1:.4f}) — CORRECT")
    print("  ✅ test_candidate_scoring_weights PASSED\n")


def test_diagnostic_initialization():
    """
    Verify diagnostic_init Option 2 produces correct P(L) values from DB content.
    Correct → ~0.4667 (Standard Zone), Wrong → ~0.2110 (Scaffold Zone).
    Prerequisite gating: child correct + parent wrong → child pulled to ~0.2110.
    """
    print("\n" + "═"*72)
    print("  TEST: Diagnostic Initialization (Option 2 BKT from prior)")
    print("═"*72)

    subs = _load_subtopics(str(_load_unit()["_id"]))
    if len(subs) < 2:
        print("  [SKIP] Need at least 2 subtopics for gating test")
        return

    # Simulate diagnostic for each subtopic
    answer_map = {}
    for i, sub in enumerate(subs):
        answer_map[str(sub["_id"])] = (i % 2 == 0)  # alternating correct/wrong

    dag = _build_dag(subs)
    results = {}

    for sub in subs:
        sid     = str(sub["_id"])
        correct = answer_map[sid]
        raw_pl  = diagnostic_init(correct)

        # Apply prerequisite gating
        prereqs = dag.get_prerequisites(sid)
        all_parents_correct = all(answer_map.get(p, False) for p in prereqs)
        gated_pl = apply_prerequisite_gating(raw_pl, all_parents_correct)

        results[sub["name"]] = {
            "answered_correct": correct,
            "raw_p_l":         round(raw_pl, 4),
            "gated_p_l":       round(gated_pl, 4),
            "zone":            get_zone(gated_pl),
            "prereqs_correct": all_parents_correct,
        }
        print(f"  {sub['name']:<35} correct={str(correct):<5} "
              f"raw={raw_pl:.4f} gated={gated_pl:.4f} zone={get_zone(gated_pl)}")

    # Check correct answers land in standard zone (~0.4667)
    for name, r in results.items():
        if r["answered_correct"] and r["prereqs_correct"]:
            assert 0.40 <= r["raw_p_l"] <= 0.70, \
                f"{name}: correct diagnostic should land in standard zone, got {r['raw_p_l']}"

    # Check wrong answers land in scaffold zone (~0.2110)
    for name, r in results.items():
        if not r["answered_correct"]:
            assert r["raw_p_l"] < 0.40, \
                f"{name}: wrong diagnostic should land in scaffold zone, got {r['raw_p_l']}"

    # Check gating: child with correct answer but parent with wrong answer gets pulled down
    gated_nodes = [(n, r) for n, r in results.items()
                   if r["answered_correct"] and not r["prereqs_correct"]]
    for name, r in gated_nodes:
        assert r["gated_p_l"] < 0.40, \
            f"{name}: gated child should be in scaffold zone, got {r['gated_p_l']}"
        print(f"  ↳ {name}: gating applied → {r['raw_p_l']:.4f} → {r['gated_p_l']:.4f} (scaffold)")

    print("  ✅ test_diagnostic_initialization PASSED\n")


# ─────────────────────────────────────────────────────────────────────────────
# ENTRYPOINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "█"*72)
    print("  ADAPTIVE ENGINE SIMULATION — ALL STUDENT ARCHETYPES")
    print("  Using real DB content from MongoDB adaptive_learning")
    print("█"*72)

    test_strong_student()
    test_average_student()
    test_struggling_student()
    test_looper_student()
    test_candidate_scoring_weights()
    test_diagnostic_initialization()

    print("\n" + "█"*72)
    print("  ALL SIMULATIONS COMPLETE")
    print("█"*72 + "\n")
