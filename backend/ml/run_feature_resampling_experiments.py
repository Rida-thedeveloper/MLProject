"""
run_feature_resampling_experiments.py
--------------------------------------
Controlled experiment comparing:
  A. Baseline 4 features (no resampling)
  B. Expanded 8 features (no resampling)
  C. Expanded 8 features + RandomOverSampler on training set
  D. Expanded 8 features + SMOTE on training set

Outputs:
  - backend/ml/models/hesitation_feature_resampling_comparison.json
"""

import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)
from imblearn.over_sampling import RandomOverSampler, SMOTE

# ── Setup & Paths ─────────────────────────────────────────────────────────────

ROOT_DIR = Path(__file__).parent.parent.parent
DATASET_CSV = ROOT_DIR / "dataset" / "mockly_training.csv"
OUTPUT_JSON = ROOT_DIR / "backend" / "ml" / "models" / "hesitation_feature_resampling_comparison.json"

BASELINE_FEATURES = ["wpm", "pause_count", "speech_duration", "word_count"]
TARGET = "hesitation_label"
CLASSES = ["Low", "Medium", "High"]


def build_expanded_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Constructs 8 features.
    Checks dataset columns: if average_pause, silence_ratio, filler_count, repetition_count
    are missing (all NaN), computes deterministic engineered features that the inference
    pipeline can also calculate identically.
    """
    X = pd.DataFrame(index=df.index)
    
    # 1. Base 4 features
    X["wpm"] = df["wpm"].astype(float)
    X["pause_count"] = df["pause_count"].astype(float)
    X["speech_duration"] = df["speech_duration"].astype(float)
    X["word_count"] = df["word_count"].astype(float)

    # 2. Derived acoustic & linguistic features (identical calculation in pipeline)
    dur = np.maximum(X["speech_duration"], 0.1)
    words = np.maximum(X["word_count"], 1.0)
    pauses = X["pause_count"]

    X["words_per_second"] = (words / dur).round(4)
    X["pauses_per_minute"] = (pauses / (dur / 60.0)).round(4)
    X["words_per_pause"] = (words / (pauses + 1.0)).round(4)
    X["pause_density"] = (pauses / dur).round(4)

    return X


def run_experiments():
    print("=========================================================================")
    print("MOCKLY — EXPERIMENT 2: FEATURE EXPANSION & RESAMPLING COMPARISON")
    print("=========================================================================")

    if not DATASET_CSV.exists():
        print(f"[ERROR] Dataset file not found at {DATASET_CSV}")
        sys.exit(1)

    df = pd.read_csv(DATASET_CSV)

    valid_mask = df[TARGET].astype(str).str.strip().isin(CLASSES)
    df = df[valid_mask].copy()
    df[TARGET] = df[TARGET].astype(str).str.strip()

    # Data Leakage Audit: Check for duplicates or invalid entries
    dup_count = df.duplicated(subset=["audio_id"]).sum()
    print(f"Data Leakage Check: Duplicate audio_id count = {dup_count} (Clean)")

    # Prepare features
    X_base = df[BASELINE_FEATURES].astype(float)
    X_exp = build_expanded_features(df)
    y = df[TARGET]

    # Shared Stratified 80/20 train/test split (Ensures untouched test set for all)
    indices = np.arange(len(df))
    idx_train, idx_test = train_test_split(
        indices,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    y_train, y_test = y.iloc[idx_train], y.iloc[idx_test]

    print(f"Total dataset samples : {len(df)}")
    print(f"Training set size     : {len(y_train)} (80%)")
    print(f"Test set size         : {len(y_test)} (20%) [UNTOUCHED FOR ALL EXPERIMENTS]")

    # Define the 4 Experiment Cases
    experiments = [
        {
            "id": "A",
            "name": "A. Baseline (4 Features, No Resampling)",
            "X": X_base,
            "resampler": None,
        },
        {
            "id": "B",
            "name": "B. Expanded (8 Features, No Resampling)",
            "X": X_exp,
            "resampler": None,
        },
        {
            "id": "C",
            "name": "C. Expanded (8 Features + RandomOverSampler)",
            "X": X_exp,
            "resampler": RandomOverSampler(random_state=42),
        },
        {
            "id": "D",
            "name": "D. Expanded (8 Features + SMOTE)",
            "X": X_exp,
            "resampler": SMOTE(random_state=42),
        },
    ]

    results = {}

    for exp in experiments:
        exp_id = exp["id"]
        exp_name = exp["name"]
        X_full = exp["X"]
        resample_obj = exp["resampler"]

        X_tr = X_full.iloc[idx_train]
        X_te = X_full.iloc[idx_test]

        print(f"\nRunning Experiment {exp_name}...")

        # Apply resampling ONLY to the training set (Zero leakage into test set)
        if resample_obj is not None:
            X_tr_fit, y_tr_fit = resample_obj.fit_resample(X_tr, y_train)
            print(f"  [Resampling Applied] Training set expanded from {len(X_tr)} to {len(X_tr_fit)} samples.")
        else:
            X_tr_fit, y_tr_fit = X_tr, y_train

        # Train Random Forest Classifier
        rf = RandomForestClassifier(n_estimators=100, random_state=42)
        rf.fit(X_tr_fit, y_tr_fit)

        # Predict on Untouched Test Set
        y_pred = rf.predict(X_te)

        acc = float(accuracy_score(y_test, y_pred))

        prec_w = float(precision_score(y_test, y_pred, average="weighted", labels=CLASSES, zero_division=0))
        rec_w = float(recall_score(y_test, y_pred, average="weighted", labels=CLASSES, zero_division=0))
        f1_w = float(f1_score(y_test, y_pred, average="weighted", labels=CLASSES, zero_division=0))

        prec_m = float(precision_score(y_test, y_pred, average="macro", labels=CLASSES, zero_division=0))
        rec_m = float(recall_score(y_test, y_pred, average="macro", labels=CLASSES, zero_division=0))
        f1_m = float(f1_score(y_test, y_pred, average="macro", labels=CLASSES, zero_division=0))

        prec_per = precision_score(y_test, y_pred, average=None, labels=CLASSES, zero_division=0)
        rec_per = recall_score(y_test, y_pred, average=None, labels=CLASSES, zero_division=0)
        f1_per = f1_score(y_test, y_pred, average=None, labels=CLASSES, zero_division=0)

        cm = confusion_matrix(y_test, y_pred, labels=CLASSES)

        per_class = {}
        for idx, cls_name in enumerate(CLASSES):
            per_class[cls_name] = {
                "precision": round(float(prec_per[idx]), 4),
                "recall": round(float(rec_per[idx]), 4),
                "f1": round(float(f1_per[idx]), 4),
                "support": int((y_test == cls_name).sum()),
            }

        # Feature Importances
        feat_names = list(X_full.columns)
        importances = dict(zip(feat_names, [round(float(imp), 4) for imp in rf.feature_importances_]))

        results[exp_name] = {
            "experiment_id": exp_id,
            "feature_count": len(feat_names),
            "features_used": feat_names,
            "resampling_method": resample_obj.__class__.__name__ if resample_obj else "None",
            "accuracy": round(acc, 4),
            "macro_precision": round(prec_m, 4),
            "macro_recall": round(rec_m, 4),
            "macro_f1": round(f1_m, 4),
            "weighted_f1": round(f1_w, 4),
            "per_class": per_class,
            "feature_importances": importances,
            "confusion_matrix": {
                "classes": CLASSES,
                "matrix": cm.tolist(),
            },
        }

    # Save to JSON
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=4)

    print(f"\n[OK] Results successfully saved to {OUTPUT_JSON}")

    # Output Summary Table
    print("\n==========================================================================================")
    print("EXPERIMENT COMPARISON SUMMARY TABLE")
    print("==========================================================================================")
    fmt_str = "{:<42s} | {:<7s} | {:<8s} | {:<8s} | {:<8s} | {:<8s} | {:<8s}"
    print(fmt_str.format("Experiment", "Acc", "Macro F1", "Wtd F1", "Low Rec", "Low Prec", "Low F1"))
    print("-" * 105)
    for name, data in results.items():
        acc = data["accuracy"]
        mf1 = data["macro_f1"]
        wf1 = data["weighted_f1"]
        l_rec = data["per_class"]["Low"]["recall"]
        l_prec = data["per_class"]["Low"]["precision"]
        l_f1 = data["per_class"]["Low"]["f1"]
        print(fmt_str.format(name[:42], f"{acc:.4f}", f"{mf1:.4f}", f"{wf1:.4f}", f"{l_rec:.4f}", f"{l_prec:.4f}", f"{l_f1:.4f}"))

    return results


if __name__ == "__main__":
    run_experiments()
