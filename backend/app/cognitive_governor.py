"""
backend/app/cognitive_governor.py
Deterministic Cognitive Governor & Pedagogical Decision Engine
"""

from app.schemas import PedagogicalDecision, CognitiveState, PedagogicalAction


class CognitiveGovernor:
    @staticmethod
    def diagnose_state(
            p_l: float,
            is_correct: bool,
            consecutive_wrong: int,
            response_time_ms: int,
            option_switch_count: int,
            current_difficulty: int
    ) -> CognitiveState:
        # Check Mastery
        if p_l >= 0.85:
            return "MASTERED"

        # Check Oscillation: Repeated failures at medium tier despite prior passes
        if not is_correct and current_difficulty == 2 and consecutive_wrong >= 2:
            return "OSCILLATING"

        # Check Overchallenged / Excessive Cognitive Load
        if not is_correct and current_difficulty >= 2 and (response_time_ms > 30000 or option_switch_count >= 3):
            return "OVERCHALLENGED"

        # Check General Struggle
        if not is_correct or consecutive_wrong >= 2:
            return "STRUGGLING"

        return "LEARNING"

    @staticmethod
    def decide_action(
            concept: str,
            state: CognitiveState,
            p_l: float,
            consecutive_wrong: int,
            hints_used: int,
            current_difficulty: int,
            error_tag: str = "general_error"
    ) -> PedagogicalDecision:
        """
        Determines the smallest intervention necessary based on the diagnostic state.
        """
        if state == "MASTERED":
            return PedagogicalDecision(
                concept=concept,
                action="hard_transfer",
                difficulty=3,
                cognitive_state=state,
                intervention_goal="VERIFY_DEEP_TRANSFER",
                specific_error="None",
                constraints=["complex application scenario", "multi-step inference"]
            )

        if state == "OSCILLATING":
            return PedagogicalDecision(
                concept=concept,
                action="bridge_rescue",
                difficulty=current_difficulty,
                cognitive_state=state,
                intervention_goal="BREAK_OSCILLATION_LOOP",
                specific_error=error_tag,
                constraints=["real-world concrete analogy", "avoid syntactic jargon"]
            )

        if state == "OVERCHALLENGED":
            return PedagogicalDecision(
                concept=concept,
                action="simple_example",
                difficulty=1,
                cognitive_state=state,
                intervention_goal="REDUCE_WORKING_MEMORY_LOAD",
                specific_error=error_tag,
                constraints=["minimal visual code snippet", "explicit execution flow"]
            )

        if state == "STRUGGLING":
            # Minimum intervention hierarchy: Hint -> Example -> Explanation
            if hints_used == 0:
                action: PedagogicalAction = "hint"
                goal = "LOWEST_INTRUSIVE_SCAFFOLD"
                diff = current_difficulty
            elif hints_used == 1:
                action = "simple_example"
                goal = "GROUND_CONCEPT_CONTEXT"
                diff = max(1, current_difficulty - 1)
            else:
                action = "explanation"
                goal = "RETEACH_MISUNDERSTOOD_PREMISE"
                diff = 1

            return PedagogicalDecision(
                concept=concept,
                action=action,
                difficulty=diff,
                cognitive_state=state,
                intervention_goal=goal,
                specific_error=error_tag,
                constraints=["gentle supportive language", "target specific misconception"]
            )

        # State == LEARNING
        if p_l < 0.60:
            return PedagogicalDecision(
                concept=concept,
                action="easy_question",
                difficulty=1,
                cognitive_state=state,
                intervention_goal="PRACTICE_CORE_RECALL",
                constraints=["direct recall", "clear binary distinction"]
            )
        else:
            return PedagogicalDecision(
                concept=concept,
                action="medium_question",
                difficulty=2,
                cognitive_state=state,
                intervention_goal="INDEPENDENT_APPLICATION",
                constraints=["standard code tracing", "no extraneous hints"]
            )