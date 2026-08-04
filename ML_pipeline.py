
import os
import sys
import warnings
import pickle

# Set UTF-8 encoding for Windows console
if sys.platform.startswith('win'):
    import codecs
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")           # non-interactive backend – safe on Windows
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix, ConfusionMatrixDisplay)

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("[WARN] xgboost not installed – skipping XGBoost model.")

# Keras DNN (JAX backend – no TensorFlow required)
# NOTE: imported LATE (after all sklearn training) to avoid JAX patching numpy
# which breaks sklearn KNN's C-contiguity check.
KERAS_AVAILABLE = True   # checked at runtime below

warnings.filterwarnings("ignore")

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR    = r"D:/AdaptiveLearning"
LEARNING_CSV  = os.path.join(BASE_DIR, "archive", "bigdata_learning_analytics.csv")
PROFILE_XLSX  = os.path.join(BASE_DIR, "Research_Derived_ID_Learner_Profile_Dataset_Realistic.xlsx")
OUT_DIR       = os.path.join(BASE_DIR, "Output")
os.makedirs(OUT_DIR, exist_ok=True)

print("=" * 60)
print("ADAPTIVE LEARNING ML PIPELINE")
print("=" * 60)

# ─── Step 1 – Import datasets ─────────────────────────────────────────────────
print("\n[Step 1] Loading datasets...")
learning_df = pd.read_csv(LEARNING_CSV)
profile_df  = pd.read_excel(PROFILE_XLSX, engine="openpyxl")
print(f" Learning dataset : {LEARNING_CSV}")
print(f"Profile dataset : {PROFILE_XLSX}")
print(f"  Learning Analytics : {learning_df.shape[0]} rows × {learning_df.shape[1]} cols")
print(f"  Learner Profile    : {profile_df.shape[0]} rows × {profile_df.shape[1]} cols")

# ─── Step 2 – Standardise Student IDs ────────────────────────────────────────
print("\n[Step 2] Standardising Student IDs...")

# learning_df already has S001 format; normalise to uppercase just in case
learning_df["Student_ID"] = learning_df["Student_ID"].str.upper().str.strip()

# profile_df has integer IDs 1001–1500 -> map to S001–S500
# Formula: numeric_id - 1000 gives the ordinal (1001 -> 1, 1002 -> 2, ...)
profile_df["Student_ID"] = profile_df["Student_ID"].apply(
    lambda x: f"S{int(x) - 1000:03d}"
)

print(f"  Learning IDs sample : {learning_df['Student_ID'].head(3).tolist()}")
print(f"  Profile  IDs sample : {profile_df['Student_ID'].head(3).tolist()}")

# ─── Step 3 – Merge ───────────────────────────────────────────────────────────
print("\n[Step 3] Merging datasets on Student_ID...")
master_df = pd.merge(learning_df, profile_df, on="Student_ID", how="inner")
print(f"  Master Dataset shape : {master_df.shape}")
if master_df.shape[0] != 500:
    print(f"  [WARN] Expected 500 rows but got {master_df.shape[0]}")

# ─── Step 4 – Data Cleaning ───────────────────────────────────────────────────
print("\n[Step 4] Data Cleaning...")

# 4a – Duplicates
before = len(master_df)
master_df.drop_duplicates(inplace=True)
print(f"  Duplicates removed : {before - len(master_df)}")

# 4b – Missing values
missing = master_df.isnull().sum()
missing = missing[missing > 0]
if missing.empty:
    print("  No missing values found.")
else:
    print(f"  Missing values:\n{missing}")
    # Impute numerics with median, categoricals with mode
    for col in master_df.columns:
        if master_df[col].isnull().any():
            if master_df[col].dtype in [np.float64, np.int64]:
                master_df[col].fillna(master_df[col].median(), inplace=True)
            else:
                master_df[col].fillna(master_df[col].mode()[0], inplace=True)
    print("  Missing values imputed.")

# 4c – Data types check
print(f"  Final shape after cleaning : {master_df.shape}")

# Save master dataset
master_df.to_csv(os.path.join(OUT_DIR, "master_dataset.csv"), index=False)
print(f"  Master dataset saved")

# ─── Step 5 – Feature Engineering ────────────────────────────────────────────
print("\n[Step 5] Feature Engineering...")

# Map ordinal text columns to numbers for computation
# Assistance_Level: Minimal=1, Partial=2, Full=3
assist_map = {"Minimal": 1, "Partial": 2, "Full": 3}
master_df["Assistance_Level_num"] = master_df["Assistance_Level"].map(assist_map).fillna(2)

# Prompt_Dependency: Low=1, Medium=2, High=3
prompt_map = {"Low": 1, "Medium": 2, "High": 3}
master_df["Prompt_Dependency_num"] = master_df["Prompt_Dependency"].map(prompt_map).fillna(2)

# Repetition_Need: Low=1, Medium=2, High=3
rep_map = {"Low": 1, "Medium": 2, "High": 3}
master_df["Repetition_Need_num"] = master_df["Repetition_Need"].map(rep_map).fillna(2)

# Composite features
master_df["Engagement_Score"] = (
    master_df["login_frequency"] +
    master_df["forum_participation"] +
    master_df["resource_views"]
)

master_df["Learning_Readiness"] = (
    master_df["Working_Memory"] +
    master_df["Attention_Control"] +
    master_df["Motivation"]
)

master_df["Support_Need_Index"] = (
    master_df["Prompt_Dependency_num"] +
    master_df["Assistance_Level_num"] +
    master_df["Repetition_Need_num"]
)

master_df["Difficulty_Index"] = (
    master_df["error_count"] +
    master_df["fatigue_level"] -
    master_df["task_accuracy"]
)

new_features = ["Engagement_Score", "Learning_Readiness",
                "Support_Need_Index", "Difficulty_Index"]
print(f"  New features created : {new_features}")

# ─── Step 6 – EDA ─────────────────────────────────────────────────────────────
print("\n[Step 6] Exploratory Data Analysis (saving plots)...")

# 6a – Class distribution
fig, ax = plt.subplots(figsize=(6, 4))
master_df["instruction_recommendation"].value_counts().plot(
    kind="bar", ax=ax, color=["steelblue", "coral"], edgecolor="black"
)
ax.set_title("Class Distribution – instruction_recommendation")
ax.set_ylabel("Count")
ax.set_xlabel("")
plt.xticks(rotation=0)
plt.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "eda_class_distribution.png"), dpi=150)
plt.close()

# 6b – Performance score distribution
fig, ax = plt.subplots(figsize=(6, 4))
master_df["performance_score"].hist(bins=25, ax=ax, color="steelblue", edgecolor="black")
ax.set_title("Performance Score Distribution")
ax.set_xlabel("performance_score")
ax.set_ylabel("Frequency")
plt.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "eda_performance_distribution.png"), dpi=150)
plt.close()

# 6c – Correlation heatmap (numeric columns only)
num_cols = master_df.select_dtypes(include=[np.number]).columns.tolist()
corr = master_df[num_cols].corr()
fig, ax = plt.subplots(figsize=(18, 14))
sns.heatmap(corr, annot=False, fmt=".2f", cmap="coolwarm", ax=ax,
            linewidths=0.3, cbar_kws={"shrink": 0.7})
ax.set_title("Correlation Heatmap")
plt.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "eda_correlation_heatmap.png"), dpi=150)
plt.close()

# 6d – Attention vs performance
fig, ax = plt.subplots(figsize=(6, 4))
colors = {"Adaptive": "steelblue", "Competency-Based": "coral"}
for cls, grp in master_df.groupby("instruction_recommendation"):
    ax.scatter(grp["attention_span_score"], grp["performance_score"],
               label=cls, alpha=0.5, color=colors.get(cls, "grey"), s=20)
ax.set_xlabel("Attention Span Score")
ax.set_ylabel("Performance Score")
ax.set_title("Attention vs Performance")
ax.legend()
plt.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "eda_attention_vs_performance.png"), dpi=150)
plt.close()

# 6e – Working Memory vs Quiz Score
fig, ax = plt.subplots(figsize=(6, 4))
for cls, grp in master_df.groupby("instruction_recommendation"):
    ax.scatter(grp["Working_Memory"], grp["quiz_scores_avg"],
               label=cls, alpha=0.5, color=colors.get(cls, "grey"), s=20)
ax.set_xlabel("Working Memory")
ax.set_ylabel("Quiz Scores Avg")
ax.set_title("Working Memory vs Quiz Score")
ax.legend()
plt.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "eda_wm_vs_quiz.png"), dpi=150)
plt.close()

# 6f – ID Level distribution
fig, ax = plt.subplots(figsize=(6, 4))
master_df["ID_Level"].value_counts().plot(kind="bar", ax=ax, color="mediumpurple",
                                          edgecolor="black")
ax.set_title("ID Level Distribution")
ax.set_ylabel("Count")
plt.xticks(rotation=0)
plt.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "eda_id_level_distribution.png"), dpi=150)
plt.close()

print("  All EDA plots saved to pipeline_output/")

# ─── Step 7 – Preprocessing ───────────────────────────────────────────────────
print("\n[Step 7] Preprocessing...")

# Identify columns to use as model features (drop ID, target, helper columns)
# NOTE: performance_score and fatigue_level are label-derived outcome features
# in bigdata_learning_analytics.csv — they were generated FROM instruction_recommendation
# and perfectly encode the answer (depth-3 tree on these two alone = 100% accuracy).
# Keeping them causes data leakage. They must be excluded from the feature matrix.
DROP_COLS = [
    "Student_ID", "instruction_recommendation",
    "Assistance_Level_num", "Prompt_Dependency_num", "Repetition_Need_num",
    # Leaking outcome features — drop to prevent data leakage
    "performance_score",
    "fatigue_level",
    # efficiency_gain is also downstream of performance; drop it too
    "efficiency_gain",
]

# Separate categorical and numerical feature columns
CATEGORICAL_COLS = [
    "Gender", "ID_Level", "Independent_Learning", "Assistance_Level",
    "Reading_Level", "Language_Comprehension", "Vocabulary_Level",
    "Communication_Mode", "Sensory_Sensitivity", "Preferred_Learning_Mode",
    "Prompt_Dependency", "Repetition_Need", "Activity_Duration",
    "Task_Complexity_Tolerance", "Recommended_Difficulty",
    "Recommended_Content", "Visual_Support", "Audio_Support"
]

# Label-encode high-cardinality / ordinal categoricals
label_encoders = {}
master_enc = master_df.copy()

for col in CATEGORICAL_COLS:
    le = LabelEncoder()
    master_enc[col] = le.fit_transform(master_enc[col].astype(str))
    label_encoders[col] = le

print(f"  Label-encoded {len(CATEGORICAL_COLS)} categorical columns.")

# Build feature matrix
feature_cols = [c for c in master_enc.columns if c not in DROP_COLS]
X = master_enc[feature_cols].copy()

# Scale numerical features
scaler = StandardScaler()
# Ensure plain numpy C-contiguous array (required by sklearn KNN with JAX installed)
X_scaled = pd.DataFrame(
    np.ascontiguousarray(scaler.fit_transform(X)),
    columns=X.columns
)

print(f"  Feature matrix : {X_scaled.shape}")

# ─── Step 8 – Define Target ────────────────────────────────────────────────────
print("\n[Step 8] Encoding target variable...")
target_le = LabelEncoder()
y = target_le.fit_transform(master_df["instruction_recommendation"])
print(f"  Classes : {list(target_le.classes_)} -> {list(range(len(target_le.classes_)))}")
print(f"  Class counts : {np.bincount(y)}")

# ─── Step 9 – Train / Test Split ──────────────────────────────────────────────
print("\n[Step 9] Splitting 80/20...")
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled.values, y, test_size=0.20, random_state=42, stratify=y
)
print(f"  Train : {X_train.shape[0]}  |  Test : {X_test.shape[0]}")

# ─── Step 10 – Train & Compare Models ─────────────────────────────────────────
print("\n[Step 10] Training models...")

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# ── sklearn / boosting models ─────────────────────────────────────────────────
models = {
    # Linear baseline
    "Logistic Regression": LogisticRegression(
        max_iter=1000, C=1.0, solver="lbfgs", random_state=42
    ),
    # Kernel-based
    "SVM (RBF)": SVC(kernel="rbf", C=1.0, gamma="scale",
                     probability=True, random_state=42),
    # Instance-based
    "KNN": KNeighborsClassifier(n_neighbors=7, metric="euclidean"),
    # Tree-based
    "Decision Tree": DecisionTreeClassifier(max_depth=8, random_state=42),
    "Random Forest": RandomForestClassifier(n_estimators=200, max_depth=12,
                                            random_state=42, n_jobs=-1),
}
if XGBOOST_AVAILABLE:
    models["XGBoost"] = XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        use_label_encoder=False, eval_metric="logloss",
        random_state=42, n_jobs=-1
    )


results = {}

# ── helper to save confusion matrix ──────────────────────────────────────────
def save_cm(y_true, y_pred, name, class_names):
    cm = confusion_matrix(y_true, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=class_names)
    fig, ax = plt.subplots(figsize=(5, 4))
    disp.plot(ax=ax, colorbar=False, cmap="Blues")
    ax.set_title(f"Confusion Matrix - {name}")
    plt.tight_layout()
    safe = name.replace(" ", "_").replace("(", "").replace(")", "").lower()
    fig.savefig(os.path.join(OUT_DIR, f"cm_{safe}.png"), dpi=150)
    plt.close()

# ── train sklearn / boosting models ──────────────────────────────────────────
for name, model in models.items():
    print(f"\n  -- {name} --")

    cv_scores = cross_val_score(model, X_train, y_train, cv=cv,
                                scoring="accuracy", n_jobs=-1)
    print(f"    CV Accuracy : {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    acc    = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred,
                                   target_names=target_le.classes_,
                                   output_dict=True)

    print(f"    Test Accuracy : {acc:.4f}")
    print(f"    {classification_report(y_test, y_pred, target_names=target_le.classes_)}")

    save_cm(y_test, y_pred, name, target_le.classes_)

    results[name] = {
        "model":         model,
        "cv_mean":       cv_scores.mean(),
        "cv_std":        cv_scores.std(),
        "test_accuracy": acc,
        "f1_macro":      report["macro avg"]["f1-score"],
        "precision":     report["macro avg"]["precision"],
        "recall":        report["macro avg"]["recall"],
    }

# ── DNN (Keras + JAX backend) ─────────────────────────────────────────────────
# Import Keras HERE (after all sklearn models) to prevent JAX from patching
# numpy's array flags, which breaks sklearn KNN's C-contiguity check.
if KERAS_AVAILABLE:
    try:
        import os as _os
        _os.environ.setdefault("KERAS_BACKEND", "jax")
        import keras
        from keras import layers as klayers
    except Exception as _e:
        KERAS_AVAILABLE = False
        print(f"[WARN] Keras/JAX unavailable: {_e}")
if KERAS_AVAILABLE:
    print("\n  -- DNN (Keras / JAX) --")

    import numpy as _np

    n_features = X_train.shape[1]
    n_classes  = len(np.unique(y))

    def build_dnn(input_dim, dropout_rate=0.3):
        """
        3-hidden-layer DNN with Batch Normalisation and Dropout.
        Architecture chosen to be meaningful but not overfit on 400 train samples.
        """
        inputs = keras.Input(shape=(input_dim,), name="input")
        x = klayers.Dense(128, activation="relu")(inputs)
        x = klayers.BatchNormalization()(x)
        x = klayers.Dropout(dropout_rate)(x)
        x = klayers.Dense(64, activation="relu")(x)
        x = klayers.BatchNormalization()(x)
        x = klayers.Dropout(dropout_rate)(x)
        x = klayers.Dense(32, activation="relu")(x)
        x = klayers.Dropout(dropout_rate / 2)(x)
        outputs = klayers.Dense(1, activation="sigmoid", name="output")(x)
        return keras.Model(inputs, outputs, name="DNN")

    dnn_model = build_dnn(n_features)
    dnn_model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=["accuracy"]
    )

    # Convert to float32 numpy for Keras
    X_tr_np = _np.array(X_train, dtype=_np.float32)
    y_tr_np = _np.array(y_train, dtype=_np.float32)
    X_te_np = _np.array(X_test,  dtype=_np.float32)

    # Early stopping to prevent overfitting
    early_stop = keras.callbacks.EarlyStopping(
        monitor="val_loss", patience=15, restore_best_weights=True, verbose=0
    )
    reduce_lr = keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss", factor=0.5, patience=7, min_lr=1e-5, verbose=0
    )

    history = dnn_model.fit(
        X_tr_np, y_tr_np,
        epochs=150,
        batch_size=32,
        validation_split=0.15,
        callbacks=[early_stop, reduce_lr],
        verbose=0
    )
    epochs_run = len(history.history["loss"])
    print(f"    Trained for {epochs_run} epochs (early stopping)")

    # Test predictions
    y_prob_dnn = dnn_model.predict(X_te_np, verbose=0).flatten()
    y_pred_dnn = (y_prob_dnn >= 0.5).astype(int)

    acc_dnn    = accuracy_score(y_test, y_pred_dnn)
    report_dnn = classification_report(y_test, y_pred_dnn,
                                       target_names=target_le.classes_,
                                       output_dict=True)

    # 5-fold CV for DNN using manual loop (sklearn wrapper not reliable with Keras 3)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_accs_dnn = []
    X_full_np = _np.array(X_scaled, dtype=_np.float32)
    y_full_np  = _np.array(y,        dtype=_np.float32)

    for fold, (tr_idx, val_idx) in enumerate(skf.split(X_full_np, y_full_np)):
        fold_model = build_dnn(n_features)
        fold_model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=1e-3),
            loss="binary_crossentropy", metrics=["accuracy"]
        )
        fold_es = keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=10, restore_best_weights=True, verbose=0
        )
        fold_model.fit(
            X_full_np[tr_idx], y_full_np[tr_idx],
            epochs=100, batch_size=32,
            validation_split=0.15,
            callbacks=[fold_es],
            verbose=0
        )
        fold_pred = (fold_model.predict(X_full_np[val_idx], verbose=0).flatten() >= 0.5).astype(int)
        cv_accs_dnn.append(accuracy_score(y_full_np[val_idx], fold_pred))

    cv_mean_dnn = float(_np.mean(cv_accs_dnn))
    cv_std_dnn  = float(_np.std(cv_accs_dnn))

    print(f"    CV Accuracy : {cv_mean_dnn:.4f} +/- {cv_std_dnn:.4f}")
    print(f"    Test Accuracy : {acc_dnn:.4f}")
    print(f"    {classification_report(y_test, y_pred_dnn, target_names=target_le.classes_)}")

    save_cm(y_test, y_pred_dnn, "DNN", target_le.classes_)

    # Training curve plot
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    axes[0].plot(history.history["loss"],     label="Train Loss",     color="steelblue")
    axes[0].plot(history.history["val_loss"], label="Val Loss",       color="coral")
    axes[0].set_title("DNN - Loss Curve")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Loss")
    axes[0].legend()

    axes[1].plot(history.history["accuracy"],     label="Train Acc",  color="steelblue")
    axes[1].plot(history.history["val_accuracy"], label="Val Acc",    color="coral")
    axes[1].set_title("DNN - Accuracy Curve")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Accuracy")
    axes[1].legend()

    plt.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "dnn_training_curves.png"), dpi=150)
    plt.close()
    print("    Training curves saved -> dnn_training_curves.png")

    results["DNN"] = {
        "model":         dnn_model,
        "cv_mean":       cv_mean_dnn,
        "cv_std":        cv_std_dnn,
        "test_accuracy": acc_dnn,
        "f1_macro":      report_dnn["macro avg"]["f1-score"],
        "precision":     report_dnn["macro avg"]["precision"],
        "recall":        report_dnn["macro avg"]["recall"],
    }

# ─── Model Comparison Summary ─────────────────────────────────────────────────
print("\n" + "=" * 60)
print("MODEL COMPARISON SUMMARY")
print("=" * 60)
print(f"  {'Model':<22} {'CV Acc':>8} {'CV Std':>8} {'Test Acc':>10} {'F1 Macro':>10} {'Precision':>10} {'Recall':>8}")
print("  " + "-" * 80)
for name, r in results.items():
    print(f"  {name:<22} {r['cv_mean']:>8.4f} {r['cv_std']:>8.4f} {r['test_accuracy']:>10.4f} "
          f"{r['f1_macro']:>10.4f} {r['precision']:>10.4f} {r['recall']:>8.4f}")

# ── Grouped bar chart: CV Acc vs Test Acc ─────────────────────────────────────
model_names = list(results.keys())
cv_accs     = [results[n]["cv_mean"]       for n in model_names]
test_accs   = [results[n]["test_accuracy"] for n in model_names]
f1_scores   = [results[n]["f1_macro"]      for n in model_names]
precisions  = [results[n]["precision"]     for n in model_names]
recalls     = [results[n]["recall"]        for n in model_names]

x = np.arange(len(model_names))
w = 0.35

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

axes[0].bar(x - w/2, cv_accs,   w, label="CV Accuracy",  color="steelblue",  edgecolor="black")
axes[0].bar(x + w/2, test_accs, w, label="Test Accuracy", color="coral",      edgecolor="black")
axes[0].set_xticks(x)
axes[0].set_xticklabels(model_names, rotation=20, ha="right")
axes[0].set_ylabel("Accuracy")
axes[0].set_title("CV vs Test Accuracy")
axes[0].legend()
axes[0].set_ylim(0, 1.1)
for i, (cv, te) in enumerate(zip(cv_accs, test_accs)):
    axes[0].text(i - w/2, cv + 0.01, f"{cv:.2f}", ha="center", va="bottom", fontsize=7)
    axes[0].text(i + w/2, te + 0.01, f"{te:.2f}", ha="center", va="bottom", fontsize=7)

axes[1].bar(x, f1_scores, 0.4, label="F1 Macro", color="mediumpurple", edgecolor="black")
axes[1].set_xticks(x)
axes[1].set_xticklabels(model_names, rotation=20, ha="right")
axes[1].set_ylabel("Score")
axes[1].set_title("F1 Macro Comparison")
axes[1].set_ylim(0, 1.1)
for i, f in enumerate(f1_scores):
    axes[1].text(i, f + 0.01, f"{f:.2f}", ha="center", va="bottom", fontsize=7)

plt.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "model_comparison.png"), dpi=150)
plt.close()
print(f"\n  Comparison chart saved -> model_comparison.png")

# ── Radar chart for multi-metric comparison ───────────────────────────────────
metrics_radar = ["CV Acc", "Test Acc", "F1 Macro", "Precision", "Recall"]
angles = np.linspace(0, 2 * np.pi, len(metrics_radar), endpoint=False).tolist()
angles += angles[:1]

fig_r, ax_r = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))
colors_radar = plt.cm.tab10(np.linspace(0, 1, len(model_names)))

for i, name in enumerate(model_names):
    r = results[name]
    vals = [r["cv_mean"], r["test_accuracy"], r["f1_macro"], r["precision"], r["recall"]]
    vals += vals[:1]
    ax_r.plot(angles, vals,  color=colors_radar[i], linewidth=2, label=name)
    ax_r.fill(angles, vals,  color=colors_radar[i], alpha=0.07)

ax_r.set_thetagrids(np.degrees(angles[:-1]), metrics_radar, fontsize=10)
ax_r.set_ylim(0, 1)
ax_r.set_title("Model Comparison - Radar Chart", pad=20, fontsize=13)
ax_r.legend(loc="upper right", bbox_to_anchor=(1.35, 1.1), fontsize=9)
plt.tight_layout()
fig_r.savefig(os.path.join(OUT_DIR, "model_radar_chart.png"), dpi=150)
plt.close()
print("  Radar chart saved -> model_radar_chart.png")

# ─── Step 11 – Save Best Model ────────────────────────────────────────────────
print("\n[Step 11] Saving best model artefacts...")

best_name  = max(results, key=lambda n: results[n]["test_accuracy"])
best_model = results[best_name]["model"]
print(f"  Best model : {best_name}  (Test Acc = {results[best_name]['test_accuracy']:.4f})")

# Save scaler, encoders, feature cols (always)
with open(os.path.join(OUT_DIR, "scaler.pkl"),  "wb") as f:
    pickle.dump(scaler, f)
with open(os.path.join(OUT_DIR, "encoder.pkl"), "wb") as f:
    pickle.dump({"target": target_le, "label_encoders": label_encoders}, f)
with open(os.path.join(OUT_DIR, "feature_cols.pkl"), "wb") as f:
    pickle.dump(list(X.columns), f)

# Save best model – DNN uses Keras native format, others use pickle
if best_name == "DNN":
    best_model.save(os.path.join(OUT_DIR, "model_dnn.keras"))
    print("  Saved : model_dnn.keras  |  scaler.pkl  |  encoder.pkl  |  feature_cols.pkl")
else:
    with open(os.path.join(OUT_DIR, "model.pkl"), "wb") as f:
        pickle.dump(best_model, f)
    print("  Saved : model.pkl  |  scaler.pkl  |  encoder.pkl  |  feature_cols.pkl")

# Always save the DNN weights too if it was trained
if KERAS_AVAILABLE and "DNN" in results:
    results["DNN"]["model"].save(os.path.join(OUT_DIR, "model_dnn.keras"))
    print("  DNN model also saved -> model_dnn.keras")

# ─── Feature Importances (tree-based models only) ─────────────────────────────
# Pick best tree-based model for feature importances
tree_models = {n: r for n, r in results.items()
               if hasattr(r["model"], "feature_importances_")}
if tree_models:
    # Use the best tree-based model
    best_tree_name = max(tree_models, key=lambda n: tree_models[n]["test_accuracy"])
    fi = pd.Series(results[best_tree_name]["model"].feature_importances_, index=X.columns)
    fi_top = fi.sort_values(ascending=False).head(20)

    fig, ax = plt.subplots(figsize=(8, 6))
    fi_top.sort_values().plot(kind="barh", ax=ax, color="steelblue", edgecolor="black")
    ax.set_title(f"Top 20 Feature Importances - {best_tree_name}")
    ax.set_xlabel("Importance")
    plt.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "feature_importances.png"), dpi=150)
    plt.close()
    print(f"  Feature importances chart saved -> feature_importances.png  ({best_tree_name})")

print("\n" + "=" * 60)
print("PIPELINE COMPLETE")
print(f"All outputs saved to: {OUT_DIR}")
print("=" * 60)
