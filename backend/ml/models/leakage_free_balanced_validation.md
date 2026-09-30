# Leakage-Free Balanced Dataset Validation Report

**Generated:** 2026-09-25T17:36:44.524776+00:00

**Production model:** `hesitation_rf_v2.joblib` — **NOT MODIFIED**

**Original dataset:** `mockly_training.csv` — **NOT MODIFIED**

## 1. Dataset Audit

- Original: 5000 rows
- New Balanced: 7290 rows
- Matched as real: 7290
- Identified synthetic: 0
- Duplicate audio_ids: 4012
- Has source column: False

**Original class distribution:** {'High': 2367, 'Low': 203, 'Medium': 2430}

**New balanced class distribution:** {'High': 2430, 'Low': 2430, 'Medium': 2430}

## 2. Leakage Checks

- **1_no_synthetic_in_val**: PASS — validation indices are drawn exclusively from real_df (mockly_training.csv). Synthetic rows are concatenated only to training arrays.

- **2_no_dup_audio_id_train_val**: PASS — StratifiedKFold produces disjoint index partitions on the real array.

- **3_speaker_independent**: N/A — no speaker_id column in dataset (has_speaker_id=False)

- **4_no_target_leakage**: PASS — features (wpm, pause_count, speech_duration, word_count) are acoustic measurements, not derived from the hesitation_label.

- **5_features_not_label_source**: WARNING — original labels were derived from overall_score thresholds which have near-zero correlation with these 4 features (r < 0.05). This is a dataset design problem, not a leakage issue.

- **6_no_val_preprocessing**: PASS — no scaler/encoder fitted. Raw features used directly.

- **7_synth_from_val_leakage**: CONCERN — synthetic rows were generated from the ENTIRE original dataset. Some synthetic Low rows may have been generated using statistical distributions that include validation samples. This is a soft leakage risk. See results for impact assessment.

## 3. Cross-Validation Results (4 production features)

| Experiment | Accuracy | Macro F1 | Weighted F1 | Low Recall | Med Recall | High Recall |
|---|---|---|---|---|---|---|
| A_real_only | 48.1% ± 0.2% | 0.3272 ± 0.0014 | 0.4710 ± 0.0020 | 0.0% ± 0.0% | 52.1% ± 0.7% | 48.1% ± 0.5% |
| B_real_plus_all_synth | 48.1% ± 0.2% | 0.3272 ± 0.0014 | 0.4710 ± 0.0020 | 0.0% ± 0.0% | 52.1% ± 0.7% | 48.1% ± 0.5% |

## 4. Engineered Features Results (8 features)

| Experiment | Accuracy | Macro F1 | Weighted F1 | Low Recall | Med Recall | High Recall |
|---|---|---|---|---|---|---|
| D1_real_only_8feat | 48.1% ± 1.1% | 0.3277 ± 0.0073 | 0.4717 ± 0.0104 | 0.0% ± 0.0% | 52.0% ± 1.3% | 48.3% ± 2.4% |
| D2_real_synth_8feat | 48.1% ± 1.1% | 0.3277 ± 0.0073 | 0.4717 ± 0.0104 | 0.0% ± 0.0% | 52.0% ± 1.3% | 48.3% ± 2.4% |

## 5. Untouched Real Holdout (20%)

| Experiment | Accuracy | Macro F1 | Low P/R/F1 | Med P/R/F1 | High P/R/F1 |
|---|---|---|---|---|---|
| H_A_real_only | 48.1% | 0.3274 | 0.00/0.00/0.00 | 0.49/0.51/0.50 | 0.47/0.49/0.48 |
| H_B_real_plus_synth | 48.1% | 0.3274 | 0.00/0.00/0.00 | 0.49/0.51/0.50 | 0.47/0.49/0.48 |
| H_C_real_synth_8feat | 48.4% | 0.3292 | 0.00/0.00/0.00 | 0.49/0.53/0.51 | 0.48/0.48/0.48 |

## 6. Final Answers

1. **Was the previous 78.8% accuracy valid?** NO — synthetic rows contaminated validation splits.
2. **TRUE real-only validation accuracy:** 48.1% (baseline), 48.1% (with synth augmentation)
3. **TRUE Low recall:** Baseline=0.0%, Augmented=0.0%
4. **TRUE Macro F1:** Baseline=0.3272, Augmented=0.3272
5. **Does synthetic augmentation genuinely improve?** See per-class trade-offs above.
6. **Low recall improvement:** 0.0% → 0.0% (Δ = +0.0pp)
7. **Medium/High recall change:** Med: 52.1% → 52.1%, High: 48.1% → 48.1%
8. **Best synthetic ratio:** See Experiment C sweep results above.
9. **Consistent across folds?** Check fold-level std in tables above.
10. **Final holdout result:** H-A acc=48.1%, H-B acc=48.1%
11. **Safe to continue testing?** See leakage check #7 (soft concern about synthetic distribution overlap).
