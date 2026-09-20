"""
backend/app/cognitive_governor.py
Deterministic Cognitive Governor & Pedagogical Decision Engine
Adapted for Early Childhood / IDD Learners (FACP Milestones)
"""

from typing import Optional
from app.schemas import PedagogicalDecision, CognitiveState, PedagogicalAction


class CognitiveGovernor:
    # Tuned thresholds for children aged 4-7 on 2-choice touch canvases
    MASTERY_THRESHOLD: float = 0.80              # Aligned to FACP 80% advancement criteria
    STRUGGLE_P_L_CEILING: float = 0.25           # Severe difficulty indicator
    HESITATION_LATENCY_MS: int = 12000          # 12s dwell time indicates processing hesitation
    SWITCH_THRESHOLD: int = 2                    # 2+ touches indicate oscillation/indecision

    @classmethod
    def diagnose_state(
            cls,
            p_l: float,
            is_correct: bool,
            consecutive_wrong: int,
            response_time_ms: int,
            option_switch_count: int,
            total_attempts: int = 0,  # add attempt check
    ) -> CognitiveState:
        # 1. Check Mastery
        if p_l >= cls.MASTERY_THRESHOLD:
            return "MASTERED"

        # 2. Check Severe Struggle (Only if they actually made mistakes)
        if consecutive_wrong >= 2 or (total_attempts > 0 and not is_correct and p_l < cls.STRUGGLE_P_L_CEILING):
            return "STRUGGLING"

        # 3. Check Hesitation / Indecision
        if option_switch_count >= cls.SWITCH_THRESHOLD or response_time_ms > cls.HESITATION_LATENCY_MS:
            return "OSCILLATING"

        # 4. Default baseline state for new and progressing learners
        return "LEARNING"

    @classmethod
    def decide_action(
        cls,
        concept: str,
        state: CognitiveState,
        p_l: float,
        target_id: Optional[str] = None,
    ) -> PedagogicalDecision:
        """
        Determines the assistive intervention based on the diagnosed state.
        Translates into Errorless Learning or Visual Cueing.
        """
        if state == "MASTERED":
            return PedagogicalDecision(
                concept=concept,
                action="ADVANCE_CONCEPT_NODE",
                cognitive_state=state,
                intervention_goal="FACP_CRITERION_ACHIEVED",
                scaffold_type="PROMOTION",
                target_id=target_id,
                constraints=[
                    "celebratory audio chime",
                    "advance DAG pointer to next developmental milestone"
                ]
            )

        if state == "OSCILLATING":
            return PedagogicalDecision(
                concept=concept,
                action="HIGHLIGHT_TARGET",
                cognitive_state=state,
                intervention_goal="CUE_ATTENTION_FOCUS",
                scaffold_type="HIGHLIGHT_TARGET",
                target_id=target_id,
                constraints=[
                    "soft pulsing border on target",
                    "re-read directive spoken prompt in unhurried audio"
                ]
            )

        if state == "STRUGGLING":
            return PedagogicalDecision(
                concept=concept,
                action="ELIMINATE_DISTRACTOR",
                cognitive_state=state,
                intervention_goal="ERRORLESS_DEESCALATION",
                scaffold_type="ELIMINATE_DISTRACTOR",
                target_id=target_id,
                constraints=[
                    "hide incorrect distractor entirely",
                    "render single target to guarantee success and rebuild confidence"
                ]
            )

        # State == LEARNING
        return PedagogicalDecision(
            concept=concept,
            action="STANDARD_REINFORCE",
            cognitive_state=state,
            intervention_goal="INDEPENDENT_RETRIEVAL",
            scaffold_type="STANDARD_CHOICE",
            target_id=target_id,
            constraints=[
                "clean dual-choice pictorial canvas",
                "no visual assistance or distractor suppression"
            ]
        )