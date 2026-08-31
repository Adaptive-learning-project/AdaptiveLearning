"""
alps_engine.py
--------------
Adaptive Learning Performance Score (ALPS) engine.

Data source: bigdata_learning_analytics.csv (behavioral telemetry only).
No synthetic profile data, no ID conversion, no merged master dataset.

ALPS aggregates four behavioral indicators into a single 0–100 score
that reflects both academic performance and cognitive readiness:

    ALPS = w1 * accuracy_norm
         + w2 * attention_norm
         + w3 * energy_norm        (energy = 1 - fatigue, normalised)
         + w4 * efficiency_norm

Weight derivation (two-step):
  Step 1 — Empirical: Pearson |r| of each normalised component with target.
            From bigdata_learning_analytics.csv:
              energy(1-fatigue): |r|=0.540, task_accuracy: |r|=0.227,
              attention:         |r|=0.115, efficiency_gain:|r|=0.056
  Step 2 — Domain constraint (SEN pedagogy):
              - energy dominance (raw 57.6%) is capped at 0.35 to prevent
                a high-energy but inattentive student from scoring unrealistically.
              - attention is raised above its raw proportion (12.3% → 0.25)
                because in ID learners, sustained focus is a precondition
                for retention, not merely correlated with outcomes.
              - efficiency is kept low (0.10) to avoid penalising slower learners.
              - accuracy stays primary (0.30) as direct task mastery.

Run `python alps_engine.py` to derive weights from actual data and validate.
"""

import os
import json as _json
import numpy as np
import pandas as pd

# ── Configurable weight profile (derived + domain-adjusted) ──────────────────
# These are the fallback defaults used only if ML_pipeline.py has not been run.
# The pipeline writes Output/alps_weights.json which is the authoritative source.
WEIGHT_CONFIG = {
    "task_accuracy":   0.30,
    "attention_span":  0.25,
    "energy":          0.35,
    "efficiency_gain": 0.10,
}
assert abs(sum(WEIGHT_CONFIG.values()) - 1.0) < 1e-9, "Weights must sum to 1.0"

# ── Load from pipeline output (authoritative source) ─────────────────────────
_OUT_DIR      = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Output")
_WEIGHTS_JSON = os.path.join(_OUT_DIR, "alps_weights.json")
_BOUNDS_JSON  = os.path.join(_OUT_DIR, "alps_bounds.json")

def load_weights() -> dict:
    """
    Load ALPS weights from ML_pipeline.py output (alps_weights.json).
    Falls back to module-level WEIGHT_CONFIG if pipeline has not been run.
    """
    if os.path.exists(_WEIGHTS_JSON):
        with open(_WEIGHTS_JSON) as f:
            return _json.load(f)
    return WEIGHT_CONFIG

def load_bounds() -> dict:
    """
    Load normalisation bounds from ML_pipeline.py output (alps_bounds.json).
    Falls back to FEATURE_BOUNDS if pipeline has not been run.
    """
    if os.path.exists(_BOUNDS_JSON):
        with open(_BOUNDS_JSON) as f:
            raw = _json.load(f)
        return {k: tuple(v) for k, v in raw.items()}
    return FEATURE_BOUNDS

# ── Columns in bigdata_learning_analytics.csv used for ALPS ──────────────────
ALPS_SOURCE_COLS = ["task_accuracy", "attention_span_score",
                    "fatigue_level", "efficiency_gain"]


def fit_bounds_from_data(df: pd.DataFrame) -> dict:
    """
    Derive min/max normalisation bounds from actual training data.
    Call once on the training split; persist result with joblib.
    """
    return {
        "task_accuracy":        (df["task_accuracy"].min(),        df["task_accuracy"].max()),
        "attention_span_score": (df["attention_span_score"].min(), df["attention_span_score"].max()),
        "fatigue_level":        (df["fatigue_level"].min(),        df["fatigue_level"].max()),
        "efficiency_gain":      (df["efficiency_gain"].min(),      df["efficiency_gain"].max()),
    }


def derive_weights_from_data(
        df: pd.DataFrame,
        target_col: str = "instruction_recommendation",
        attention_boost: float = 0.05,
        energy_cap: float = 0.35) -> dict:
    """
    Compute data-driven ALPS weights with domain constraints applied.

    Parameters
    ----------
    df              : DataFrame (bigdata_learning_analytics.csv)
    target_col      : binary classification target column
    attention_boost : extra weight added to attention above raw |r| proportion
    energy_cap      : maximum allowed weight for energy (prevents dominance)

    Returns
    -------
    dict of weights that sum to 1.0
    """
    from sklearn.preprocessing import LabelEncoder, MinMaxScaler

    y = LabelEncoder().fit_transform(df[target_col])

    components = {
        "task_accuracy":   df["task_accuracy"],
        "attention_span":  df["attention_span_score"],
        "energy":          1.0 - df["fatigue_level"],
        "efficiency_gain": df["efficiency_gain"],
    }
    normed = pd.DataFrame(
        MinMaxScaler(feature_range=(0, 100)).fit_transform(pd.DataFrame(components)),
        columns=components.keys()
    )

    corrs = {c: abs(normed[c].corr(pd.Series(y))) for c in normed.columns}
    total = sum(corrs.values())
    weights = {c: corrs[c] / total for c in corrs}

    # Apply domain constraints
    weights["attention_span"] = min(weights["attention_span"] + attention_boost, 0.30)
    weights["energy"]         = min(weights["energy"], energy_cap)

    # Re-normalise to exactly 1.0
    t = sum(weights.values())
    return {k: round(v / t, 4) for k, v in weights.items()}


def _norm(value: float, low: float, high: float) -> float:
    """Scale value from [low, high] → [0, 100], clipped."""
    if high == low:
        return 50.0
    return float(np.clip((value - low) / (high - low) * 100.0, 0.0, 100.0))


def compute_alps(row: pd.Series,
                 bounds: dict,
                 weights: dict = WEIGHT_CONFIG) -> float:
    """
    Compute ALPS for a single session row.

    Parameters
    ----------
    row     : pd.Series with task_accuracy, attention_span_score,
                          fatigue_level, efficiency_gain
    bounds  : output of fit_bounds_from_data()
    weights : weight dict (defaults to module-level WEIGHT_CONFIG)

    Returns
    -------
    float in [0, 100]
    """
    acc_norm  = _norm(row["task_accuracy"],        *bounds["task_accuracy"])
    attn_norm = _norm(row["attention_span_score"], *bounds["attention_span_score"])

    # Energy = inverted fatigue, normalised within its own inverted range
    energy_raw = 1.0 - row["fatigue_level"]
    e_low  = 1.0 - bounds["fatigue_level"][1]   # 1 - fatigue_max
    e_high = 1.0 - bounds["fatigue_level"][0]   # 1 - fatigue_min
    energy_norm = _norm(energy_raw, e_low, e_high)

    eff_norm = _norm(row["efficiency_gain"], *bounds["efficiency_gain"])

    return round(
        weights["task_accuracy"]   * acc_norm
      + weights["attention_span"]  * attn_norm
      + weights["energy"]          * energy_norm
      + weights["efficiency_gain"] * eff_norm,
        2
    )


def compute_alps_from_df(df: pd.DataFrame,
                         bounds: dict,
                         weights: dict = WEIGHT_CONFIG) -> pd.Series:
    """Vectorised ALPS computation across a full DataFrame."""
    return df.apply(lambda row: compute_alps(row, bounds, weights), axis=1)


# ── Standalone validation ─────────────────────────────────────────────────────
if __name__ == "__main__":
    DATA_PATH = "D:/AdaptiveLearning/archive/bigdata_learning_analytics.csv"
    df = pd.read_csv(DATA_PATH)

    # Derive everything from actual data
    weights = derive_weights_from_data(df)
    bounds  = fit_bounds_from_data(df)

    print("Data-driven + domain-adjusted weights:")
    for k, v in weights.items():
        print(f"  {k:<20}  {v:.4f}  ({v*100:.1f}%)")
    print(f"  Sum: {sum(weights.values()):.4f}")

    df["ALPS_Score"] = compute_alps_from_df(df, bounds=bounds, weights=weights)

    print(f"\nALPS Score distribution:")
    print(df["ALPS_Score"].describe().round(2).to_string())

    print("\nALPS by instruction route:")
    print(df.groupby("instruction_recommendation")["ALPS_Score"]
            .agg(["mean", "std", "min", "max"]).round(2).to_string())

    print("\nSample (5 rows):")
    cols = ["Student_ID", "task_accuracy", "attention_span_score",
            "fatigue_level", "efficiency_gain", "ALPS_Score",
            "instruction_recommendation"]
    print(df[cols].head().to_string())
