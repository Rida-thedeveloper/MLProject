"""
run_hesitation_experiments.py
------------------------------
Experimentation script to compare Random Forest class weight configurations
for solving the Low-hesitation recall bottleneck without using SMOTE or modifying production models yet.

Configurations evaluated:
  1. Current Model (class_weight=None)
  2. Balanced Class Weight (class_weight="balanced")
  3. Balanced Subsample Class Weight (class_weight="balanced_subsample")
  4. Custom Weighted RF (class_weight={"Low": 6.0, "Medium": 1.0, "High": 1.0})

Outputs:
  - backend/ml/models/hesitation_model_comparison.json
"""

import os
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
    classification_report,
)

# ── Paths & Setup ─────────────────────────────────────────────────────────────

ROOT_DIR = Path(__file__).parent.parent.parent
DATASET_CSV = ROOT_DIR / "dataset" / "mockly_training.csv"
OUTPUT_JSON = ROOT_DIR / "backend" / "ml" / "models" / "hesitation_model_comparison.json"

FEATURES = ["wpm", "pause_count", "speech_duration", "word_count"]
TARGET = "hesitation_label"
CLASSES = ["Low", "Medium", "High"]


def run_experiments():
    print("==================================================")
    print("MOCKLY — HESITATION MODEL EXPERIMENTS (CLASS WEIGHT TUNING)")
    print("==================================================")

    if not DATASET_CSV.exists():
        print(f"[ERROR] Dataset not found at {DATASET_CSV}")
        sys.exit(1)

    df = pd.read_csv(DATASET_CSV)

    # Filter valid rows
    valid_mask = df[TARGET].astype(str).str.strip().isin(CLASSES)
    df = df[valid_mask].copy()
    df[TARGET] = df[TARGET].astype(str).str.strip()

    missing_mask = df[FEATURES].isnull().any(axis=1)
    df = df[~missing_mask].copy()

    X = df[FEATURES].astype(float)
    y = df[TARGET]

    # Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    print(f"Total dataset samples : {len(df)}")
    print(f"Training set size     : {len(X_train)} (80%)")
    print(f"Test set size         : {len(X_test)} (20%)")
    print("\nClass distribution in Test Set:")
    class_counts = y_test.value_counts()
    for c in CLASSES:
        cnt = class_counts.get(c, 0)
        pct = (cnt / len(y_test)) * 100
        print(f"  - {c:8s}: {cnt:4d} ({pct:.1f}%)")

    # Experiment Configurations
    configs = [
        {"name": "Current Model (None)", "class_weight": None},
        {"name": "Balanced (class_weight='balanced')", "class_weight": "balanced"},
        {"name": "Balanced Subsample (class_weight='balanced_subsample')", "class_weight": "balanced_subsample"},
        {"name": "Custom Boosted Low (class_weight={'Low': 8.0, 'Medium': 1.0, 'High': 1.0})", "class_weight": {"Low": 8.0, "Medium": 1.0, "High": 1.0}},
        {"name": "Aggressive Low Boost (class_weight={'Low': 15.0, 'Medium': 1.0, 'High': 1.0})", "class_weight": {"Low": 15.0, "Medium": 1.0, "High": 1.0}},
    ]

    results = {}

    for cfg in configs:
        cfg_name = cfg["name"]
        cw = cfg["class_weight"]
        print(f"\nEvaluating: {cfg_name}...")

        rf = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            class_weight=cw,
        )
        rf.fit(X_train, y_train)

        y_pred = rf.predict(X_test)

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

        results[cfg_name] = {
            "class_weight": str(cw),
            "accuracy": round(acc, 4),
            "macro_precision": round(prec_m, 4),
            "macro_recall": round(rec_m, 4),
            "macro_f1": round(f1_m, 4),
            "weighted_f1": round(f1_w, 4),
            "per_class": per_class,
            "confusion_matrix": {
                "classes": CLASSES,
                "matrix": cm.tolist(),
            },
        }

    # Save comparison to JSON
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=4)

    print(f"\n[OK] Experiment results saved to {OUTPUT_JSON}")

    # Print Summary Table
    print("\n=========================================================================================")
    print("COMPARISON SUMMARY TABLE")
    print("=========================================================================================")
    fmt_str = "{:<45s} | {:<8s} | {:<8s} | {:<8s} | {:<8s} | {:<8s} | {:<8s}"
    print(fmt_str.format("Model Configuration", "Acc", "Macro F1", "Wtd F1", "Low Rec", "Low F1", "Med Rec"))
    print("-" * 105)
    for name, data in results.items():
        acc = data["accuracy"]
        mf1 = data["macro_f1"]
        wf1 = data["weighted_f1"]
        l_rec = data["per_class"]["Low"]["recall"]
        l_f1 = data["per_class"]["Low"]["f1"]
        m_rec = data["per_class"]["Medium"]["recall"]
        print(fmt_str.format(name[:45], f"{acc:.4f}", f"{mf1:.4f}", f"{wf1:.4f}", f"{l_rec:.4f}", f"{l_f1:.4f}", f"{m_rec:.4f}"))

    return results


if __name__ == "__main__":
    run_experiments()
