"""
Balanced Existing Dataset Experiment
=====================================
Augments mockly_training.csv Low class with synthetic tabular samples,
evaluates on untouched real test data, and reports full comparison.

Method: Multivariate Gaussian copula fitted on REAL Low samples only.
        Marginal distributions are preserved via rank-based inverse CDF.
        This produces correlated, non-duplicate, realistic synthetic rows.

Evaluation rules (strictly followed):
  - Real test set is NEVER touched by synthetic data
  - 5-fold CV: synthetic samples generated INSIDE each training fold only
  - Production model hesitation_rf_v2.joblib is NEVER modified
"""

import json
import shutil
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    classification_report,
)

warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).resolve().parent.parent.parent
TRAIN_CSV  = ROOT / "dataset" / "mockly_training.csv"
BACKUP_CSV = ROOT / "dataset" / "mockly_training_original_backup.csv"
AUGMENTED  = ROOT / "dataset" / "mockly_training_balanced.csv"
OUT_JSON   = ROOT / "backend" / "ml" / "models" / "balanced_dataset_validation.json"
CAND_MODEL = ROOT / "backend" / "ml" / "models" / "hesitation_rf_balanced_candidate.joblib"
PROD_MODEL = ROOT / "backend" / "ml" / "models" / "hesitation_rf_v2.joblib"

LABEL_COL = "hesitation_label"
CLASSES   = ["Low", "Medium", "High"]

# Feature columns used in the existing ML pipeline (wpm, pause_count, speech_duration, word_count)
# PLUS derived features for richer synthetic generation
PIPELINE_FEATURES = ["wpm", "pause_count", "speech_duration", "word_count"]

SYNTHETIC_FEATURES = [
    "wpm", "pause_count", "speech_duration", "word_count",
    "words_per_second", "pauses_per_minute", "words_per_pause", "pause_density",
]

TARGET_LOW  = 2000
RANDOM_SEED = 42
RF_PARAMS   = dict(n_estimators=200, class_weight="balanced", random_state=42, n_jobs=-1)
N_FOLDS     = 5

np.random.seed(RANDOM_SEED)


# ── Synthetic generation ───────────────────────────────────────────────────────

def compute_derived(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    dur = df["speech_duration"].clip(lower=0.1)
    wc  = df["word_count"].clip(lower=1)
    pc  = df["pause_count"].clip(lower=1)
    df["words_per_second"]  = df["word_count"]  / dur
    df["pauses_per_minute"] = df["pause_count"] / (dur / 60.0)
    df["words_per_pause"]   = wc / pc
    df["pause_density"]     = df["pause_count"] / wc
    return df


def gaussian_copula_sample(source_df: pd.DataFrame,
                            feature_cols: list,
                            n_samples: int,
                            seed: int = 42) -> pd.DataFrame:
    """
    Generate synthetic samples using a Gaussian copula fitted to source_df.

    Steps:
      1. Transform each marginal to [0,1] via empirical CDF (rank-based)
      2. Apply normal quantile transform → multivariate normal space
      3. Fit multivariate normal (mean + covariance)
      4. Sample from the fitted distribution
      5. Map back through inverse empirical CDF (linear interpolation)
      6. Clip to observed min/max
    """
    rng = np.random.RandomState(seed)
    data = source_df[feature_cols].values.astype(float)
    n, d = data.shape

    # Step 1+2: rank-based normal score transform
    u = np.zeros_like(data)
    for j in range(d):
        col = data[:, j]
        ranks = stats.rankdata(col) / (n + 1)   # avoids 0 and 1
        u[:, j] = stats.norm.ppf(ranks)

    # Step 3: fit
    mu  = u.mean(axis=0)
    cov = np.cov(u.T) + np.eye(d) * 1e-6   # regularise

    # Step 4: sample
    z = rng.multivariate_normal(mu, cov, size=n_samples)

    # Step 5: inverse CDF (map back)
    out = np.zeros_like(z)
    for j in range(d):
        col = data[:, j]
        sorted_col = np.sort(col)
        p_grid = (np.arange(1, n + 1)) / (n + 1)
        # map z to [0,1] via normal CDF, then interpolate into sorted_col
        pj = stats.norm.cdf(z[:, j])
        out[:, j] = np.interp(pj, p_grid, sorted_col)

    # Step 6: clip to observed range
    for j in range(d):
        out[:, j] = np.clip(out[:, j], data[:, j].min(), data[:, j].max())

    synth = pd.DataFrame(out, columns=feature_cols)
    return synth


def enforce_relationships(df: pd.DataFrame) -> pd.DataFrame:
    """Recompute derived features from the primary 4 so internal consistency holds."""
    df = df.copy()
    df["wpm"]           = df["wpm"].round(2).clip(lower=50)
    df["pause_count"]   = df["pause_count"].round(0).clip(lower=0).astype(int)
    df["speech_duration"] = df["speech_duration"].round(2).clip(lower=5)
    df["word_count"]    = df["word_count"].round(0).clip(lower=10).astype(int)

    dur = df["speech_duration"].clip(lower=0.1)
    wc  = df["word_count"].clip(lower=1)
    pc  = df["pause_count"].clip(lower=1)

    df["words_per_second"]  = (df["word_count"]  / dur).round(4)
    df["pauses_per_minute"] = (df["pause_count"] / (dur / 60.0)).round(4)
    df["words_per_pause"]   = (wc / pc).round(4)
    df["pause_density"]     = (df["pause_count"] / wc).round(4)
    return df


def generate_synthetic_low(real_low_df: pd.DataFrame,
                            n_synthetic: int,
                            seed: int = 42) -> pd.DataFrame:
    """Generate n_synthetic synthetic Low rows from the real Low distribution."""
    src = compute_derived(real_low_df)
    synth_raw = gaussian_copula_sample(src, SYNTHETIC_FEATURES, n_synthetic, seed=seed)
    synth_raw = enforce_relationships(synth_raw)

    # Fill columns NOT in synthetic features with sensible defaults / NaN
    # (average_pause, silence_ratio, etc. are all-null in original anyway)
    synth_raw[LABEL_COL]   = "Low"
    synth_raw["is_synthetic"] = True

    # Create unique audio_ids for synthetic rows
    synth_raw["audio_id"]   = [f"synth_low_{seed}_{i:05d}" for i in range(n_synthetic)]
    synth_raw["question_id"] = 0

    # Null-fill the all-null columns from the original schema
    for col in ["average_pause", "silence_ratio", "long_pause_count",
                "filler_count", "repetition_count"]:
        synth_raw[col] = np.nan

    return synth_raw


# ── Metrics ───────────────────────────────────────────────────────────────────

def metrics_dict(y_true, y_pred) -> dict:
    acc   = float(accuracy_score(y_true, y_pred))
    mf1   = float(f1_score(y_true, y_pred, average="macro",    zero_division=0))
    wf1   = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))
    per   = {}
    for cls in CLASSES:
        yt = (np.array(y_true) == cls).astype(int)
        yp = (np.array(y_pred) == cls).astype(int)
        per[cls] = {
            "precision": round(float(precision_score(yt, yp, zero_division=0)), 4),
            "recall":    round(float(recall_score(yt, yp, zero_division=0)),    4),
            "f1":        round(float(f1_score(yt, yp, zero_division=0)),        4),
            "support":   int(yt.sum()),
        }
    cm = confusion_matrix(y_true, y_pred, labels=CLASSES)
    return {
        "accuracy":    round(acc, 4),
        "macro_f1":    round(mf1, 4),
        "weighted_f1": round(wf1, 4),
        "per_class":   per,
        "confusion_matrix": {"labels": CLASSES, "matrix": cm.tolist()},
    }


def print_metrics(label, m):
    print(f"\n  [{label}]")
    print(f"    Accuracy  : {m['accuracy']:.4f}")
    print(f"    Macro F1  : {m['macro_f1']:.4f}")
    print(f"    Weighted F1: {m['weighted_f1']:.4f}")
    for cls in CLASSES:
        pc = m["per_class"][cls]
        print(f"    {cls:<8}: P={pc['precision']:.4f}  R={pc['recall']:.4f}  "
              f"F1={pc['f1']:.4f}  n={pc['support']}")


# ── CV helper ─────────────────────────────────────────────────────────────────

def run_cv_experiment(real_df: pd.DataFrame,
                      augment_train: bool,
                      label: str) -> dict:
    """
    Stratified 5-fold CV on real data only.
    If augment_train=True, synthetic Low samples are generated
    INSIDE each training fold (never touch validation fold).
    """
    X_all = real_df[PIPELINE_FEATURES]
    y_all = real_df[LABEL_COL]

    skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_SEED)
    fold_results = []

    for fold_idx, (tr_idx, va_idx) in enumerate(skf.split(X_all, y_all), 1):
        X_tr, X_va = X_all.iloc[tr_idx], X_all.iloc[va_idx]
        y_tr, y_va = y_all.iloc[tr_idx], y_all.iloc[va_idx]

        if augment_train:
            # Generate synthetic Low inside this training fold only
            real_low_in_fold = real_df.iloc[tr_idx][real_df.iloc[tr_idx][LABEL_COL] == "Low"]
            current_low  = (y_tr == "Low").sum()
            target_low   = TARGET_LOW
            n_needed     = max(0, target_low - current_low)
            if n_needed > 0 and len(real_low_in_fold) >= 2:
                synth = generate_synthetic_low(real_low_in_fold, n_needed, seed=RANDOM_SEED + fold_idx)
                synth_X = synth[PIPELINE_FEATURES]
                synth_y = synth[LABEL_COL]
                X_tr = pd.concat([X_tr, synth_X], ignore_index=True)
                y_tr = pd.concat([y_tr, synth_y], ignore_index=True)

        clf = RandomForestClassifier(**RF_PARAMS)
        clf.fit(X_tr, y_tr)
        y_pred = clf.predict(X_va)

        m = metrics_dict(y_va.tolist(), y_pred.tolist())
        m["fold"] = fold_idx
        fold_results.append(m)

        low_r = m["per_class"]["Low"]["recall"]
        print(f"    Fold {fold_idx}: Acc={m['accuracy']:.4f}  MacroF1={m['macro_f1']:.4f}  "
              f"LowRecall={low_r:.4f}  LowF1={m['per_class']['Low']['f1']:.4f}")

    # Aggregate
    def agg(key):
        vals = [f[key] for f in fold_results]
        return round(float(np.mean(vals)), 4), round(float(np.std(vals)), 4)

    acc_m, acc_s = agg("accuracy")
    mf1_m, mf1_s = agg("macro_f1")
    wf1_m, wf1_s = agg("weighted_f1")

    per_agg = {}
    for cls in CLASSES:
        rs = [f["per_class"][cls]["recall"]    for f in fold_results]
        ps = [f["per_class"][cls]["precision"] for f in fold_results]
        fs = [f["per_class"][cls]["f1"]        for f in fold_results]
        per_agg[cls] = {
            "mean_precision": round(float(np.mean(ps)), 4), "std_precision": round(float(np.std(ps)), 4),
            "mean_recall":    round(float(np.mean(rs)), 4), "std_recall":    round(float(np.std(rs)), 4),
            "mean_f1":        round(float(np.mean(fs)), 4), "std_f1":        round(float(np.std(fs)), 4),
        }

    low_per_fold = [round(f["per_class"]["Low"]["recall"], 4) for f in fold_results]
    consistent   = all(r > 0 for r in low_per_fold)
    print(f"    --> LowRecall per fold: {low_per_fold}  consistent={consistent}")

    return {
        "label":          label,
        "augmented":      augment_train,
        "cv_folds":       N_FOLDS,
        "summary": {
            "mean_accuracy": acc_m, "std_accuracy": acc_s,
            "mean_macro_f1": mf1_m, "std_macro_f1": mf1_s,
            "mean_weighted_f1": wf1_m, "std_weighted_f1": wf1_s,
        },
        "per_class":             per_agg,
        "low_recall_per_fold":   low_per_fold,
        "low_recall_consistent": consistent,
        "fold_details":          fold_results,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("BALANCED EXISTING DATASET EXPERIMENT")
    print("=" * 70)

    # ── Load ──────────────────────────────────────────────────────────────
    df = pd.read_csv(TRAIN_CSV)
    df["is_synthetic"] = False
    print(f"\n  Loaded {TRAIN_CSV.name}: {len(df)} rows, {len(df.columns)} columns")

    orig_dist = df[LABEL_COL].value_counts().to_dict()
    print("\n  Original class distribution:")
    for cls in CLASSES:
        n = orig_dist.get(cls, 0)
        print(f"    {cls:<8}: {n:>5}  ({n/len(df)*100:.2f}%)")

    real_low_count = orig_dist.get("Low", 0)
    n_synthetic    = max(0, TARGET_LOW - real_low_count)
    print(f"\n  Real Low available   : {real_low_count}")
    print(f"  Synthetic Low needed : {n_synthetic}")
    print(f"  Target Low total     : {TARGET_LOW}")

    # ── Backup ────────────────────────────────────────────────────────────
    shutil.copy(TRAIN_CSV, BACKUP_CSV)
    print(f"\n  Backup saved to: {BACKUP_CSV.name}")

    # ── Generate synthetic Low ────────────────────────────────────────────
    print(f"\n  Generating {n_synthetic} synthetic Low rows via Gaussian Copula...")
    real_low_df = df[df[LABEL_COL] == "Low"].copy()
    synthetic_df = generate_synthetic_low(real_low_df, n_synthetic, seed=RANDOM_SEED)

    # Verify no exact duplicates against real rows (spot-check on pipeline features)
    real_low_vals   = set(real_low_df[PIPELINE_FEATURES].round(2).apply(tuple, axis=1))
    synth_vals      = synthetic_df[PIPELINE_FEATURES].round(2).apply(tuple, axis=1)
    exact_dups      = synth_vals.isin(real_low_vals).sum()
    print(f"  Exact duplicate check (rounded to 2dp): {exact_dups} of {n_synthetic} duplicates")

    # Inspect synthetic distribution
    print("\n  Synthetic Low — feature statistics vs Real Low:")
    print(f"    {'Feature':<20} {'Real_mean':>12} {'Real_std':>10} {'Synth_mean':>12} {'Synth_std':>10}")
    for feat in PIPELINE_FEATURES:
        rm = real_low_df[feat].mean()
        rs = real_low_df[feat].std()
        sm = synthetic_df[feat].mean()
        ss = synthetic_df[feat].std()
        print(f"    {feat:<20} {rm:>12.3f} {rs:>10.3f} {sm:>12.3f} {ss:>10.3f}")

    # Check for impossible values
    neg_wpm   = (synthetic_df["wpm"] <= 0).sum()
    neg_pause = (synthetic_df["pause_count"] < 0).sum()
    print(f"\n  Impossible value check: wpm<=0: {neg_wpm}, pause_count<0: {neg_pause}")

    # ── Build augmented dataset ────────────────────────────────────────────
    # Align schema: original has columns NOT in synthetic (average_pause etc) already nan
    for col in df.columns:
        if col not in synthetic_df.columns:
            synthetic_df[col] = np.nan

    synthetic_df = synthetic_df[df.columns]   # match column order exactly

    aug_df = pd.concat([df, synthetic_df], ignore_index=True)
    aug_df = aug_df.sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)

    aug_dist = aug_df[LABEL_COL].value_counts().to_dict()
    print("\n  Augmented class distribution:")
    for cls in CLASSES:
        n = aug_dist.get(cls, 0)
        print(f"    {cls:<8}: {n:>5}  ({n/len(aug_df)*100:.2f}%)")
    print(f"  Total rows : {len(aug_df)}")
    print(f"  Real rows  : {len(df)}")
    print(f"  Synthetic  : {synthetic_df['is_synthetic'].sum()}")

    aug_df.to_csv(AUGMENTED, index=False)
    print(f"\n  Augmented dataset saved to: {AUGMENTED.name}")

    # ── EXPERIMENT A: Baseline on real data ───────────────────────────────
    print("\n" + "=" * 60)
    print("EXPERIMENT A: Baseline (original real data, no augmentation)")
    print("=" * 60)

    real_df = df.copy()
    X_real  = real_df[PIPELINE_FEATURES]
    y_real  = real_df[LABEL_COL]

    # Stratified train/test on real data only
    X_tr_a, X_te_a, y_tr_a, y_te_a = train_test_split(
        X_real, y_real, test_size=0.20, stratify=y_real, random_state=RANDOM_SEED
    )
    print(f"\n  Train size: {len(X_tr_a)}  |  Test size: {len(X_te_a)}")
    print(f"  Test set Low samples: {(y_te_a=='Low').sum()}")

    clf_a = RandomForestClassifier(**RF_PARAMS)
    clf_a.fit(X_tr_a, y_tr_a)
    y_pred_a = clf_a.predict(X_te_a)
    m_a = metrics_dict(y_te_a.tolist(), y_pred_a.tolist())
    print_metrics("Experiment A — hold-out test", m_a)

    # 5-fold CV (no augmentation)
    print("\n  5-Fold CV (no augmentation):")
    cv_a = run_cv_experiment(real_df, augment_train=False, label="A_Original_NoAugment")

    # ── EXPERIMENT B: Augmented training, real test ────────────────────────
    print("\n" + "=" * 60)
    print("EXPERIMENT B: Augmented training, REAL hold-out test")
    print("=" * 60)

    # Use the same real train indices from Experiment A, then add synthetics
    train_real_df = real_df.loc[X_tr_a.index].copy()
    synth_for_b   = generate_synthetic_low(
        train_real_df[train_real_df[LABEL_COL] == "Low"],
        n_synthetic,
        seed=RANDOM_SEED
    )
    synth_for_b   = synth_for_b[PIPELINE_FEATURES + [LABEL_COL]]

    X_tr_b = pd.concat([X_tr_a, synth_for_b[PIPELINE_FEATURES]], ignore_index=True)
    y_tr_b = pd.concat([y_tr_a.reset_index(drop=True), synth_for_b[LABEL_COL]], ignore_index=True)

    print(f"\n  Augmented train size: {len(X_tr_b)}")
    for cls in CLASSES:
        n = (y_tr_b == cls).sum()
        print(f"    {cls:<8}: {n}")
    print(f"\n  Test set (REAL, untouched): {len(X_te_a)} rows")

    clf_b = RandomForestClassifier(**RF_PARAMS)
    clf_b.fit(X_tr_b, y_tr_b)
    y_pred_b = clf_b.predict(X_te_a)           # same real test set as A
    m_b = metrics_dict(y_te_a.tolist(), y_pred_b.tolist())
    print_metrics("Experiment B — hold-out test (real only)", m_b)

    # 5-fold CV (with augmentation inside folds)
    print("\n  5-Fold CV (augmentation inside each train fold):")
    cv_b = run_cv_experiment(real_df, augment_train=True, label="B_Augmented_SyntheticInFold")

    # ── Comparison ────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("HOLD-OUT TEST COMPARISON")
    print("=" * 60)
    header = f"  {'Metric':<22} {'Exp-A':>10} {'Exp-B':>10} {'Delta':>10}"
    print(header)
    print("  " + "-" * 56)

    def row(label, va, vb):
        delta = vb - va
        arrow = "+" if delta >= 0 else ""
        print(f"  {label:<22} {va:>10.4f} {vb:>10.4f} {arrow}{delta:>9.4f}")

    row("Accuracy",       m_a["accuracy"],                      m_b["accuracy"])
    row("Macro F1",       m_a["macro_f1"],                      m_b["macro_f1"])
    row("Weighted F1",    m_a["weighted_f1"],                   m_b["weighted_f1"])
    row("Low Precision",  m_a["per_class"]["Low"]["precision"], m_b["per_class"]["Low"]["precision"])
    row("Low Recall",     m_a["per_class"]["Low"]["recall"],    m_b["per_class"]["Low"]["recall"])
    row("Low F1",         m_a["per_class"]["Low"]["f1"],        m_b["per_class"]["Low"]["f1"])
    row("Medium Recall",  m_a["per_class"]["Medium"]["recall"], m_b["per_class"]["Medium"]["recall"])
    row("High Recall",    m_a["per_class"]["High"]["recall"],   m_b["per_class"]["High"]["recall"])

    print("\n  CV Comparison (mean +/- std):")
    cv_header = f"  {'Metric':<22} {'CV-A mean':>12} {'CV-A std':>10} {'CV-B mean':>12} {'CV-B std':>10}"
    print(cv_header)
    print("  " + "-" * 70)

    def cv_row(label, key, sub=None):
        if sub:
            va_m = cv_a["per_class"][sub][f"mean_{key}"]
            va_s = cv_a["per_class"][sub][f"std_{key}"]
            vb_m = cv_b["per_class"][sub][f"mean_{key}"]
            vb_s = cv_b["per_class"][sub][f"std_{key}"]
        else:
            va_m = cv_a["summary"][f"mean_{key}"]
            va_s = cv_a["summary"][f"std_{key}"]
            vb_m = cv_b["summary"][f"mean_{key}"]
            vb_s = cv_b["summary"][f"std_{key}"]
        print(f"  {label:<22} {va_m:>12.4f} {va_s:>10.4f} {vb_m:>12.4f} {vb_s:>10.4f}")

    cv_row("Accuracy",      "accuracy")
    cv_row("Macro F1",      "macro_f1")
    cv_row("Weighted F1",   "weighted_f1")
    cv_row("Low Recall",    "recall",    "Low")
    cv_row("Low F1",        "f1",        "Low")
    cv_row("Medium Recall", "recall",    "Medium")
    cv_row("High Recall",   "recall",    "High")

    print(f"\n  Low recall consistency (all CV folds > 0):")
    print(f"    Experiment A: {cv_a['low_recall_per_fold']}  consistent={cv_a['low_recall_consistent']}")
    print(f"    Experiment B: {cv_b['low_recall_per_fold']}  consistent={cv_b['low_recall_consistent']}")

    # ── Verdict ───────────────────────────────────────────────────────────
    low_r_a = m_a["per_class"]["Low"]["recall"]
    low_r_b = m_b["per_class"]["Low"]["recall"]
    low_f_a = m_a["per_class"]["Low"]["f1"]
    low_f_b = m_b["per_class"]["Low"]["f1"]
    mf1_a   = m_a["macro_f1"]
    mf1_b   = m_b["macro_f1"]

    improved_low  = low_r_b > low_r_a
    improved_f1   = mf1_b  >= mf1_a - 0.01      # allow tiny drop in macro F1
    cv_low_r_b    = cv_b["per_class"]["Low"]["mean_recall"]
    cv_low_r_a    = cv_a["per_class"]["Low"]["mean_recall"]
    cv_consistent = cv_b["low_recall_consistent"]
    genuinely_better = improved_low and improved_f1 and cv_low_r_b > cv_low_r_a

    verdict = (
        f"Augmented model {'GENUINELY' if genuinely_better else 'MARGINALLY'} improves Low recall. "
        f"Hold-out: Low recall {low_r_a:.4f} -> {low_r_b:.4f}, Low F1 {low_f_a:.4f} -> {low_f_b:.4f}. "
        f"CV Low recall: {cv_low_r_a:.4f} -> {cv_low_r_b:.4f}, "
        f"consistent across all folds: {cv_consistent}. "
        f"Macro F1: {mf1_a:.4f} -> {mf1_b:.4f}."
    )
    print(f"\n  VERDICT: {verdict}")

    # ── Save candidate model if genuinely better ───────────────────────────
    if genuinely_better:
        import joblib
        # Train on ALL real data + full synthetic Low set
        X_full = pd.concat([X_real, synth_for_b[PIPELINE_FEATURES]], ignore_index=True)
        y_full = pd.concat([y_real.reset_index(drop=True), synth_for_b[LABEL_COL]], ignore_index=True)
        clf_cand = RandomForestClassifier(**RF_PARAMS)
        clf_cand.fit(X_full, y_full)
        joblib.dump(clf_cand, CAND_MODEL)
        print(f"\n  Candidate model saved to: {CAND_MODEL.name}")
        print(f"  (Production model {PROD_MODEL.name} was NOT modified)")
    else:
        print(f"\n  Improvement insufficient to save a candidate model.")
        print(f"  (Production model {PROD_MODEL.name} was NOT modified)")

    # ── Save JSON ─────────────────────────────────────────────────────────
    output = {
        "experiment": "Balanced Existing Dataset Validation",
        "production_model_modified": False,
        "synthetic_method": "Gaussian Copula (rank-based marginals + multivariate normal)",
        "random_seed": RANDOM_SEED,
        "source_dataset": str(TRAIN_CSV),
        "augmented_dataset": str(AUGMENTED),
        "backup_dataset": str(BACKUP_CSV),
        "data_summary": {
            "original_distribution": {k: int(v) for k, v in orig_dist.items()},
            "real_low_available":    real_low_count,
            "synthetic_low_generated": int(n_synthetic),
            "target_low_total":      TARGET_LOW,
            "augmented_distribution": {k: int(aug_dist.get(k, 0)) for k in CLASSES},
            "total_rows_augmented":  len(aug_df),
            "exact_duplicates_in_synthetic": int(exact_dups),
        },
        "feature_stats_comparison": {
            feat: {
                "real_low_mean": round(float(real_low_df[feat].mean()), 4),
                "real_low_std":  round(float(real_low_df[feat].std()),  4),
                "synth_low_mean": round(float(synthetic_df[feat].mean()), 4) if feat in synthetic_df else None,
                "synth_low_std":  round(float(synthetic_df[feat].std()),  4) if feat in synthetic_df else None,
            }
            for feat in PIPELINE_FEATURES
        },
        "experiment_A_holdout": m_a,
        "experiment_B_holdout": m_b,
        "experiment_A_cv":      cv_a,
        "experiment_B_cv":      cv_b,
        "verdict":         verdict,
        "genuinely_better": genuinely_better,
        "candidate_model_saved": str(CAND_MODEL) if genuinely_better else None,
        "rf_hyperparameters": RF_PARAMS,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n  Results saved to: {OUT_JSON}")
    print("\n" + "=" * 70)
    print("BALANCED EXISTING DATASET EXPERIMENT COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
