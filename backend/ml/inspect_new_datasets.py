import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
from sklearn.model_selection import StratifiedKFold
from scipy.stats import pearsonr

BASE_DIR = r"C:\Users\MMC\.gemini\antigravity\scratch\Mockly\dataset"

full_path = os.path.join(BASE_DIR, "mockly_hesitation_dataset_new.csv")
train_path = os.path.join(BASE_DIR, "mockly_train_new.csv")
test_path = os.path.join(BASE_DIR, "mockly_test_new.csv")

full_df = pd.read_csv(full_path)
train_df = pd.read_csv(train_path)
test_df = pd.read_csv(test_path)

print("=" * 70)
print("  DATASET OVERVIEW & AUDIT")
print("=" * 70)
print(f"Full Dataset : {len(full_df)} rows, columns: {list(full_df.columns)}")
print(f"Train Dataset: {len(train_df)} rows, columns: {list(train_df.columns)}")
print(f"Test Dataset : {len(test_df)} rows, columns: {list(test_df.columns)}")

target_col = "hesitation_label" if "hesitation_label" in full_df.columns else "label"

print("\n" + "=" * 70)
print("  CLASS DISTRIBUTIONS")
print("=" * 70)
print("Full Dataset:")
print(full_df[target_col].value_counts().sort_index())
print("\nTrain Dataset:")
print(train_df[target_col].value_counts().sort_index())
print("\nTest Dataset:")
print(test_df[target_col].value_counts().sort_index())

print("\n" + "=" * 70)
print("  FEATURE MEANS & SPREAD PER CLASS (Full Dataset)")
print("=" * 70)
features = [c for c in ["wpm", "pause_count", "speech_duration", "word_count", "average_pause", "silence_ratio", "filler_count"] if c in full_df.columns]
print(full_df.groupby(target_col)[features].mean().round(2))

print("\n" + "=" * 70)
print("  FEATURE CORRELATION WITH LABEL")
print("=" * 70)
label_map = {"Low": 0, "Medium": 1, "High": 2}
if set(full_df[target_col].unique()).issubset(set(label_map.keys())):
    y_num = full_df[target_col].map(label_map)
    for f in features:
        if full_df[f].dtype in [np.float64, np.int64]:
            r, p = pearsonr(full_df[f], y_num)
            print(f"  {f:20s}: r = {r:+.4f} (p-value = {p:.4e})")

print("\n" + "=" * 70)
print("  TRAIN / TEST LEAKAGE CHECK (Overlap check)")
print("=" * 70)
if "audio_id" in train_df.columns and "audio_id" in test_df.columns:
    train_ids = set(train_df["audio_id"])
    test_ids = set(test_df["audio_id"])
    overlap = train_ids.intersection(test_ids)
    print(f"Audio ID overlap between Train and Test: {len(overlap)} samples")
else:
    print("audio_id column not present in both train/test")

print("\n" + "=" * 70)
print("  MODEL TRAINING & EVALUATION ON TEST SET")
print("=" * 70)
core_features = ["wpm", "pause_count", "speech_duration", "word_count"]
X_train = train_df[core_features]
y_train = train_df[target_col]
X_test = test_df[core_features]
y_test = test_df[target_col]

clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)
y_pred = clf.predict(X_test)

acc = accuracy_score(y_test, y_pred)
macro_f1 = f1_score(y_test, y_pred, average="macro")
weighted_f1 = f1_score(y_test, y_pred, average="weighted")

print(f"Accuracy   : {acc * 100:.2f}%")
print(f"Macro F1   : {macro_f1:.4f}")
print(f"Weighted F1: {weighted_f1:.4f}")
print("\nClassification Report (on Test Set):")
print(classification_report(y_test, y_pred, digits=4))
print("Confusion Matrix:")
labels = sorted(list(set(y_test)))
print(pd.DataFrame(confusion_matrix(y_test, y_pred, labels=labels), index=[f"Actual_{l}" for l in labels], columns=[f"Pred_{l}" for l in labels]))

print("\n" + "=" * 70)
print("  5-FOLD CROSS VALIDATION (Full Dataset)")
print("=" * 70)
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
X_all = full_df[core_features].values
y_all = full_df[target_col].values

cv_accs, cv_macro_f1s, cv_low_recalls = [], [], []
for train_idx, val_idx in skf.split(X_all, y_all):
    clf_cv = RandomForestClassifier(n_estimators=100, random_state=42)
    clf_cv.fit(X_all[train_idx], y_all[train_idx])
    y_val_pred = clf_cv.predict(X_all[val_idx])
    cv_accs.append(accuracy_score(y_all[val_idx], y_val_pred))
    cv_macro_f1s.append(f1_score(y_all[val_idx], y_val_pred, average="macro"))
    rep = classification_report(y_all[val_idx], y_val_pred, output_dict=True, zero_division=0)
    cv_low_recalls.append(rep.get("Low", {}).get("recall", 0))

print(f"5-Fold CV Accuracy: {np.mean(cv_accs)*100:.2f}% ± {np.std(cv_accs)*100:.2f}%")
print(f"5-Fold CV Macro F1: {np.mean(cv_macro_f1s):.4f} ± {np.std(cv_macro_f1s):.4f}")
print(f"5-Fold CV Low Recall: {np.mean(cv_low_recalls)*100:.2f}% ± {np.std(cv_low_recalls)*100:.2f}%")
