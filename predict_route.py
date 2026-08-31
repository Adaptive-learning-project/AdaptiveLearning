"""
predict_route.py
----------------
Training and inference pipeline for the Adaptive Learning Platform.

Data source: bigdata_learning_analytics.csv only.
No master dataset, no synthetic profile data, no ID conversion.

What this module does:
  1. Loads raw behavioral telemetry from bigdata CSV
  2. Computes ALPS score via alps_engine.py (data-driven weights)
  3. Trains SVM (RBF) with class_weight='balanced' to handle 60:40 imbalance
  4. Tunes classification threshold on a held-out validation fold to
     maximise macro F1 — not raw accuracy (which would over-predict majority)
  5. Exports all artifacts (model, scaler, encoder, threshold, ALPS params)
  6. Provides predict_single() for real-time inference

Usage:
  python predict_route.py           # train + tune + demo
  python predict_route.py --demo    # demo only (load existing artifacts)
"""

import os
import argparse
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.svm import SVC
from sklearn.metrics import f1_score, classification_report, accuracy_score

from alps_engine import (
    compute_alps,
    compute_alps_from_df,
    derive_weights_from_data,
    fit_bounds_from_data,
    load_weights,
    load_bounds,
)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR       = "D:/AdaptiveLearning"
DATA_PATH      = os.path.join(BASE_DIR, "archive", "bigdata_learning_analytics.csv")
OUTPUT_DIR     = os.path.join(BASE_DIR, "Output")
MODEL_PATH     = os.path.join(OUTPUT_DIR, "svm_routing_model.pkl")
SCALER_PATH    = os.path.join(OUTPUT_DIR, "telemetry_scaler.pkl")
ENCODER_PATH   = os.path.join(OUTPUT_DIR, "label_encoder.pkl")
THRESHOLD_PATH = os.path.join(OUTPUT_DIR, "optimal_threshold.pkl")
BOUNDS_PATH    = os.path.join(OUTPUT_DIR, "alps_bounds.pkl")
WEIGHTS_PATH   = os.path.join(OUTPUT_DIR, "alps_weights.pkl")
FEATURES_PATH  = os.path.join(OUTPUT_DIR, "feature_cols_bigdata.pkl")

# ── Feature set: clean behavioral telemetry only ─────────────────────────────
# Excluded intentionally:
#   performance_score  — derived from target label (data leakage, r=0.756)
#   fatigue_level      — heavily label-derived in this synthetic CSV (r=0.540)
#   efficiency_gain    — downstream outcome, not an input signal (r=0.056 raw)
#   Student_ID         — identifier, not a feature
#   instruction_recommendation — target variable
#
# fatigue_level IS captured indirectly through ALPS_Score (energy component),
# which normalises it alongside attention and accuracy — avoiding direct leakage
# while preserving the cognitive load signal.
#
BEHAVIORAL_FEATURES = [
    "login_frequency",
    "avg_session_duration",
    "completed_assignments",
    "quiz_scores_avg",
    "forum_participation",
    "resource_views",
    "task_completion_time",
    "task_accuracy",
    "error_count",
    "repetition_needed",
    "motion_intensity",
    "safety_violations",
    "attention_span_score",
    "collaboration_index",
    "ALPS_Score",          # engineered composite (from alps_engine.py)
]


def tune_threshold(model: SVC, X_val: np.ndarray, y_val: np.ndarray,
                   n_steps: int = 100) -> float:
    """
    Search for the probability threshold that maximises macro F1.
    Searches [0.20, 0.80] to avoid degenerate all-one or all-zero predictions.
    Macro F1 is used (not accuracy) because of the 60:40 class imbalance.
    """
    probs = model.predict_proba(X_val)[:, 1]  # P(Competency-Based)
    best_thresh, best_f1 = 0.5, 0.0
    for t in np.linspace(0.20, 0.80, n_steps):
        preds = (probs >= t).astype(int)
        f = f1_score(y_val, preds, average="macro", zero_division=0)
        if f > best_f1:
            best_f1, best_thresh = f, t
    return round(float(best_thresh), 4)


def train_and_export(data_path: str = DATA_PATH) -> dict:
    """
    Full training pipeline on bigdata_learning_analytics.csv.
    Returns evaluation metrics dict for reporting.
    """
    print("[train] Loading bigdata_learning_analytics.csv ...")
    df = pd.read_csv(data_path)
    print(f"[train] Dataset: {df.shape[0]} rows × {df.shape[1]} cols")

    # ── ALPS — load weights from pipeline output (authoritative), or derive if missing ──
    alps_weights = load_weights()
    alps_bounds  = load_bounds()
    # If bounds were not saved yet (pipeline hasn't run), fit from this data
    if alps_bounds is None or "task_accuracy" not in alps_bounds:
        alps_bounds = fit_bounds_from_data(df)
    df["ALPS_Score"] = compute_alps_from_df(df, bounds=alps_bounds, weights=alps_weights)
    print(f"[train] ALPS weights: { {k: round(v,3) for k,v in alps_weights.items()} }")

    # ── Features & target ──
    X = df[BEHAVIORAL_FEATURES].values
    le = LabelEncoder()
    y  = le.fit_transform(df["instruction_recommendation"])
    print(f"[train] Classes: {list(le.classes_)}  Counts: {np.bincount(y).tolist()}")

    # ── Splits: 80% train+val | 20% test; 10% of total as val for threshold tuning ──
    X_tv, X_test, y_tv, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_tv, y_tv, test_size=0.125, random_state=42, stratify=y_tv
    )
    print(f"[train] Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")

    # ── Scale ──
    scaler    = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_val_s   = scaler.transform(X_val)
    X_test_s  = scaler.transform(X_test)

    # ── Train SVM (class_weight='balanced' compensates for 60:40 imbalance) ──
    print("[train] Fitting SVM (RBF, class_weight=balanced) ...")
    model = SVC(kernel="rbf", C=1.0, gamma="scale",
                probability=True, class_weight="balanced", random_state=42)
    model.fit(X_train_s, y_train)

    # ── Tune threshold ──
    threshold = tune_threshold(model, X_val_s, y_val)
    print(f"[train] Optimal classification threshold: {threshold}")

    # ── Evaluate on test set ──
    probs_test = model.predict_proba(X_test_s)[:, 1]
    y_pred = (probs_test >= threshold).astype(int)
    acc = accuracy_score(y_test, y_pred)
    print(f"[train] Test Accuracy: {acc:.4f}  (threshold={threshold})")
    print(classification_report(y_test, y_pred,
                                  target_names=le.classes_, digits=3))

    # ── Export artifacts ──
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    joblib.dump(model,            MODEL_PATH)
    joblib.dump(scaler,           SCALER_PATH)
    joblib.dump(le,               ENCODER_PATH)
    joblib.dump(threshold,        THRESHOLD_PATH)
    joblib.dump(alps_bounds,      BOUNDS_PATH)
    joblib.dump(alps_weights,     WEIGHTS_PATH)
    joblib.dump(BEHAVIORAL_FEATURES, FEATURES_PATH)
    print(f"[train] All artifacts saved to {OUTPUT_DIR}/")

    return {"test_accuracy": acc, "threshold": threshold,
            "alps_weights": alps_weights}


def load_pipeline() -> tuple:
    """Load all serialised artifacts. Returns (model, scaler, encoder, threshold, bounds, weights, features)."""
    return (
        joblib.load(MODEL_PATH),
        joblib.load(SCALER_PATH),
        joblib.load(ENCODER_PATH),
        joblib.load(THRESHOLD_PATH),
        joblib.load(BOUNDS_PATH),
        joblib.load(WEIGHTS_PATH),
        joblib.load(FEATURES_PATH),
    )


def predict_single(session: dict, topic: str = "General") -> dict:
    """
    Predict instruction route for one student session.

    Parameters
    ----------
    session : dict with keys matching bigdata_learning_analytics.csv columns
              (Student_ID and target column not required)
    topic   : lesson topic string (passed through to output for prompt builder)

    Returns
    -------
    dict with ALPS_Score, Predicted_Route, Confidence_Adaptive,
    Confidence_Competency, threshold_used, topic
    """
    model, scaler, encoder, threshold, bounds, weights, feature_cols = load_pipeline()

    row = pd.Series(session)

    # Compute ALPS — needs task_accuracy, attention_span_score,
    #                fatigue_level, efficiency_gain
    alps = compute_alps(row, bounds=bounds, weights=weights)

    # Build feature vector in the exact order of feature_cols
    vec = []
    for col in feature_cols:
        if col == "ALPS_Score":
            vec.append(alps)
        else:
            vec.append(float(session.get(col, 0.0)))

    X_scaled = scaler.transform([vec])
    prob = model.predict_proba(X_scaled)[0]      # [P(Adaptive), P(Competency-Based)]
    pred_label = encoder.classes_[int(prob[1] >= threshold)]

    return {
        "ALPS_Score":             alps,
        "Predicted_Route":        pred_label,
        "Confidence_Adaptive":    round(float(prob[0]), 4),
        "Confidence_Competency":  round(float(prob[1]), 4),
        "threshold_used":         threshold,
        "topic":                  topic,
    }


# ── Standalone entry point ────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo", action="store_true",
                        help="Skip training; run demo on existing artifacts")
    args = parser.parse_args()

    if not args.demo:
        train_and_export()
    else:
        print("[demo] Using existing artifacts (run without --demo to retrain)")

    # Demo: predict on first row of dataset
    df = pd.read_csv(DATA_PATH)
    sample = df.iloc[0].to_dict()

    result = predict_single(sample, topic="Basic Addition")
    print("\n[demo] Prediction for Student", sample.get("Student_ID"))
    for k, v in result.items():
        print(f"  {k:<28}  {v}")
