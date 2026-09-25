"""
run_cv_threshold_experiments.py
--------------------------------
Stratified 5-Fold Cross Validation & Threshold Analysis for SMOTE + Random Forest.

Requirements:
  1. Expanded 8-feature representation.
  2. Baseline RF vs SMOTE + RF using StratifiedKFold (n_splits=5, shuffle=True, random_state=42).
  3. Strict fold isolation: SMOTE applied INSIDE training folds ONLY.
  4. Out-of-fold probability inspection & threshold tuning for Low class.
  5. Mean and std dev across 5 folds for Accuracy, Macro F1, Weighted F1, Macro Recall.

Outputs:
  - backend/ml/models/hesitation_cv_threshold_comparison.json
"""

import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)
from imblearn.over_sampling import SMOTE

# ── Paths & Setup ─────────────────────────────────────────────────────────────

ROOT_DIR = Path(__file__).parent.parent.parent
DATASET_CSV = ROOT_DIR / "dataset" / "mockly_training.csv"
OUTPUT_JSON = ROOT_DIR / "backend" / "ml" / "models" / "hesitation_cv_threshold_comparison.json"

TARGET = "hesitation_label"
CLASSES = ["Low", "Medium", "High"]


def build_expanded_features(df: pd.DataFrame) -> pd.DataFrame:
    X = pd.DataFrame(index=df.index)
    X["wpm"] = df["wpm"].astype(float)
    X["pause_count"] = df["pause_count"].astype(float)
    X["speech_duration"] = df["speech_duration"].astype(float)
    X["word_count"] = df["word_count"].astype(float)

    dur = np.maximum(X["speech_duration"], 0.1)
    words = np.maximum(X["word_count"], 1.0)
    pauses = X["pause_count"]

    X["words_per_second"] = (words / dur).round(4)
    X["pauses_per_minute"] = (pauses / (dur / 60.0)).round(4)
    X["words_per_pause"] = (words / (pauses + 1.0)).round(4)
    X["pause_density"] = (pauses / dur).round(4)
    return X


def predict_with_low_threshold(probas: np.ndarray, low_thresh: float) -> np.ndarray:
    """
    If P(Low) >= low_thresh, predict 'Low'.
    Otherwise, choose between Medium and High based on higher probability.
    """
    preds = []
    for p in probas:
        p_low, p_med, p_high = p[0], p[1], p[2]
        if p_low >= low_thresh:
            preds.append("Low")
        else:
            preds.append("Medium" if p_med >= p_high else "High")
    return np.array(preds)


def run_cv_experiments():
    print("=========================================================================")
    print("MOCKLY — EXPERIMENT 3: STRATIFIED 5-FOLD CV & THRESHOLD TUNING")
    print("=========================================================================")

    if not DATASET_CSV.exists():
        print(f"[ERROR] Dataset file not found at {DATASET_CSV}")
        sys.exit(1)

    df = pd.read_csv(DATASET_CSV)
    valid_mask = df[TARGET].astype(str).str.strip().isin(CLASSES)
    df = df[valid_mask].copy()
    df[TARGET] = df[TARGET].astype(str).str.strip()

    X = build_expanded_features(df)
    y = df[TARGET].values

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # ── 1. Baseline 5-Fold CV (No SMOTE) ──────────────────────────────────────
    print("\n[1/3] Running Stratified 5-Fold CV for Baseline RF (No SMOTE)...")
    base_fold_metrics = []
    base_oof_preds = np.empty(len(df), dtype=object)

    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y), 1):
        X_tr, y_tr = X.iloc[train_idx], y[train_idx]
        X_va, y_va = X.iloc[val_idx], y[val_idx]

        rf = RandomForestClassifier(n_estimators=100, random_state=42)
        rf.fit(X_tr, y_tr)

        y_pred = rf.predict(X_va)
        base_oof_preds[val_idx] = y_pred

        acc = accuracy_score(y_va, y_pred)
        mf1 = f1_score(y_va, y_pred, average="macro", labels=CLASSES, zero_division=0)
        wf1 = f1_score(y_va, y_pred, average="weighted", labels=CLASSES, zero_division=0)
        mrec = recall_score(y_va, y_pred, average="macro", labels=CLASSES, zero_division=0)

        prec_per = precision_score(y_va, y_pred, average=None, labels=CLASSES, zero_division=0)
        rec_per = recall_score(y_va, y_pred, average=None, labels=CLASSES, zero_division=0)
        f1_per = f1_score(y_va, y_pred, average=None, labels=CLASSES, zero_division=0)

        base_fold_metrics.append({
            "fold": fold,
            "accuracy": acc,
            "macro_f1": mf1,
            "weighted_f1": wf1,
            "macro_recall": mrec,
            "low_precision": prec_per[0],
            "low_recall": rec_per[0],
            "low_f1": f1_per[0],
        })

    # ── 2. SMOTE 5-Fold CV (SMOTE inside training folds ONLY) ──────────────────
    print("\n[2/3] Running Stratified 5-Fold CV for SMOTE + RF...")
    smote_fold_metrics = []
    smote_oof_probas = np.zeros((len(df), 3), dtype=float)
    smote_oof_preds_default = np.empty(len(df), dtype=object)

    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y), 1):
        X_tr, y_tr = X.iloc[train_idx], y[train_idx]
        X_va, y_va = X.iloc[val_idx], y[val_idx]

        # Apply SMOTE strictly inside training fold
        smote = SMOTE(random_state=42)
        X_tr_sm, y_tr_sm = smote.fit_resample(X_tr, y_tr)

        rf = RandomForestClassifier(n_estimators=100, random_state=42)
        rf.fit(X_tr_sm, y_tr_sm)

        y_pred = rf.predict(X_va)
        probas = rf.predict_proba(X_va)

        smote_oof_preds_default[val_idx] = y_pred
        smote_oof_probas[val_idx] = probas

        acc = accuracy_score(y_va, y_pred)
        mf1 = f1_score(y_va, y_pred, average="macro", labels=CLASSES, zero_division=0)
        wf1 = f1_score(y_va, y_pred, average="weighted", labels=CLASSES, zero_division=0)
        mrec = recall_score(y_va, y_pred, average="macro", labels=CLASSES, zero_division=0)

        prec_per = precision_score(y_va, y_pred, average=None, labels=CLASSES, zero_division=0)
        rec_per = recall_score(y_va, y_pred, average=None, labels=CLASSES, zero_division=0)
        f1_per = f1_score(y_va, y_pred, average=None, labels=CLASSES, zero_division=0)

        smote_fold_metrics.append({
            "fold": fold,
            "accuracy": acc,
            "macro_f1": mf1,
            "weighted_f1": wf1,
            "macro_recall": mrec,
            "low_precision": prec_per[0],
            "low_recall": rec_per[0],
            "low_f1": f1_per[0],
        })

    # Aggregate fold stats
    def calc_stats(metric_key, fold_list):
        vals = [f[metric_key] for f in fold_list]
        return round(float(np.mean(vals)), 4), round(float(np.std(vals)), 4)

    base_summary = {
        "accuracy_mean": calc_stats("accuracy", base_fold_metrics)[0],
        "accuracy_std": calc_stats("accuracy", base_fold_metrics)[1],
        "macro_f1_mean": calc_stats("macro_f1", base_fold_metrics)[0],
        "macro_f1_std": calc_stats("macro_f1", base_fold_metrics)[1],
        "weighted_f1_mean": calc_stats("weighted_f1", base_fold_metrics)[0],
        "weighted_f1_std": calc_stats("weighted_f1", base_fold_metrics)[1],
        "macro_recall_mean": calc_stats("macro_recall", base_fold_metrics)[0],
        "macro_recall_std": calc_stats("macro_recall", base_fold_metrics)[1],
        "low_precision_mean": calc_stats("low_precision", base_fold_metrics)[0],
        "low_precision_std": calc_stats("low_precision", base_fold_metrics)[1],
        "low_recall_mean": calc_stats("low_recall", base_fold_metrics)[0],
        "low_recall_std": calc_stats("low_recall", base_fold_metrics)[1],
        "low_f1_mean": calc_stats("low_f1", base_fold_metrics)[0],
        "low_f1_std": calc_stats("low_f1", base_fold_metrics)[1],
    }

    smote_summary = {
        "accuracy_mean": calc_stats("accuracy", smote_fold_metrics)[0],
        "accuracy_std": calc_stats("accuracy", smote_fold_metrics)[1],
        "macro_f1_mean": calc_stats("macro_f1", smote_fold_metrics)[0],
        "macro_f1_std": calc_stats("macro_f1", smote_fold_metrics)[1],
        "weighted_f1_mean": calc_stats("weighted_f1", smote_fold_metrics)[0],
        "weighted_f1_std": calc_stats("weighted_f1", smote_fold_metrics)[1],
        "macro_recall_mean": calc_stats("macro_recall", smote_fold_metrics)[0],
        "macro_recall_std": calc_stats("macro_recall", smote_fold_metrics)[1],
        "low_precision_mean": calc_stats("low_precision", smote_fold_metrics)[0],
        "low_precision_std": calc_stats("low_precision", smote_fold_metrics)[1],
        "low_recall_mean": calc_stats("low_recall", smote_fold_metrics)[0],
        "low_recall_std": calc_stats("low_recall", smote_fold_metrics)[1],
        "low_f1_mean": calc_stats("low_f1", smote_fold_metrics)[0],
        "low_f1_std": calc_stats("low_f1", smote_fold_metrics)[1],
    }

    # ── 3. Low-Class Decision Threshold Tuning on SMOTE Out-of-Fold Probas ────
    print("\n[3/3] Evaluating Low-Class Probability Thresholds for SMOTE RF...")
    thresholds_to_test = [0.15, 0.20, 0.25, 0.30, 0.33, 0.40]
    threshold_results = {}

    for th in thresholds_to_test:
        preds_th = predict_with_low_threshold(smote_oof_probas, th)
        
        acc = float(accuracy_score(y, preds_th))
        mf1 = float(f1_score(y, preds_th, average="macro", labels=CLASSES, zero_division=0))
        wf1 = float(f1_score(y, preds_th, average="weighted", labels=CLASSES, zero_division=0))

        prec_per = precision_score(y, preds_th, average=None, labels=CLASSES, zero_division=0)
        rec_per = recall_score(y, preds_th, average=None, labels=CLASSES, zero_division=0)
        f1_per = f1_score(y, preds_th, average=None, labels=CLASSES, zero_division=0)

        cm = confusion_matrix(y, preds_th, labels=CLASSES)

        threshold_results[f"threshold_{th:.2f}"] = {
            "low_threshold": th,
            "accuracy": round(acc, 4),
            "macro_f1": round(mf1, 4),
            "weighted_f1": round(wf1, 4),
            "per_class": {
                "Low": {
                    "precision": round(float(prec_per[0]), 4),
                    "recall": round(float(rec_per[0]), 4),
                    "f1": round(float(f1_per[0]), 4),
                    "support": int((y == "Low").sum()),
                },
                "Medium": {
                    "precision": round(float(prec_per[1]), 4),
                    "recall": round(float(rec_per[1]), 4),
                    "f1": round(float(f1_per[1]), 4),
                    "support": int((y == "Medium").sum()),
                },
                "High": {
                    "precision": round(float(prec_per[2]), 4),
                    "recall": round(float(rec_per[2]), 4),
                    "f1": round(float(f1_per[2]), 4),
                    "support": int((y == "High").sum()),
                },
            },
            "confusion_matrix": cm.tolist(),
        }

    # Save to JSON
    output_data = {
        "dataset_samples": len(df),
        "features_used": list(X.columns),
        "cv_folds": 5,
        "baseline_rf_cv_summary": base_summary,
        "smote_rf_cv_summary": smote_summary,
        "baseline_fold_details": base_fold_metrics,
        "smote_fold_details": smote_fold_metrics,
        "threshold_tuning_smote_oof": threshold_results,
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=4)

    print(f"\n[OK] Results successfully saved to {OUTPUT_JSON}")

    # Print Summary Tables
    print("\n==========================================================================================")
    print("5-FOLD CROSS VALIDATION SUMMARY (MEAN ± STD)")
    print("==========================================================================================")
    print(f"Baseline RF (No SMOTE) | Acc: {base_summary['accuracy_mean']:.4f}±{base_summary['accuracy_std']:.4f} | Macro F1: {base_summary['macro_f1_mean']:.4f}±{base_summary['macro_f1_std']:.4f} | Low Rec: {base_summary['low_recall_mean']:.4f}±{base_summary['low_recall_std']:.4f} | Low F1: {base_summary['low_f1_mean']:.4f}±{base_summary['low_f1_std']:.4f}")
    print(f"SMOTE + RF             | Acc: {smote_summary['accuracy_mean']:.4f}±{smote_summary['accuracy_std']:.4f} | Macro F1: {smote_summary['macro_f1_mean']:.4f}±{smote_summary['macro_f1_std']:.4f} | Low Rec: {smote_summary['low_recall_mean']:.4f}±{smote_summary['low_recall_std']:.4f} | Low F1: {smote_summary['low_f1_mean']:.4f}±{smote_summary['low_f1_std']:.4f}")

    print("\n==========================================================================================")
    print("DECISION THRESHOLD TRADE-OFF TABLE (SMOTE Out-of-Fold)")
    print("==========================================================================================")
    fmt_str = "{:<16s} | {:<8s} | {:<8s} | {:<8s} | {:<8s} | {:<8s} | {:<8s}"
    print(fmt_str.format("Low Threshold", "Acc", "Macro F1", "Wtd F1", "Low Rec", "Low Prec", "Low F1"))
    print("-" * 80)
    for key, data in threshold_results.items():
        th = data["low_threshold"]
        acc = data["accuracy"]
        mf1 = data["macro_f1"]
        wf1 = data["weighted_f1"]
        l_rec = data["per_class"]["Low"]["recall"]
        l_prec = data["per_class"]["Low"]["precision"]
        l_f1 = data["per_class"]["Low"]["f1"]
        print(fmt_str.format(f"Threshold = {th:.2f}", f"{acc:.4f}", f"{mf1:.4f}", f"{wf1:.4f}", f"{l_rec:.4f}", f"{l_prec:.4f}", f"{l_f1:.4f}"))

    return output_data


if __name__ == "__main__":
    run_cv_experiments()
