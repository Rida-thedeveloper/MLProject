"""
Controlled Synthetic-Augmentation Experiment — Hesitation Model
================================================================
Uses pre-generated synthetic Low samples from mockly_training_balanced.csv.
Synthetic rows are NEVER placed in any validation or test fold.

Experiment A  — Original real data only, Stratified 5-fold CV
Experiment B  — Original real data + synthetic Low pool injected into
                TRAINING folds only, validated on real-only folds

Both use: RandomForest, class_weight="balanced", n_estimators=200

Outputs
-------
  backend/ml/models/synthetic_augmentation_experiment.json
  backend/ml/models/hesitation_rf_balanced_candidate.joblib
    (saved ONLY if B is demonstrably better overall — see verdict logic)

Production model hesitation_rf_v2.joblib is NEVER modified.
mockly_training.csv is NEVER modified.
"""

import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.metrics import (
    accuracy_score, confusion_matrix,
    f1_score, precision_score, recall_score,
)

warnings.filterwarnings("ignore")

# ── paths ─────────────────────────────────────────────────────────────────────
ROOT        = Path(__file__).resolve().parent.parent.parent
REAL_CSV    = ROOT / "dataset" / "mockly_training.csv"          # NEVER modified
BALANCED_CSV= ROOT / "dataset" / "mockly_training_balanced.csv" # source of synth rows
PROD_MODEL  = ROOT / "backend" / "ml" / "models" / "hesitation_rf_v2.joblib"
CAND_MODEL  = ROOT / "backend" / "ml" / "models" / "hesitation_rf_balanced_candidate.joblib"
OUT_JSON    = ROOT / "backend" / "ml" / "models" / "synthetic_augmentation_experiment.json"

LABEL_COL = "hesitation_label"
CLASSES   = ["Low", "Medium", "High"]
FEATURES  = ["wpm", "pause_count", "speech_duration", "word_count"]

RF_PARAMS = dict(n_estimators=200, class_weight="balanced",
                 random_state=42, n_jobs=-1)
N_FOLDS   = 5
SEED      = 42

# ── helpers ───────────────────────────────────────────────────────────────────

def class_counts(y) -> dict:
    s = pd.Series(y).value_counts()
    return {cls: int(s.get(cls, 0)) for cls in CLASSES}


def compute_metrics(y_true, y_pred) -> dict:
    yt = list(y_true)
    yp = list(y_pred)
    per = {}
    for cls in CLASSES:
        bt = [1 if v == cls else 0 for v in yt]
        bp = [1 if v == cls else 0 for v in yp]
        per[cls] = {
            "precision": round(float(precision_score(bt, bp, zero_division=0)), 4),
            "recall":    round(float(recall_score(bt, bp, zero_division=0)),    4),
            "f1":        round(float(f1_score(bt, bp, zero_division=0)),        4),
            "support":   int(sum(bt)),
        }
    cm = confusion_matrix(yt, yp, labels=CLASSES)
    return {
        "accuracy":    round(float(accuracy_score(yt, yp)), 4),
        "macro_f1":    round(float(f1_score(yt, yp, average="macro",    zero_division=0)), 4),
        "weighted_f1": round(float(f1_score(yt, yp, average="weighted", zero_division=0)), 4),
        "per_class":   per,
        "confusion_matrix": {"labels": CLASSES, "matrix": cm.tolist()},
    }


def print_metrics(tag: str, m: dict):
    low  = m["per_class"]["Low"]
    mid  = m["per_class"]["Medium"]
    hi   = m["per_class"]["High"]
    print(f"\n  [{tag}]")
    print(f"    Accuracy    : {m['accuracy']:.4f}")
    print(f"    Macro F1    : {m['macro_f1']:.4f}")
    print(f"    Weighted F1 : {m['weighted_f1']:.4f}")
    print(f"    Low     P={low['precision']:.4f}  R={low['recall']:.4f}  "
          f"F1={low['f1']:.4f}  n={low['support']}")
    print(f"    Medium  P={mid['precision']:.4f}  R={mid['recall']:.4f}  "
          f"F1={mid['f1']:.4f}  n={mid['support']}")
    print(f"    High    P={hi['precision']:.4f}  R={hi['recall']:.4f}  "
          f"F1={hi['f1']:.4f}  n={hi['support']}")


def agg_folds(fold_list: list, key: str, sub: str = None) -> tuple:
    if sub:
        vals = [f["per_class"][sub][key] for f in fold_list]
    else:
        vals = [f[key] for f in fold_list]
    return round(float(np.mean(vals)), 4), round(float(np.std(vals)), 4)


def print_separator(title=""):
    line = "=" * 60
    if title:
        print(f"\n{line}")
        print(title)
        print(line)
    else:
        print(f"\n{line}")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("CONTROLLED SYNTHETIC-AUGMENTATION EXPERIMENT")
    print("=" * 70)

    # ── 1. Load datasets ──────────────────────────────────────────────────
    real_df = pd.read_csv(REAL_CSV)
    bal_df  = pd.read_csv(BALANCED_CSV)

    # Separate synthetic pool — these rows NEVER go into any val/test set
    synth_pool = bal_df[bal_df["is_synthetic"] == True].copy().reset_index(drop=True)
    real_check = bal_df[bal_df["is_synthetic"] == False]

    print(f"\n  Real master dataset   : {REAL_CSV.name}  ({len(real_df)} rows)")
    print(f"  Balanced dataset      : {BALANCED_CSV.name}  ({len(bal_df)} rows)")
    print(f"  Synthetic Low pool    : {len(synth_pool)} rows")
    print(f"  Real rows in balanced : {len(real_check)} rows (sanity check = {len(real_df)})")

    print("\n  Real dataset distribution:")
    rc = class_counts(real_df[LABEL_COL])
    total_real = len(real_df)
    for cls in CLASSES:
        print(f"    {cls:<8}: {rc[cls]:>5}  ({rc[cls]/total_real*100:.2f}%)")

    print("\n  Synthetic pool distribution:")
    sc = class_counts(synth_pool[LABEL_COL])
    for cls in CLASSES:
        if sc[cls]:
            print(f"    {cls:<8}: {sc[cls]:>5} (all synthetic, never in val folds)")

    # Sanity: verify real master == real rows in balanced
    real_ids_orig = set(real_df["audio_id"].astype(str))
    real_ids_bal  = set(real_check["audio_id"].astype(str))
    id_match      = real_ids_orig == real_ids_bal
    print(f"\n  audio_id match (real master vs balanced real rows): {id_match}")

    # ── 2. Hold-out split (real only) ─────────────────────────────────────
    print_separator("HOLD-OUT SPLIT (REAL DATA ONLY)")

    X_real = real_df[FEATURES]
    y_real = real_df[LABEL_COL]

    X_tr_real, X_te, y_tr_real, y_te = train_test_split(
        X_real, y_real,
        test_size=0.20, stratify=y_real, random_state=SEED
    )
    print(f"\n  Train (real) : {len(X_tr_real)} rows")
    print(f"  Test  (real) : {len(X_te)} rows  [NEVER touched by synthetic data]")
    train_dist = class_counts(y_tr_real)
    test_dist  = class_counts(y_te)
    print(f"  Train dist: {train_dist}")
    print(f"  Test  dist: {test_dist}")

    X_synth = synth_pool[FEATURES]
    y_synth = synth_pool[LABEL_COL]

    # Augmented training set: real train + full synthetic Low pool
    X_tr_aug = pd.concat([X_tr_real, X_synth], ignore_index=True)
    y_tr_aug = pd.concat([y_tr_real.reset_index(drop=True), y_synth.reset_index(drop=True)],
                         ignore_index=True)
    aug_train_dist = class_counts(y_tr_aug)
    print(f"\n  Augmented train dist: {aug_train_dist}")

    # ── 3. Exp A Hold-out ─────────────────────────────────────────────────
    print_separator("EXPERIMENT A: Original Only (Hold-Out Test)")
    clf_a = RandomForestClassifier(**RF_PARAMS)
    clf_a.fit(X_tr_real, y_tr_real)
    pred_a = clf_a.predict(X_te)
    m_a_ho = compute_metrics(y_te.tolist(), pred_a.tolist())
    print_metrics("A — Hold-Out", m_a_ho)

    # Feature importance
    fi_a = {f: round(float(v), 4) for f, v in zip(FEATURES, clf_a.feature_importances_)}
    print(f"\n  Feature importances: {fi_a}")

    # ── 4. Exp B Hold-out ─────────────────────────────────────────────────
    print_separator("EXPERIMENT B: Augmented (Hold-Out Test — real test set)")
    clf_b = RandomForestClassifier(**RF_PARAMS)
    clf_b.fit(X_tr_aug, y_tr_aug)
    pred_b = clf_b.predict(X_te)    # same real test set as A
    m_b_ho = compute_metrics(y_te.tolist(), pred_b.tolist())
    print_metrics("B — Hold-Out (real test)", m_b_ho)

    fi_b = {f: round(float(v), 4) for f, v in zip(FEATURES, clf_b.feature_importances_)}
    print(f"\n  Feature importances: {fi_b}")

    # ── 5. 5-Fold CV — Experiment A ───────────────────────────────────────
    print_separator("5-FOLD CV — Experiment A (no augmentation)")
    skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=SEED)
    folds_a = []
    for fold, (tr_idx, va_idx) in enumerate(skf.split(X_real, y_real), 1):
        X_tr_f = X_real.iloc[tr_idx]
        y_tr_f = y_real.iloc[tr_idx]
        X_va_f = X_real.iloc[va_idx]   # pure real val
        y_va_f = y_real.iloc[va_idx]

        clf = RandomForestClassifier(**RF_PARAMS)
        clf.fit(X_tr_f, y_tr_f)
        preds = clf.predict(X_va_f)
        fm = compute_metrics(y_va_f.tolist(), preds.tolist())
        fm["fold"] = fold
        folds_a.append(fm)
        lr = fm["per_class"]["Low"]["recall"]
        print(f"  Fold {fold}: Acc={fm['accuracy']:.4f}  MacroF1={fm['macro_f1']:.4f}  "
              f"LowR={lr:.4f}  LowF1={fm['per_class']['Low']['f1']:.4f}")

    low_per_fold_a = [f["per_class"]["Low"]["recall"] for f in folds_a]
    print(f"\n  Low recall per fold: {[round(r,3) for r in low_per_fold_a]}")
    print(f"  Consistent (all>0) : {all(r > 0 for r in low_per_fold_a)}")

    # ── 6. 5-Fold CV — Experiment B ───────────────────────────────────────
    print_separator("5-FOLD CV — Experiment B (synthetic Low in train folds only)")
    folds_b = []
    for fold, (tr_idx, va_idx) in enumerate(skf.split(X_real, y_real), 1):
        X_tr_f = X_real.iloc[tr_idx]
        y_tr_f = y_real.iloc[tr_idx]
        X_va_f = X_real.iloc[va_idx]   # pure real val — NO synthetics
        y_va_f = y_real.iloc[va_idx]

        # Inject full synthetic Low pool into training fold only
        X_tr_aug_f = pd.concat([X_tr_f, X_synth], ignore_index=True)
        y_tr_aug_f = pd.concat([y_tr_f.reset_index(drop=True),
                                 y_synth.reset_index(drop=True)], ignore_index=True)

        clf = RandomForestClassifier(**RF_PARAMS)
        clf.fit(X_tr_aug_f, y_tr_aug_f)
        preds = clf.predict(X_va_f)   # evaluated ONLY on real samples
        fm = compute_metrics(y_va_f.tolist(), preds.tolist())
        fm["fold"] = fold
        folds_b.append(fm)
        lr = fm["per_class"]["Low"]["recall"]
        print(f"  Fold {fold}: Acc={fm['accuracy']:.4f}  MacroF1={fm['macro_f1']:.4f}  "
              f"LowR={lr:.4f}  LowF1={fm['per_class']['Low']['f1']:.4f}")

    low_per_fold_b = [f["per_class"]["Low"]["recall"] for f in folds_b]
    print(f"\n  Low recall per fold: {[round(r,3) for r in low_per_fold_b]}")
    print(f"  Consistent (all>0) : {all(r > 0 for r in low_per_fold_b)}")

    # ── 7. Full Comparison ────────────────────────────────────────────────
    print_separator("FULL COMPARISON")

    # Hold-out
    print("\n  HOLD-OUT TEST RESULTS")
    fmt = f"  {'Metric':<24} {'Exp-A':>9} {'Exp-B':>9} {'Delta':>9} {'Better?':>9}"
    print(fmt)
    print("  " + "-" * 64)

    def cmp_row(label, va, vb, higher_is_better=True):
        delta = vb - va
        better = (delta > 0) if higher_is_better else (delta < 0)
        arrow  = "B" if better else ("A" if delta < 0 else "=")
        sign   = "+" if delta >= 0 else ""
        print(f"  {label:<24} {va:>9.4f} {vb:>9.4f} {sign}{delta:>8.4f} {arrow:>9}")

    cmp_row("Accuracy",       m_a_ho["accuracy"],                      m_b_ho["accuracy"])
    cmp_row("Macro F1",       m_a_ho["macro_f1"],                      m_b_ho["macro_f1"])
    cmp_row("Weighted F1",    m_a_ho["weighted_f1"],                   m_b_ho["weighted_f1"])
    cmp_row("Low Precision",  m_a_ho["per_class"]["Low"]["precision"], m_b_ho["per_class"]["Low"]["precision"])
    cmp_row("Low Recall",     m_a_ho["per_class"]["Low"]["recall"],    m_b_ho["per_class"]["Low"]["recall"])
    cmp_row("Low F1",         m_a_ho["per_class"]["Low"]["f1"],        m_b_ho["per_class"]["Low"]["f1"])
    cmp_row("Medium Recall",  m_a_ho["per_class"]["Medium"]["recall"], m_b_ho["per_class"]["Medium"]["recall"])
    cmp_row("High Recall",    m_a_ho["per_class"]["High"]["recall"],   m_b_ho["per_class"]["High"]["recall"])

    # CV aggregate
    print("\n  5-FOLD CV RESULTS (mean +/- std)")
    fmt2 = f"  {'Metric':<24} {'A-mean':>9} {'A-std':>8} {'B-mean':>9} {'B-std':>8} {'Delta':>9}"
    print(fmt2)
    print("  " + "-" * 74)

    def cv_row(label, key, sub=None):
        am, as_ = agg_folds(folds_a, key, sub)
        bm, bs_ = agg_folds(folds_b, key, sub)
        delta = bm - am
        sign  = "+" if delta >= 0 else ""
        print(f"  {label:<24} {am:>9.4f} {as_:>8.4f} {bm:>9.4f} {bs_:>8.4f} {sign}{delta:>8.4f}")

    cv_row("Accuracy",       "accuracy")
    cv_row("Macro F1",       "macro_f1")
    cv_row("Weighted F1",    "weighted_f1")
    cv_row("Low Precision",  "precision", "Low")
    cv_row("Low Recall",     "recall",    "Low")
    cv_row("Low F1",         "f1",        "Low")
    cv_row("Medium Recall",  "recall",    "Medium")
    cv_row("High Recall",    "recall",    "High")

    print("\n  Low recall consistency across all CV folds:")
    print(f"    A: {[round(r,3) for r in low_per_fold_a]}"
          f"  consistent={all(r>0 for r in low_per_fold_a)}")
    print(f"    B: {[round(r,3) for r in low_per_fold_b]}"
          f"  consistent={all(r>0 for r in low_per_fold_b)}")

    # Confusion matrices
    print("\n  CONFUSION MATRICES (hold-out test)")
    for exp_label, m in [("A — Original", m_a_ho), ("B — Augmented", m_b_ho)]:
        print(f"\n  {exp_label}:")
        print(f"    {'':>12}", end="")
        for c in CLASSES:
            print(f"  Pred-{c:<8}", end="")
        print()
        cm = m["confusion_matrix"]["matrix"]
        for i, cls in enumerate(CLASSES):
            print(f"    True-{cls:<8}", end="")
            for val in cm[i]:
                print(f"  {val:>12}", end="")
            print()

    # ── 8. Verdict ────────────────────────────────────────────────────────
    print_separator("VERDICT")

    cv_low_r_a, _   = agg_folds(folds_a, "recall", "Low")
    cv_low_r_b, _   = agg_folds(folds_b, "recall", "Low")
    cv_mf1_a,   _   = agg_folds(folds_a, "macro_f1")
    cv_mf1_b,   _   = agg_folds(folds_b, "macro_f1")
    cv_mid_r_a, _   = agg_folds(folds_a, "recall", "Medium")
    cv_mid_r_b, _   = agg_folds(folds_b, "recall", "Medium")
    cv_hi_r_a,  _   = agg_folds(folds_a, "recall", "High")
    cv_hi_r_b,  _   = agg_folds(folds_b, "recall", "High")

    ho_low_r_a  = m_a_ho["per_class"]["Low"]["recall"]
    ho_low_r_b  = m_b_ho["per_class"]["Low"]["recall"]
    ho_mf1_a    = m_a_ho["macro_f1"]
    ho_mf1_b    = m_b_ho["macro_f1"]

    low_recall_improved       = ho_low_r_b > ho_low_r_a and cv_low_r_b > cv_low_r_a
    low_consistent_b          = all(r > 0 for r in low_per_fold_b)
    macro_f1_acceptable       = ho_mf1_b >= ho_mf1_a - 0.03    # allow max 3pp drop
    mid_hi_degradation        = (cv_mid_r_a - cv_mid_r_b) + (cv_hi_r_a - cv_hi_r_b)
    degradation_acceptable    = mid_hi_degradation < 0.30       # combined drop < 30pp
    genuinely_better          = (low_recall_improved and low_consistent_b
                                 and macro_f1_acceptable and degradation_acceptable)

    print(f"""
  Low recall improved (hold-out + CV): {low_recall_improved}
    Hold-out : {ho_low_r_a:.4f} -> {ho_low_r_b:.4f}
    CV mean  : {cv_low_r_a:.4f} -> {cv_low_r_b:.4f}

  Low recall consistent across all CV folds: {low_consistent_b}

  Macro F1 acceptable (<=3pp drop): {macro_f1_acceptable}
    Hold-out : {ho_mf1_a:.4f} -> {ho_mf1_b:.4f}

  Medium+High combined recall degradation: {mid_hi_degradation:.4f}
    (acceptable if < 0.30; actual = {mid_hi_degradation:.4f})

  OVERALL: Augmented model is {'GENUINELY BETTER' if genuinely_better else 'NOT YET GOOD ENOUGH'}
  Candidate model will be {'SAVED' if genuinely_better else 'NOT SAVED'}
  Production hesitation_rf_v2.joblib: NOT MODIFIED
""")

    # ── 9. Save candidate model if genuinely better ────────────────────────
    candidate_saved = False
    if genuinely_better:
        import joblib
        # Train on ALL real data + full synthetic pool
        X_full = pd.concat([X_real, X_synth], ignore_index=True)
        y_full = pd.concat([y_real.reset_index(drop=True),
                             y_synth.reset_index(drop=True)], ignore_index=True)
        clf_cand = RandomForestClassifier(**RF_PARAMS)
        clf_cand.fit(X_full, y_full)
        joblib.dump(clf_cand, CAND_MODEL)
        candidate_saved = True
        print(f"  Candidate model saved: {CAND_MODEL}")
        print(f"  Trained on {len(X_full)} rows ({len(X_real)} real + {len(X_synth)} synthetic Low)")
    else:
        print(f"  Candidate model NOT saved — improvement trade-off is not yet sufficient.")

    # ── 10. Save JSON ─────────────────────────────────────────────────────
    cv_a_agg = {}
    cv_b_agg = {}
    for cls in CLASSES:
        for exp_folds, agg_dict in [(folds_a, cv_a_agg), (folds_b, cv_b_agg)]:
            r_m, r_s = agg_folds(exp_folds, "recall",    cls)
            p_m, p_s = agg_folds(exp_folds, "precision", cls)
            f_m, f_s = agg_folds(exp_folds, "f1",        cls)
            agg_dict[cls] = {
                "mean_recall": r_m, "std_recall": r_s,
                "mean_precision": p_m, "std_precision": p_s,
                "mean_f1": f_m, "std_f1": f_s,
            }

    output = {
        "experiment": "Controlled Synthetic Augmentation — Hesitation Model",
        "production_model_modified": False,
        "production_model_path": str(PROD_MODEL),
        "candidate_model_saved": candidate_saved,
        "candidate_model_path": str(CAND_MODEL) if candidate_saved else None,
        "data": {
            "real_master": str(REAL_CSV),
            "balanced_source": str(BALANCED_CSV),
            "real_rows": len(real_df),
            "synthetic_rows": len(synth_pool),
            "real_distribution": rc,
            "synthetic_low_count": sc["Low"],
            "hold_out_train_real": len(X_tr_real),
            "hold_out_test_real": len(X_te),
            "hold_out_aug_train": len(X_tr_aug),
            "test_distribution": test_dist,
            "aug_train_distribution": aug_train_dist,
            "synthetic_in_val_folds": False,
            "synthetic_in_test_set": False,
        },
        "rf_params": RF_PARAMS,
        "n_cv_folds": N_FOLDS,
        "experiment_A": {
            "description": "Original real data only, no augmentation",
            "hold_out": m_a_ho,
            "cv_summary": {
                "mean_accuracy":     round(float(np.mean([f["accuracy"] for f in folds_a])), 4),
                "std_accuracy":      round(float(np.std([f["accuracy"] for f in folds_a])), 4),
                "mean_macro_f1":     round(float(np.mean([f["macro_f1"] for f in folds_a])), 4),
                "std_macro_f1":      round(float(np.std([f["macro_f1"] for f in folds_a])), 4),
                "mean_weighted_f1":  round(float(np.mean([f["weighted_f1"] for f in folds_a])), 4),
                "std_weighted_f1":   round(float(np.std([f["weighted_f1"] for f in folds_a])), 4),
            },
            "cv_per_class": cv_a_agg,
            "low_recall_per_fold": [round(r, 4) for r in low_per_fold_a],
            "low_recall_consistent": all(r > 0 for r in low_per_fold_a),
            "feature_importances": fi_a,
            "fold_details": folds_a,
        },
        "experiment_B": {
            "description": "Real train fold + full synthetic Low pool (val = real only)",
            "hold_out": m_b_ho,
            "cv_summary": {
                "mean_accuracy":     round(float(np.mean([f["accuracy"] for f in folds_b])), 4),
                "std_accuracy":      round(float(np.std([f["accuracy"] for f in folds_b])), 4),
                "mean_macro_f1":     round(float(np.mean([f["macro_f1"] for f in folds_b])), 4),
                "std_macro_f1":      round(float(np.std([f["macro_f1"] for f in folds_b])), 4),
                "mean_weighted_f1":  round(float(np.mean([f["weighted_f1"] for f in folds_b])), 4),
                "std_weighted_f1":   round(float(np.std([f["weighted_f1"] for f in folds_b])), 4),
            },
            "cv_per_class": cv_b_agg,
            "low_recall_per_fold": [round(r, 4) for r in low_per_fold_b],
            "low_recall_consistent": all(r > 0 for r in low_per_fold_b),
            "feature_importances": fi_b,
            "fold_details": folds_b,
        },
        "verdict": {
            "low_recall_improved": low_recall_improved,
            "low_recall_consistent_cv": low_consistent_b,
            "macro_f1_acceptable": macro_f1_acceptable,
            "mid_hi_combined_degradation": round(float(mid_hi_degradation), 4),
            "degradation_acceptable": degradation_acceptable,
            "genuinely_better": genuinely_better,
            "summary": (
                f"Low recall: {ho_low_r_a:.4f}->{ho_low_r_b:.4f} (hold-out), "
                f"CV: {cv_low_r_a:.4f}->{cv_low_r_b:.4f} (consistent={low_consistent_b}). "
                f"Macro F1: {ho_mf1_a:.4f}->{ho_mf1_b:.4f}. "
                f"Medium+High recall degradation: {mid_hi_degradation:.4f}. "
                f"Overall: {'GENUINELY BETTER' if genuinely_better else 'TRADE-OFF NOT YET ACCEPTABLE'}."
            ),
        },
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n  Results saved: {OUT_JSON}")
    print("=" * 70)
    print("CONTROLLED SYNTHETIC AUGMENTATION EXPERIMENT COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
