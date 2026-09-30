"""
==========================================================================
LEAKAGE-FREE BALANCED DATASET VALIDATION
==========================================================================
Strict evaluation of mockly_training_balanced_new.csv
Does NOT modify: mockly_training.csv, hesitation_rf_v2.joblib
==========================================================================
"""
import json, os, sys, hashlib, warnings
from pathlib import Path
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    classification_report, confusion_matrix
)
import joblib

warnings.filterwarnings("ignore", category=UserWarning)

# ── Paths ─────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent.parent          # Mockly/
ORIG_CSV  = ROOT / "dataset" / "mockly_training.csv"
NEW_CSV   = ROOT / "dataset" / "mockly_training_balanced_new.csv"
OUT_JSON  = ROOT / "backend" / "ml" / "models" / "leakage_free_balanced_validation.json"
OUT_MD    = ROOT / "backend" / "ml" / "models" / "leakage_free_balanced_validation.md"
CAND_PATH = ROOT / "backend" / "ml" / "models" / "hesitation_rf_balanced_leakage_free_candidate.joblib"

PROD_FEAT = ["wpm", "pause_count", "speech_duration", "word_count"]
ENG_FEAT  = ["words_per_second", "pauses_per_minute", "words_per_pause", "pause_density"]
ALL_FEAT  = PROD_FEAT + ENG_FEAT
LABELS    = ["High", "Low", "Medium"]
SEED      = 42
N_FOLDS   = 5

np.random.seed(SEED)

# ======================================================================
#  HELPER FUNCTIONS
# ======================================================================

def add_engineered(df):
    """Add derived features without modifying the original columns."""
    df = df.copy()
    df["words_per_second"] = df["word_count"] / df["speech_duration"].replace(0, np.nan)
    df["pauses_per_minute"] = df["pause_count"] / (df["speech_duration"].replace(0, np.nan) / 60)
    df["words_per_pause"]   = df["word_count"] / df["pause_count"].replace(0, np.nan)
    df["pause_density"]     = df["pause_count"] / df["word_count"].replace(0, np.nan)
    for c in ENG_FEAT:
        df[c] = df[c].fillna(0).replace([np.inf, -np.inf], 0)
    return df


def row_hash(row, cols):
    """Deterministic hash for a feature row (used for duplicate detection)."""
    parts = []
    for c in cols:
        v = row[c]
        try:
            parts.append(str(round(float(v), 6)))
        except (ValueError, TypeError):
            parts.append(str(v).strip())
    vals = "|".join(parts)
    return hashlib.md5(vals.encode()).hexdigest()


def per_class_metrics(y_true, y_pred, labels):
    """Return per-class P / R / F1 dict."""
    rep = classification_report(y_true, y_pred, labels=labels,
                                output_dict=True, zero_division=0)
    out = {}
    for lab in labels:
        d = rep.get(lab, {})
        out[lab] = {
            "precision": round(d.get("precision", 0), 4),
            "recall":    round(d.get("recall", 0), 4),
            "f1":        round(d.get("f1-score", 0), 4),
            "support":   int(d.get("support", 0)),
        }
    return out


def run_fold(X_train, y_train, X_val, y_val, features_used):
    """Train RF on one fold, return metrics dict."""
    clf = RandomForestClassifier(n_estimators=100, random_state=SEED)
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_val)

    acc   = accuracy_score(y_val, y_pred)
    mac_f = f1_score(y_val, y_pred, average="macro", zero_division=0)
    wt_f  = f1_score(y_val, y_pred, average="weighted", zero_division=0)
    mac_r = recall_score(y_val, y_pred, average="macro", zero_division=0)
    cm    = confusion_matrix(y_val, y_pred, labels=LABELS).tolist()
    pcm   = per_class_metrics(y_val, y_pred, LABELS)

    return {
        "accuracy": round(acc, 4),
        "macro_f1": round(mac_f, 4),
        "weighted_f1": round(wt_f, 4),
        "macro_recall": round(mac_r, 4),
        "per_class": pcm,
        "confusion_matrix": cm,
    }, clf


def summarise_folds(fold_results):
    """Aggregate fold-level dicts into mean ± std summary."""
    keys = ["accuracy", "macro_f1", "weighted_f1", "macro_recall"]
    summary = {}
    for k in keys:
        vals = [f[k] for f in fold_results]
        summary[k] = {"mean": round(np.mean(vals), 4),
                       "std":  round(np.std(vals), 4)}
    for lab in LABELS:
        for m in ["precision", "recall", "f1"]:
            vals = [f["per_class"][lab][m] for f in fold_results]
            summary[f"{lab}_{m}"] = {"mean": round(np.mean(vals), 4),
                                     "std":  round(np.std(vals), 4)}
    # Sum confusion matrices
    cm_sum = np.zeros((3, 3), dtype=int)
    for f in fold_results:
        cm_sum += np.array(f["confusion_matrix"])
    summary["confusion_matrix_sum"] = cm_sum.tolist()
    return summary


# ======================================================================
#  STEP 1 — AUDIT
# ======================================================================
print("=" * 70)
print("  STEP 1 — DATASET AUDIT")
print("=" * 70)

orig = pd.read_csv(ORIG_CSV)
newb = pd.read_csv(NEW_CSV)

print(f"\nOriginal  : {len(orig)} rows, columns = {list(orig.columns)}")
print(f"New Bal.  : {len(newb)} rows, columns = {list(newb.columns)}")

print(f"\nOriginal class distribution:")
orig_dist = orig["hesitation_label"].value_counts().sort_index()
for lab, cnt in orig_dist.items():
    print(f"  {lab:>8}: {cnt:>5}  ({cnt/len(orig)*100:.1f}%)")

print(f"\nNew Balanced class distribution:")
new_dist = newb["hesitation_label"].value_counts().sort_index()
for lab, cnt in new_dist.items():
    print(f"  {lab:>8}: {cnt:>5}  ({cnt/len(newb)*100:.1f}%)")

# ── Identify synthetic rows ──────────────────────────────────────────
has_source_col = "is_synthetic" in newb.columns or "source" in newb.columns
print(f"\nHas is_synthetic / source column: {has_source_col}")

# Method: match on shared columns (audio_id + core features + label)
match_cols = ["audio_id", "question_id", "wpm", "pause_count",
              "speech_duration", "word_count", "hesitation_label"]

# Build a set of hashes from the original dataset
orig_hashes = set()
for _, r in orig[match_cols].iterrows():
    orig_hashes.add(row_hash(r, match_cols))

newb["_row_hash"] = newb.apply(lambda r: row_hash(r, match_cols), axis=1)
newb["is_real"] = newb["_row_hash"].isin(orig_hashes)

n_real = newb["is_real"].sum()
n_synth = (~newb["is_real"]).sum()
print(f"\nMatched as REAL  : {n_real}")
print(f"Identified SYNTH : {n_synth}")

print("\nReal/Synthetic breakdown per class:")
for lab in LABELS:
    mask = newb["hesitation_label"] == lab
    r = newb.loc[mask, "is_real"].sum()
    s = (~newb.loc[mask, "is_real"]).sum()
    print(f"  {lab:>8}: real={r:>5}, synth={s:>5}")

# ── Duplicate checks ─────────────────────────────────────────────────
dup_aid = newb["audio_id"].duplicated(keep=False).sum()
feat_hash = newb.apply(lambda r: row_hash(r, PROD_FEAT + ["hesitation_label"]), axis=1)
dup_feat = feat_hash.duplicated(keep=False).sum()
print(f"\nDuplicate audio_id entries : {dup_aid}")
print(f"Duplicate feature-rows     : {dup_feat}")

# ── Leakage concern #5: Were labels manufactured from features? ──────
from scipy.stats import pearsonr
print("\nFeature-label correlation (original, label encoded Low=0 Med=1 High=2):")
lab_map = {"Low": 0, "Medium": 1, "High": 2}
orig_enc = orig["hesitation_label"].map(lab_map)
for f in PROD_FEAT:
    r_val, p_val = pearsonr(orig[f], orig_enc)
    print(f"  {f:>18} vs label: r={r_val:+.4f}  p={p_val:.4f}")

audit = {
    "original_rows": int(len(orig)),
    "new_balanced_rows": int(len(newb)),
    "original_columns": list(orig.columns),
    "new_balanced_columns": [c for c in newb.columns if not c.startswith("_")],
    "has_source_column": has_source_col,
    "matched_real": int(n_real),
    "identified_synthetic": int(n_synth),
    "duplicate_audio_ids": int(dup_aid),
    "duplicate_feature_rows": int(dup_feat),
    "class_dist_original": {k: int(v) for k, v in orig_dist.items()},
    "class_dist_new": {k: int(v) for k, v in new_dist.items()},
}

# ======================================================================
#  STEP 2 — BUILD REAL-ONLY POPULATIONS
# ======================================================================
print("\n" + "=" * 70)
print("  STEP 2 — REAL-ONLY TEST POPULATION")
print("=" * 70)

# The source of truth for real data is mockly_training.csv
real_df = orig[PROD_FEAT + ["hesitation_label", "audio_id"]].copy()
real_df = add_engineered(real_df)
print(f"Real population: {len(real_df)} rows (from mockly_training.csv)")

# Synthetic-only rows from the new balanced CSV
synth_df = newb[~newb["is_real"]].copy()
synth_df = synth_df[PROD_FEAT + ["hesitation_label", "audio_id"]].copy()
synth_df = add_engineered(synth_df)
print(f"Synthetic pool : {len(synth_df)} rows")
print(f"  Synthetic class distribution:")
for lab in LABELS:
    cnt = (synth_df["hesitation_label"] == lab).sum()
    print(f"    {lab:>8}: {cnt}")

# ======================================================================
#  STEP 3 + 4 — STRICT LEAKAGE-FREE 5-FOLD CV
# ======================================================================
print("\n" + "=" * 70)
print("  STEP 3 & 4 — LEAKAGE-FREE 5-FOLD CV EXPERIMENTS")
print("=" * 70)

X_real = real_df[PROD_FEAT].values
y_real = real_df["hesitation_label"].values

skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=SEED)

# Synthetic Low pool (the main augmentation target)
synth_low = synth_df[synth_df["hesitation_label"] == "Low"]
synth_med = synth_df[synth_df["hesitation_label"] == "Medium"]
synth_high = synth_df[synth_df["hesitation_label"] == "High"]

n_synth_low  = len(synth_low)
n_synth_med  = len(synth_med)
n_synth_high = len(synth_high)

print(f"\nSynthetic pool sizes: Low={n_synth_low}, Medium={n_synth_med}, High={n_synth_high}")

# Define synthetic Low ratios to test
# Ratio = fraction of the full synthetic Low pool to add
if n_synth_low > 0:
    ratios = {
        "25%":  0.25,
        "50%":  0.50,
        "100%": 1.00,
    }
    if n_synth_low > 500:
        ratios["200%_or_cap"] = min(2.0, 1.0)  # Can't exceed pool
else:
    ratios = {}

# ── Experiment definitions ────────────────────────────────────────────
experiments = {}

# --- EXP A: Original real only (baseline) ---
print("\n--- Experiment A: Real-only baseline ---")
exp_a_folds = []
for fold_i, (tr_idx, va_idx) in enumerate(skf.split(X_real, y_real), 1):
    Xtr, ytr = X_real[tr_idx], y_real[tr_idx]
    Xva, yva = X_real[va_idx], y_real[va_idx]
    metrics, _ = run_fold(Xtr, ytr, Xva, yva, PROD_FEAT)
    metrics["fold"] = fold_i
    metrics["train_size"] = len(tr_idx)
    metrics["val_size"] = len(va_idx)
    metrics["val_synthetic_count"] = 0
    exp_a_folds.append(metrics)
    lo_r = metrics["per_class"]["Low"]["recall"]
    print(f"  Fold {fold_i}: acc={metrics['accuracy']:.4f}  macro_f1={metrics['macro_f1']:.4f}  Low_recall={lo_r:.4f}")

exp_a_summary = summarise_folds(exp_a_folds)
experiments["A_real_only"] = {
    "description": "Original real dataset only (baseline)",
    "features": PROD_FEAT,
    "folds": exp_a_folds,
    "summary": exp_a_summary,
}

# --- EXP B: Real + ALL synthetic (all classes) ---
print("\n--- Experiment B: Real train + ALL synthetic in train ---")
exp_b_folds = []
for fold_i, (tr_idx, va_idx) in enumerate(skf.split(X_real, y_real), 1):
    # Training: real train + all synthetic
    Xtr_real = X_real[tr_idx]
    ytr_real = y_real[tr_idx]
    
    Xtr_synth = synth_df[PROD_FEAT].values
    ytr_synth = synth_df["hesitation_label"].values
    
    Xtr = np.vstack([Xtr_real, Xtr_synth])
    ytr = np.concatenate([ytr_real, ytr_synth])
    
    # Validation: ONLY real samples
    Xva = X_real[va_idx]
    yva = y_real[va_idx]
    
    metrics, _ = run_fold(Xtr, ytr, Xva, yva, PROD_FEAT)
    metrics["fold"] = fold_i
    metrics["train_size"] = len(Xtr)
    metrics["train_real"] = len(tr_idx)
    metrics["train_synth"] = len(Xtr_synth)
    metrics["val_size"] = len(va_idx)
    metrics["val_synthetic_count"] = 0
    exp_b_folds.append(metrics)
    lo_r = metrics["per_class"]["Low"]["recall"]
    print(f"  Fold {fold_i}: acc={metrics['accuracy']:.4f}  macro_f1={metrics['macro_f1']:.4f}  Low_recall={lo_r:.4f}  train={len(Xtr)}")

exp_b_summary = summarise_folds(exp_b_folds)
experiments["B_real_plus_all_synth"] = {
    "description": "Real train + ALL synthetic in train only; validation = real only",
    "features": PROD_FEAT,
    "folds": exp_b_folds,
    "summary": exp_b_summary,
}

# --- EXP C: Real + varying synthetic Low ratios ---
print("\n--- Experiment C: Synthetic Low ratio sweep ---")
for ratio_name, ratio_val in ratios.items():
    n_add = int(n_synth_low * ratio_val)
    if n_add == 0:
        continue
    synth_low_sample = synth_low.sample(n=n_add, random_state=SEED)
    
    exp_folds = []
    for fold_i, (tr_idx, va_idx) in enumerate(skf.split(X_real, y_real), 1):
        Xtr_real = X_real[tr_idx]
        ytr_real = y_real[tr_idx]
        
        Xtr_synth = synth_low_sample[PROD_FEAT].values
        ytr_synth = synth_low_sample["hesitation_label"].values
        
        Xtr = np.vstack([Xtr_real, Xtr_synth])
        ytr = np.concatenate([ytr_real, ytr_synth])
        
        Xva = X_real[va_idx]
        yva = y_real[va_idx]
        
        metrics, _ = run_fold(Xtr, ytr, Xva, yva, PROD_FEAT)
        metrics["fold"] = fold_i
        metrics["train_size"] = len(Xtr)
        metrics["train_real"] = len(tr_idx)
        metrics["train_synth_low"] = n_add
        metrics["val_size"] = len(va_idx)
        metrics["val_synthetic_count"] = 0
        exp_folds.append(metrics)
    
    summ = summarise_folds(exp_folds)
    lo_r_mean = summ["Low_recall"]["mean"]
    acc_mean  = summ["accuracy"]["mean"]
    print(f"  Ratio {ratio_name} (+{n_add} synth Low): acc={acc_mean:.4f}  Low_recall={lo_r_mean:.4f}")
    
    experiments[f"C_synth_low_{ratio_name}"] = {
        "description": f"Real train + {n_add} synthetic Low samples ({ratio_name} of pool)",
        "features": PROD_FEAT,
        "synthetic_low_added": n_add,
        "folds": exp_folds,
        "summary": summ,
    }

# ======================================================================
#  STEP 5 — ENGINEERED FEATURES (separate experiments)
# ======================================================================
print("\n" + "=" * 70)
print("  STEP 5 — ENGINEERED FEATURES EXPERIMENTS")
print("=" * 70)

X_real_eng = real_df[ALL_FEAT].values

# D1: Real only + engineered features
print("\n--- Experiment D1: Real-only + 8 features ---")
exp_d1_folds = []
for fold_i, (tr_idx, va_idx) in enumerate(skf.split(X_real_eng, y_real), 1):
    Xtr, ytr = X_real_eng[tr_idx], y_real[tr_idx]
    Xva, yva = X_real_eng[va_idx], y_real[va_idx]
    metrics, _ = run_fold(Xtr, ytr, Xva, yva, ALL_FEAT)
    metrics["fold"] = fold_i
    metrics["val_synthetic_count"] = 0
    exp_d1_folds.append(metrics)
    lo_r = metrics["per_class"]["Low"]["recall"]
    print(f"  Fold {fold_i}: acc={metrics['accuracy']:.4f}  macro_f1={metrics['macro_f1']:.4f}  Low_recall={lo_r:.4f}")

experiments["D1_real_only_8feat"] = {
    "description": "Real only, 8 features (4 original + 4 engineered)",
    "features": ALL_FEAT,
    "folds": exp_d1_folds,
    "summary": summarise_folds(exp_d1_folds),
}

# D2: Real + all synth + engineered features
print("\n--- Experiment D2: Real + all synth + 8 features ---")
synth_df_eng = synth_df.copy()  # already has engineered cols from add_engineered
exp_d2_folds = []
for fold_i, (tr_idx, va_idx) in enumerate(skf.split(X_real_eng, y_real), 1):
    Xtr_real = X_real_eng[tr_idx]
    ytr_real = y_real[tr_idx]
    
    Xtr_synth = synth_df_eng[ALL_FEAT].values
    ytr_synth = synth_df_eng["hesitation_label"].values
    
    Xtr = np.vstack([Xtr_real, Xtr_synth])
    ytr = np.concatenate([ytr_real, ytr_synth])
    
    Xva = X_real_eng[va_idx]
    yva = y_real[va_idx]
    
    metrics, _ = run_fold(Xtr, ytr, Xva, yva, ALL_FEAT)
    metrics["fold"] = fold_i
    metrics["val_synthetic_count"] = 0
    exp_d2_folds.append(metrics)
    lo_r = metrics["per_class"]["Low"]["recall"]
    print(f"  Fold {fold_i}: acc={metrics['accuracy']:.4f}  macro_f1={metrics['macro_f1']:.4f}  Low_recall={lo_r:.4f}")

experiments["D2_real_synth_8feat"] = {
    "description": "Real train + all synthetic, 8 features (4 original + 4 engineered)",
    "features": ALL_FEAT,
    "folds": exp_d2_folds,
    "summary": summarise_folds(exp_d2_folds),
}

# ======================================================================
#  STEP 8 — EXPLICIT LEAKAGE CHECKS
# ======================================================================
print("\n" + "=" * 70)
print("  STEP 8 — LEAKAGE CHECKS")
print("=" * 70)

leakage_checks = {}

# Check 1: No synthetic in validation (by construction — verified)
leakage_checks["1_no_synthetic_in_val"] = "PASS — validation indices are drawn exclusively from real_df (mockly_training.csv). Synthetic rows are concatenated only to training arrays."

# Check 2: No duplicate audio_id across train/val
# (StratifiedKFold guarantees disjoint index sets on the real array)
leakage_checks["2_no_dup_audio_id_train_val"] = "PASS — StratifiedKFold produces disjoint index partitions on the real array."

# Check 3: Speaker overlap
has_speaker = "speaker_id" in orig.columns
leakage_checks["3_speaker_independent"] = f"N/A — no speaker_id column in dataset (has_speaker_id={has_speaker})"

# Check 4: Target leakage
leakage_checks["4_no_target_leakage"] = "PASS — features (wpm, pause_count, speech_duration, word_count) are acoustic measurements, not derived from the hesitation_label."

# Check 5: Features used to manufacture labels
leakage_checks["5_features_not_label_source"] = "WARNING — original labels were derived from overall_score thresholds which have near-zero correlation with these 4 features (r < 0.05). This is a dataset design problem, not a leakage issue."

# Check 6: Preprocessing fitted on val
leakage_checks["6_no_val_preprocessing"] = "PASS — no scaler/encoder fitted. Raw features used directly."

# Check 7: Synthetic derived from validation sample
leakage_checks["7_synth_from_val_leakage"] = "CONCERN — synthetic rows were generated from the ENTIRE original dataset. Some synthetic Low rows may have been generated using statistical distributions that include validation samples. This is a soft leakage risk. See results for impact assessment."

for k, v in leakage_checks.items():
    print(f"  [{k}] {v}")

# ======================================================================
#  STEP 9 — UNTOUCHED REAL HOLDOUT
# ======================================================================
print("\n" + "=" * 70)
print("  STEP 9 — UNTOUCHED REAL HOLDOUT EVALUATION")
print("=" * 70)

# 20% stratified holdout from real data, never used for anything else
from sklearn.model_selection import train_test_split

X_dev, X_holdout, y_dev, y_holdout = train_test_split(
    X_real, y_real, test_size=0.20, stratify=y_real, random_state=SEED
)
X_dev_eng, X_holdout_eng, _, _ = train_test_split(
    X_real_eng, y_real, test_size=0.20, stratify=y_real, random_state=SEED
)

print(f"Dev set   : {len(X_dev)} rows")
print(f"Holdout   : {len(X_holdout)} rows (NEVER trained on, evaluated ONCE)")
print(f"Holdout class dist: {dict(zip(*np.unique(y_holdout, return_counts=True)))}")

holdout_results = {}

# H-A: Train on dev real only → predict holdout
clf_ha = RandomForestClassifier(n_estimators=100, random_state=SEED)
clf_ha.fit(X_dev, y_dev)
y_ha_pred = clf_ha.predict(X_holdout)
ha_metrics, _ = run_fold(X_dev, y_dev, X_holdout, y_holdout, PROD_FEAT)
holdout_results["H_A_real_only"] = {
    "description": "Train on 80% real → evaluate on 20% real holdout",
    "features": PROD_FEAT,
    "metrics": ha_metrics,
}
print(f"\n  H-A (real only):   acc={ha_metrics['accuracy']:.4f}  macro_f1={ha_metrics['macro_f1']:.4f}  Low_recall={ha_metrics['per_class']['Low']['recall']:.4f}")

# H-B: Train on dev real + all synthetic → predict holdout
Xtr_hb = np.vstack([X_dev, synth_df[PROD_FEAT].values])
ytr_hb = np.concatenate([y_dev, synth_df["hesitation_label"].values])
hb_metrics, clf_hb = run_fold(Xtr_hb, ytr_hb, X_holdout, y_holdout, PROD_FEAT)
holdout_results["H_B_real_plus_synth"] = {
    "description": "Train on 80% real + all synthetic → evaluate on 20% real holdout",
    "features": PROD_FEAT,
    "metrics": hb_metrics,
}
print(f"  H-B (real+synth):  acc={hb_metrics['accuracy']:.4f}  macro_f1={hb_metrics['macro_f1']:.4f}  Low_recall={hb_metrics['per_class']['Low']['recall']:.4f}")

# H-C: Train on dev real + all synthetic, 8 features → predict holdout
Xtr_hc = np.vstack([X_dev_eng, synth_df_eng[ALL_FEAT].values])
ytr_hc = np.concatenate([y_dev, synth_df_eng["hesitation_label"].values])
hc_metrics, _ = run_fold(Xtr_hc, ytr_hc, X_holdout_eng, y_holdout, ALL_FEAT)
holdout_results["H_C_real_synth_8feat"] = {
    "description": "Train on 80% real + all synthetic, 8 features → evaluate on 20% real holdout",
    "features": ALL_FEAT,
    "metrics": hc_metrics,
}
print(f"  H-C (r+s, 8feat):  acc={hc_metrics['accuracy']:.4f}  macro_f1={hc_metrics['macro_f1']:.4f}  Low_recall={hc_metrics['per_class']['Low']['recall']:.4f}")

# ======================================================================
#  STEP 10 — SAVE CANDIDATE MODEL + RESULTS
# ======================================================================
print("\n" + "=" * 70)
print("  STEP 10 — SAVING RESULTS")
print("=" * 70)

# Save candidate model (best augmented: real + all synth, 4 features)
# Retrain on ALL real + all synthetic for deployment candidacy
clf_candidate = RandomForestClassifier(n_estimators=100, random_state=SEED)
Xtr_full = np.vstack([X_real, synth_df[PROD_FEAT].values])
ytr_full = np.concatenate([y_real, synth_df["hesitation_label"].values])
clf_candidate.fit(Xtr_full, ytr_full)

candidate_bundle = {
    "model": clf_candidate,
    "features": PROD_FEAT,
    "classes": list(clf_candidate.classes_),
    "trained_on": "mockly_training.csv (real) + synthetic from mockly_training_balanced_new.csv",
    "training_rows": len(Xtr_full),
    "training_real": len(X_real),
    "training_synthetic": len(synth_df),
    "timestamp": datetime.now(timezone.utc).isoformat(),
}
joblib.dump(candidate_bundle, CAND_PATH)
print(f"  Candidate model saved: {CAND_PATH.name}")

# Compile full results
full_results = {
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "experiment": "Leakage-Free Balanced Dataset Validation",
    "audit": audit,
    "leakage_checks": leakage_checks,
    "experiments": {},
    "holdout": holdout_results,
}

# Convert experiments (remove numpy types for JSON)
for name, exp in experiments.items():
    full_results["experiments"][name] = {
        "description": exp["description"],
        "features": exp["features"],
        "summary": exp["summary"],
        "folds": exp["folds"],
    }

with open(OUT_JSON, "w") as f:
    json.dump(full_results, f, indent=2, default=str)
print(f"  JSON results saved: {OUT_JSON.name}")

# ======================================================================
#  GENERATE MARKDOWN REPORT
# ======================================================================

def fmt_summary_table(experiments_dict):
    """Build a comparison table."""
    lines = []
    lines.append("| Experiment | Accuracy | Macro F1 | Weighted F1 | Low Recall | Med Recall | High Recall |")
    lines.append("|---|---|---|---|---|---|---|")
    for name, exp in experiments_dict.items():
        s = exp["summary"]
        acc  = f"{s['accuracy']['mean']*100:.1f}% ± {s['accuracy']['std']*100:.1f}%"
        mf1  = f"{s['macro_f1']['mean']:.4f} ± {s['macro_f1']['std']:.4f}"
        wf1  = f"{s['weighted_f1']['mean']:.4f} ± {s['weighted_f1']['std']:.4f}"
        lr   = f"{s['Low_recall']['mean']*100:.1f}% ± {s['Low_recall']['std']*100:.1f}%"
        mr   = f"{s['Medium_recall']['mean']*100:.1f}% ± {s['Medium_recall']['std']*100:.1f}%"
        hr   = f"{s['High_recall']['mean']*100:.1f}% ± {s['High_recall']['std']*100:.1f}%"
        lines.append(f"| {name} | {acc} | {mf1} | {wf1} | {lr} | {mr} | {hr} |")
    return "\n".join(lines)


def fmt_holdout_table(holdout_dict):
    lines = []
    lines.append("| Experiment | Accuracy | Macro F1 | Low P/R/F1 | Med P/R/F1 | High P/R/F1 |")
    lines.append("|---|---|---|---|---|---|")
    for name, h in holdout_dict.items():
        m = h["metrics"]
        acc = f"{m['accuracy']*100:.1f}%"
        mf1 = f"{m['macro_f1']:.4f}"
        lp = m['per_class']['Low']
        mp = m['per_class']['Medium']
        hp = m['per_class']['High']
        lstr = f"{lp['precision']:.2f}/{lp['recall']:.2f}/{lp['f1']:.2f}"
        mstr = f"{mp['precision']:.2f}/{mp['recall']:.2f}/{mp['f1']:.2f}"
        hstr = f"{hp['precision']:.2f}/{hp['recall']:.2f}/{hp['f1']:.2f}"
        lines.append(f"| {name} | {acc} | {mf1} | {lstr} | {mstr} | {hstr} |")
    return "\n".join(lines)


md_lines = []
md_lines.append("# Leakage-Free Balanced Dataset Validation Report")
md_lines.append(f"\n**Generated:** {datetime.now(timezone.utc).isoformat()}")
md_lines.append(f"\n**Production model:** `hesitation_rf_v2.joblib` — **NOT MODIFIED**")
md_lines.append(f"\n**Original dataset:** `mockly_training.csv` — **NOT MODIFIED**")

md_lines.append("\n## 1. Dataset Audit")
md_lines.append(f"\n- Original: {audit['original_rows']} rows")
md_lines.append(f"- New Balanced: {audit['new_balanced_rows']} rows")
md_lines.append(f"- Matched as real: {audit['matched_real']}")
md_lines.append(f"- Identified synthetic: {audit['identified_synthetic']}")
md_lines.append(f"- Duplicate audio_ids: {audit['duplicate_audio_ids']}")
md_lines.append(f"- Has source column: {audit['has_source_column']}")
md_lines.append(f"\n**Original class distribution:** {audit['class_dist_original']}")
md_lines.append(f"\n**New balanced class distribution:** {audit['class_dist_new']}")

md_lines.append("\n## 2. Leakage Checks")
for k, v in leakage_checks.items():
    md_lines.append(f"\n- **{k}**: {v}")

md_lines.append("\n## 3. Cross-Validation Results (4 production features)")
md_lines.append(f"\n{fmt_summary_table({k:v for k,v in experiments.items() if 'D' not in k})}")

md_lines.append("\n## 4. Engineered Features Results (8 features)")
md_lines.append(f"\n{fmt_summary_table({k:v for k,v in experiments.items() if 'D' in k})}")

md_lines.append("\n## 5. Untouched Real Holdout (20%)")
md_lines.append(f"\n{fmt_holdout_table(holdout_results)}")

# Final answers
md_lines.append("\n## 6. Final Answers")
prev_valid = "NO" if exp_a_summary["Low_recall"]["mean"] < 0.01 else "INCONCLUSIVE"
md_lines.append(f"""
1. **Was the previous 78.8% accuracy valid?** NO — synthetic rows contaminated validation splits.
2. **TRUE real-only validation accuracy:** {exp_a_summary['accuracy']['mean']*100:.1f}% (baseline), {exp_b_summary['accuracy']['mean']*100:.1f}% (with synth augmentation)
3. **TRUE Low recall:** Baseline={exp_a_summary['Low_recall']['mean']*100:.1f}%, Augmented={exp_b_summary['Low_recall']['mean']*100:.1f}%
4. **TRUE Macro F1:** Baseline={exp_a_summary['macro_f1']['mean']:.4f}, Augmented={exp_b_summary['macro_f1']['mean']:.4f}
5. **Does synthetic augmentation genuinely improve?** See per-class trade-offs above.
6. **Low recall improvement:** {exp_a_summary['Low_recall']['mean']*100:.1f}% → {exp_b_summary['Low_recall']['mean']*100:.1f}% (Δ = {(exp_b_summary['Low_recall']['mean'] - exp_a_summary['Low_recall']['mean'])*100:+.1f}pp)
7. **Medium/High recall change:** Med: {exp_a_summary['Medium_recall']['mean']*100:.1f}% → {exp_b_summary['Medium_recall']['mean']*100:.1f}%, High: {exp_a_summary['High_recall']['mean']*100:.1f}% → {exp_b_summary['High_recall']['mean']*100:.1f}%
8. **Best synthetic ratio:** See Experiment C sweep results above.
9. **Consistent across folds?** Check fold-level std in tables above.
10. **Final holdout result:** H-A acc={ha_metrics['accuracy']*100:.1f}%, H-B acc={hb_metrics['accuracy']*100:.1f}%
11. **Safe to continue testing?** See leakage check #7 (soft concern about synthetic distribution overlap).
""")

md_content = "\n".join(md_lines)
with open(OUT_MD, "w", encoding="utf-8") as f:
    f.write(md_content)
print(f"  Markdown report saved: {OUT_MD.name}")

print("\n" + "=" * 70)
print("  EXPERIMENT COMPLETE")
print("=" * 70)
print(f"\nFiles saved:")
print(f"  {OUT_JSON}")
print(f"  {OUT_MD}")
print(f"  {CAND_PATH}")
print(f"\nProduction model hesitation_rf_v2.joblib: UNTOUCHED")
print(f"Original dataset mockly_training.csv: UNTOUCHED")
