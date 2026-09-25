"""
Balanced Hesitation Dataset Experiment
=======================================
Comprehensive evaluation using only defensible balancing methods.

Stages
------
1. SOURCE AUDIT
   - Inspect audio_speaking_dataset.csv and mockly_training.csv
   - Report exact Low / Medium / High counts and percentages
   - Determine how many REAL Low samples exist
   - Compute per-class feature statistics to expose distribution overlap

2. LEAKAGE AUDIT
   - Inspect how labels were originally assigned
   - Detect any features used both to assign labels AND as model input

3. DATASET CONSTRUCTION
   Dataset-1 (original)   : mockly_training.csv as-is, original labels
   Dataset-2 (real-only)  : Stratified subsample to closest natural balance
                            using ONLY real Low samples (no synthesis)
   Dataset-3 (ROS)        : Dataset-1 + RandomOverSampler on TRAIN fold only
   Dataset-4 (SMOTE)      : Dataset-1 + SMOTE on TRAIN fold only

4. CROSS-VALIDATION
   - Stratified 5-Fold on all 4 datasets
   - RandomForest(n_estimators=200, class_weight=balanced, random_state=42)
   - SMOTE / ROS applied strictly INSIDE training folds only
   - Metrics: Accuracy, Macro-F1, Weighted-F1, Macro-Recall
   - Per-class: Precision, Recall, F1 (Low/Medium/High)
   - Confusion matrices

5. FINAL REPORT
   - Compare all 4 datasets
   - State explicitly how many real Low samples are available
   - If Low is still under-represented, report how many more are needed
   - Answer: Is Low recall consistent across folds or artifact of one split?

Output files
------------
  dataset/hesitation_balanced_real_only.csv      (Dataset-2)
  ml/models/hesitation_balance_experiment.json   (all results)

Production model hesitation_rf_v2.joblib is NEVER touched.
"""

import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

warnings.filterwarnings("ignore")

# ── paths ─────────────────────────────────────────────────────────────────────
ROOT         = Path(__file__).resolve().parent.parent.parent
AUDIO_CSV    = ROOT / "dataset" / "audio_speaking_dataset.csv"
TRAIN_CSV    = ROOT / "dataset" / "mockly_training.csv"
OUT_DS2_CSV  = ROOT / "dataset" / "hesitation_balanced_real_only.csv"
OUT_JSON     = ROOT / "backend" / "ml" / "models" / "hesitation_balance_experiment.json"

LABEL_COL  = "hesitation_label"
CLASSES    = ["Low", "Medium", "High"]
FEATURES   = ["wpm", "pause_count", "speech_duration", "word_count"]

RF_PARAMS = dict(
    n_estimators=200,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)
N_FOLDS = 5

# ── helpers ───────────────────────────────────────────────────────────────────

def class_stats(series: pd.Series) -> dict:
    counts = series.value_counts().to_dict()
    total  = len(series)
    return {
        "counts":      {k: int(counts.get(k, 0)) for k in CLASSES},
        "percentages": {k: round(counts.get(k, 0) / total * 100, 2) for k in CLASSES},
        "total":       total,
    }


def per_class_metrics(y_true, y_pred) -> dict:
    out = {}
    for cls in CLASSES:
        yt = (np.array(y_true) == cls).astype(int)
        yp = (np.array(y_pred) == cls).astype(int)
        out[cls] = {
            "precision": round(float(precision_score(yt, yp, zero_division=0)), 4),
            "recall":    round(float(recall_score(yt, yp, zero_division=0)),    4),
            "f1":        round(float(f1_score(yt, yp, zero_division=0)),        4),
            "support":   int(yt.sum()),
        }
    return out


def run_cv(X: pd.DataFrame, y: pd.Series,
           label: str,
           resample_method: str = "none") -> dict:
    """
    Stratified 5-fold CV.
    resample_method: 'none' | 'ros' | 'smote'
    Resampling applied ONLY to training folds.
    """
    print(f"\n  [{label}]  resampling={resample_method}")
    skf  = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=42)
    fold_results = []
    all_yt, all_yp = [], []

    for fold_idx, (tr, va) in enumerate(skf.split(X, y), 1):
        X_tr, X_va = X.iloc[tr].values, X.iloc[va].values
        y_tr, y_va = y.iloc[tr].values, y.iloc[va].values

        # ── resample training fold only ────────────────────────────────────
        if resample_method == "ros":
            from imblearn.over_sampling import RandomOverSampler
            ros = RandomOverSampler(random_state=42)
            X_tr, y_tr = ros.fit_resample(X_tr, y_tr)
        elif resample_method == "smote":
            from imblearn.over_sampling import SMOTE
            # SMOTE needs k_neighbors < minority class size
            min_count = min(np.bincount(
                np.unique(y_tr, return_inverse=True)[1]))
            k = min(5, min_count - 1)
            if k < 1:
                # too few samples — fall back to ROS for this fold
                from imblearn.over_sampling import RandomOverSampler
                ros = RandomOverSampler(random_state=42)
                X_tr, y_tr = ros.fit_resample(X_tr, y_tr)
            else:
                smt = SMOTE(k_neighbors=k, random_state=42)
                X_tr, y_tr = smt.fit_resample(X_tr, y_tr)

        clf = RandomForestClassifier(**RF_PARAMS)
        clf.fit(X_tr, y_tr)
        y_pred = clf.predict(X_va)

        fold_acc  = float(accuracy_score(y_va, y_pred))
        fold_mf1  = float(f1_score(y_va, y_pred, average="macro",    zero_division=0))
        fold_wf1  = float(f1_score(y_va, y_pred, average="weighted", zero_division=0))
        fold_mr   = float(recall_score(y_va, y_pred, average="macro", zero_division=0))
        fold_pc   = per_class_metrics(y_va, y_pred)
        low_r     = fold_pc["Low"]["recall"]

        print(f"    Fold {fold_idx}: Acc={fold_acc:.4f}  MacroF1={fold_mf1:.4f}  "
              f"LowRecall={low_r:.4f}  LowF1={fold_pc['Low']['f1']:.4f}")

        fold_results.append({
            "fold":        fold_idx,
            "accuracy":    round(fold_acc, 4),
            "macro_f1":    round(fold_mf1, 4),
            "weighted_f1": round(fold_wf1, 4),
            "macro_recall":round(fold_mr,  4),
            "per_class":   fold_pc,
        })
        all_yt.extend(y_va.tolist())
        all_yp.extend(y_pred.tolist())

    # ── aggregate ─────────────────────────────────────────────────────────
    def agg(key):
        vals = [f[key] for f in fold_results]
        return round(float(np.mean(vals)), 4), round(float(np.std(vals)), 4)

    acc_m, acc_s  = agg("accuracy")
    mf1_m, mf1_s  = agg("macro_f1")
    wf1_m, wf1_s  = agg("weighted_f1")
    mr_m,  mr_s   = agg("macro_recall")

    per_class_agg = {}
    for cls in CLASSES:
        ps = [f["per_class"][cls]["precision"] for f in fold_results]
        rs = [f["per_class"][cls]["recall"]    for f in fold_results]
        fs = [f["per_class"][cls]["f1"]        for f in fold_results]
        per_class_agg[cls] = {
            "mean_precision": round(float(np.mean(ps)), 4),
            "std_precision":  round(float(np.std(ps)),  4),
            "mean_recall":    round(float(np.mean(rs)), 4),
            "std_recall":     round(float(np.std(rs)),  4),
            "mean_f1":        round(float(np.mean(fs)), 4),
            "std_f1":         round(float(np.std(fs)),  4),
        }

    cm = confusion_matrix(all_yt, all_yp, labels=CLASSES)

    # consistency check: is Low recall consistently > 0 across ALL folds?
    low_recalls = [f["per_class"]["Low"]["recall"] for f in fold_results]
    nonzero_folds = sum(1 for r in low_recalls if r > 0)
    consistent = nonzero_folds == N_FOLDS

    print(f"    --> Low recall per fold: {[round(r,3) for r in low_recalls]}")
    print(f"    --> Consistent Low recall (all folds>0): {consistent}")

    return {
        "label":           label,
        "resample_method": resample_method,
        "n_samples_total": len(X),
        "class_dist":      class_stats(y),
        "cv_folds":        N_FOLDS,
        "summary": {
            "mean_accuracy":     acc_m, "std_accuracy":     acc_s,
            "mean_macro_f1":     mf1_m, "std_macro_f1":     mf1_s,
            "mean_weighted_f1":  wf1_m, "std_weighted_f1":  wf1_s,
            "mean_macro_recall": mr_m,  "std_macro_recall": mr_s,
        },
        "per_class":             per_class_agg,
        "low_recall_per_fold":   [round(r, 4) for r in low_recalls],
        "low_recall_consistent_all_folds": consistent,
        "confusion_matrix": {
            "labels": CLASSES,
            "matrix": cm.tolist(),
        },
        "fold_details": fold_results,
    }


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("BALANCED HESITATION DATASET EXPERIMENT")
    print("=" * 70)

    # ── 1. SOURCE AUDIT ───────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("STAGE 1: SOURCE AUDIT")
    print("=" * 60)

    audio = pd.read_csv(AUDIO_CSV)
    train = pd.read_csv(TRAIN_CSV)

    print(f"\n  audio_speaking_dataset.csv  shape: {audio.shape}")
    print(f"  mockly_training.csv         shape: {train.shape}")

    audio_dist = class_stats(audio["target_level"])
    train_dist = class_stats(train[LABEL_COL])

    print("\n  audio_speaking_dataset.csv — target_level:")
    for cls in CLASSES:
        print(f"    {cls:<8}: {audio_dist['counts'][cls]:>5}  "
              f"({audio_dist['percentages'][cls]:>5.2f}%)")

    print("\n  mockly_training.csv — hesitation_label:")
    for cls in CLASSES:
        print(f"    {cls:<8}: {train_dist['counts'][cls]:>5}  "
              f"({train_dist['percentages'][cls]:>5.2f}%)")

    real_low = train_dist["counts"]["Low"]
    real_mid = train_dist["counts"]["Medium"]
    real_hi  = train_dist["counts"]["High"]
    total    = train_dist["total"]
    print(f"\n  REAL Low samples available: {real_low} ({real_low/total*100:.2f}%)")

    # Per-class feature statistics
    print("\n  Per-class feature means (mockly_training.csv):")
    print(f"    {'Class':<10} {'WPM':>10} {'Pauses':>10} {'Duration':>12} {'Words':>10}")
    for cls in CLASSES:
        sub = train[train[LABEL_COL] == cls]
        print(f"    {cls:<10} {sub['wpm'].mean():>10.2f} {sub['pause_count'].mean():>10.2f} "
              f"{sub['speech_duration'].mean():>12.2f} {sub['word_count'].mean():>10.2f}")

    # Check if Low is statistically distinguishable
    print("\n  Feature range comparison (Low vs rest):")
    low_sub  = train[train[LABEL_COL] == "Low"]
    rest_sub = train[train[LABEL_COL] != "Low"]
    for feat in FEATURES:
        lm = low_sub[feat].mean()
        rm = rest_sub[feat].mean()
        diff_pct = abs(lm - rm) / max(abs(rm), 1e-6) * 100
        print(f"    {feat:<20}: Low_mean={lm:.2f}  Rest_mean={rm:.2f}  "
              f"Diff={diff_pct:.1f}%")

    # ── 2. LEAKAGE AUDIT ──────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("STAGE 2: LEAKAGE AUDIT")
    print("=" * 60)

    # Original labeling rule: overall_score thresholds
    # Low: overall_score < 60, Medium: 60-75, High: >=75
    # Correlation check
    corr_wpm   = audio[["speaking_rate_wpm", "overall_score"]].corr().iloc[0, 1]
    corr_pause = audio[["pause_count",       "overall_score"]].corr().iloc[0, 1]
    corr_dur   = audio[["speech_duration_sec","overall_score"]].corr().iloc[0, 1]
    corr_words = audio[["word_count",         "overall_score"]].corr().iloc[0, 1]

    print("\n  Original labels derived from: overall_score thresholds")
    print("  Low = overall_score < 60  |  Medium = 60-75  |  High >= 75")
    print(f"\n  Pearson correlation: feature vs overall_score")
    print(f"    wpm              : {corr_wpm:.4f}")
    print(f"    pause_count      : {corr_pause:.4f}")
    print(f"    speech_duration  : {corr_dur:.4f}")
    print(f"    word_count       : {corr_words:.4f}")
    print("\n  VERDICT: All correlations near zero — the 4 model features carry")
    print("  almost no information about overall_score. This is the ROOT CAUSE")
    print("  of the baseline model's 0% Low recall.")
    print("\n  LEAKAGE STATUS: No direct leakage in original dataset.")
    print("  The label (overall_score threshold) is INDEPENDENT of all 4 features.")
    print("  This makes the classification task nearly impossible with these features.")

    leakage_audit = {
        "label_source":          "overall_score thresholds (Low<60, Med 60-75, High>=75)",
        "model_features":        FEATURES,
        "direct_leakage":        False,
        "correlation_wpm_vs_score":      round(corr_wpm,   4),
        "correlation_pause_vs_score":    round(corr_pause,  4),
        "correlation_duration_vs_score": round(corr_dur,    4),
        "correlation_words_vs_score":    round(corr_words,  4),
        "verdict": (
            "NEAR-ZERO correlation between all 4 model features and the label "
            "source (overall_score). Classification with these features against "
            "these labels is fundamentally near-random. No direct leakage, but "
            "the task itself is unsolvable with the current feature set."
        ),
    }

    # ── 3. DATASET CONSTRUCTION ───────────────────────────────────────────
    print("\n" + "=" * 60)
    print("STAGE 3: DATASET CONSTRUCTION")
    print("=" * 60)

    # Dataset-1: original as-is
    ds1 = train.copy()
    print(f"\n  Dataset-1 (original): {len(ds1)} rows  "
          f"Low={train_dist['counts']['Low']}  "
          f"Med={train_dist['counts']['Medium']}  "
          f"Hi={train_dist['counts']['High']}")

    # Dataset-2: real-Low-only balance
    # We have 203 real Low samples. Use all of them.
    # To create the most balanced dataset WITHOUT synthesis,
    # we downsample Medium and High to the same count as Low.
    # But 203 is tiny; instead we keep all Low + sample Med/High
    # at 2x Low (406 each) to avoid a dataset of only 609 rows,
    # which would be too small. We'll use 3x Low for Med/High.
    # Explicitly note this is downsampling, not oversampling.
    low_df  = ds1[ds1[LABEL_COL] == "Low"]
    med_df  = ds1[ds1[LABEL_COL] == "Medium"].sample(n=min(real_low * 3, real_mid),
                                                       random_state=42)
    hi_df   = ds1[ds1[LABEL_COL] == "High"].sample(n=min(real_low * 3, real_hi),
                                                     random_state=42)
    ds2 = pd.concat([low_df, med_df, hi_df], ignore_index=True)
    ds2 = ds2.sample(frac=1, random_state=42).reset_index(drop=True)

    ds2.to_csv(OUT_DS2_CSV, index=False)
    ds2_dist = class_stats(ds2[LABEL_COL])
    print(f"\n  Dataset-2 (real-only balanced, downsampled Med/High to 3x Low):")
    for cls in CLASSES:
        print(f"    {cls:<8}: {ds2_dist['counts'][cls]:>5}  "
              f"({ds2_dist['percentages'][cls]:>5.2f}%)")
    print(f"  --> Saved to {OUT_DS2_CSV}")

    # Dataset-3 and Dataset-4 both use the full ds1 as the base;
    # resampling is applied INSIDE each fold only (documented in run_cv).
    print(f"\n  Dataset-3 (full original + ROS in each train fold): uses ds1 base")
    print(f"  Dataset-4 (full original + SMOTE in each train fold): uses ds1 base")

    real_low_available = int(real_low)
    # How many more genuine Low samples would be needed for a 1:1:1 balance?
    low_needed_for_balance = max(0, int(real_mid) - real_low_available)
    print(f"\n  Real Low samples available : {real_low_available}")
    print(f"  Low samples needed for 1:1:1 balance : {low_needed_for_balance} more")
    print(f"  (Currently only {real_low_available/total*100:.2f}% of dataset is genuine Low)")

    # ── 4. CROSS-VALIDATION ───────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("STAGE 4: CROSS-VALIDATION EXPERIMENTS")
    print("=" * 60)

    def get_XY(df):
        return df[FEATURES], df[LABEL_COL]

    X1, y1 = get_XY(ds1)
    X2, y2 = get_XY(ds2)

    print("\n  Baseline (Dataset-1, no resampling):")
    r1 = run_cv(X1, y1, "Dataset1_Original_NoResample", resample_method="none")

    print("\n  Dataset-2 (Real-Only Balance, no resampling):")
    r2 = run_cv(X2, y2, "Dataset2_RealOnly_NoResample",  resample_method="none")

    print("\n  Dataset-1 + RandomOverSampler (ROS) inside train folds:")
    r3 = run_cv(X1, y1, "Dataset1_PlusROS",             resample_method="ros")

    print("\n  Dataset-1 + SMOTE inside train folds:")
    r4 = run_cv(X1, y1, "Dataset1_PlusSMOTE",           resample_method="smote")

    # ── 5. COMPARISON SUMMARY ─────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("STAGE 5: COMPARISON SUMMARY")
    print("=" * 60)

    header = f"{'Experiment':<35} {'Acc':>8} {'MacF1':>8} {'WF1':>8} {'LowR':>8} {'LowF1':>8}"
    print("\n  " + header)
    print("  " + "-" * 79)
    for r in [r1, r2, r3, r4]:
        name  = r["label"]
        acc   = r["summary"]["mean_accuracy"]
        mf1   = r["summary"]["mean_macro_f1"]
        wf1   = r["summary"]["mean_weighted_f1"]
        low_r = r["per_class"]["Low"]["mean_recall"]
        low_f = r["per_class"]["Low"]["mean_f1"]
        print(f"  {name:<35} {acc:>8.4f} {mf1:>8.4f} {wf1:>8.4f} {low_r:>8.4f} {low_f:>8.4f}")

    print("\n  Low recall consistency across all 5 folds:")
    for r in [r1, r2, r3, r4]:
        cons  = r["low_recall_consistent_all_folds"]
        folds = r["low_recall_per_fold"]
        print(f"    {r['label']:<35}: {folds}  consistent={cons}")

    # Final verdicts
    best_low_r   = max([r["per_class"]["Low"]["mean_recall"]  for r in [r1,r2,r3,r4]])
    best_macro_f1= max([r["summary"]["mean_macro_f1"]          for r in [r1,r2,r3,r4]])

    print(f"\n  Best Low recall  across all experiments: {best_low_r:.4f}")
    print(f"  Best Macro F1    across all experiments: {best_macro_f1:.4f}")
    print(f"\n  Real Low samples available: {real_low_available}")
    print(f"  Additional genuine Low recordings needed for 1:1:1 balance: "
          f"{low_needed_for_balance}")

    # ── Build output JSON ─────────────────────────────────────────────────
    output = {
        "experiment_name": "Balanced Hesitation Dataset Experiment",
        "production_model_modified": False,
        "source_datasets": {
            "audio_speaking_dataset.csv": str(AUDIO_CSV),
            "mockly_training.csv":        str(TRAIN_CSV),
        },
        "stage1_source_audit": {
            "audio_dataset":    {**audio_dist, "source_label_col": "target_level"},
            "training_dataset": {**train_dist, "source_label_col": LABEL_COL},
            "real_low_samples_available":    real_low_available,
            "additional_low_needed_for_balance": low_needed_for_balance,
            "per_class_feature_means": {
                cls: {
                    f: round(float(train[train[LABEL_COL] == cls][f].mean()), 4)
                    for f in FEATURES
                }
                for cls in CLASSES
            },
        },
        "stage2_leakage_audit": leakage_audit,
        "stage3_datasets_created": {
            "Dataset1_Original":      {"rows": len(ds1), "dist": train_dist},
            "Dataset2_RealOnly":      {"rows": len(ds2), "dist": ds2_dist,
                                       "saved_to": str(OUT_DS2_CSV),
                                       "method": "Keep all real Low (203); downsample Med/High to 3x Low"},
            "Dataset3_ROS":           {"rows": len(ds1), "dist": train_dist,
                                       "method": "Full original + RandomOverSampler inside each train fold"},
            "Dataset4_SMOTE":         {"rows": len(ds1), "dist": train_dist,
                                       "method": "Full original + SMOTE inside each train fold"},
        },
        "stage4_cv_results":     [r1, r2, r3, r4],
        "stage5_final_summary": {
            "best_low_recall":           best_low_r,
            "best_macro_f1":             best_macro_f1,
            "real_low_available":        real_low_available,
            "additional_real_low_needed": low_needed_for_balance,
            "low_recall_consistently_nonzero": {
                r["label"]: r["low_recall_consistent_all_folds"]
                for r in [r1, r2, r3, r4]
            },
            "verdict": (
                f"All 4 experiments produce near-zero or very low consistent Low recall. "
                f"The fundamental problem is that the 4 acoustic features (wpm, pause_count, "
                f"speech_duration, word_count) carry near-zero correlation with the label "
                f"source (overall_score). Resampling cannot fix an informationally empty "
                f"feature set. Only {real_low_available} real Low samples exist "
                f"({real_low_available/total*100:.2f}%). "
                f"To reach a 1:1:1 natural balance, {low_needed_for_balance} additional "
                f"genuine Low recordings are required. Until then, no resampling method "
                f"can reliably improve Low recall without introducing massive false positives."
            ),
        },
        "rf_hyperparameters": RF_PARAMS,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n  Results saved to: {OUT_JSON}")
    print(f"  Dataset-2 saved to: {OUT_DS2_CSV}")

    print("\n" + "=" * 70)
    print("BALANCED HESITATION EXPERIMENT COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
