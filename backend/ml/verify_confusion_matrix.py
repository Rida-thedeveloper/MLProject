import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
from sklearn.model_selection import StratifiedKFold

BASE_DIR = r"C:\Users\MMC\.gemini\antigravity\scratch\Mockly\dataset"

full_df = pd.read_csv(os.path.join(BASE_DIR, "mockly_hesitation_dataset_new.csv"))
train_df = pd.read_csv(os.path.join(BASE_DIR, "mockly_train_new.csv"))
test_df = pd.read_csv(os.path.join(BASE_DIR, "mockly_test_new.csv"))

features = ["wpm", "pause_count", "speech_duration", "word_count"]
target = "hesitation_label"
classes = ["Low", "Medium", "High"]

# 1. Train on train_df, evaluate on test_df
X_train = train_df[features]
y_train = train_df[target]
X_test = test_df[features]
y_test = test_df[target]

clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

train_pred = clf.predict(X_train)
test_pred = clf.predict(X_test)

train_acc = accuracy_score(y_train, train_pred)
test_acc = accuracy_score(y_test, test_pred)

cm_test = confusion_matrix(y_test, test_pred, labels=classes)
cm_test_norm = cm_test.astype('float') / cm_test.sum(axis=1)[:, np.newaxis] * 100

print("=" * 70)
print("  1. CONFUSION MATRIX ON UNSEEN TEST SET (600 Samples: 200 per class)")
print("=" * 70)
print("Raw Counts:")
df_cm = pd.DataFrame(cm_test, index=[f"Actual {c}" for c in classes], columns=[f"Predicted {c}" for c in classes])
print(df_cm)

print("\nPercentage (%):")
df_cm_norm = pd.DataFrame(cm_test_norm.round(1), index=[f"Actual {c}" for c in classes], columns=[f"Predicted {c} (%)" for c in classes])
print(df_cm_norm)

print(f"\nTrain Accuracy: {train_acc*100:.2f}% | Test Accuracy: {test_acc*100:.2f}%")

print("\nDetailed Per-Class Metrics on Test Set:")
print(classification_report(y_test, test_pred, labels=classes, digits=4))

# 2. 5-Fold Stratified Cross Validation Confusion Matrix (Summed across all 3,000 samples)
print("=" * 70)
print("  2. CONFUSION MATRIX ACROSS 5-FOLD CV (All 3,000 Samples)")
print("=" * 70)

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
X_all = full_df[features].values
y_all = full_df[target].values

cm_cv_total = np.zeros((3, 3), dtype=int)
fold_recalls = {"Low": [], "Medium": [], "High": []}
fold_accs = []

for fold_idx, (tr_idx, val_idx) in enumerate(skf.split(X_all, y_all), 1):
    m = RandomForestClassifier(n_estimators=100, random_state=42)
    m.fit(X_all[tr_idx], y_all[tr_idx])
    preds = m.predict(X_all[val_idx])
    
    cm_f = confusion_matrix(y_all[val_idx], preds, labels=classes)
    cm_cv_total += cm_f
    
    acc_f = accuracy_score(y_all[val_idx], preds)
    fold_accs.append(acc_f)
    
    rep_f = classification_report(y_all[val_idx], preds, labels=classes, output_dict=True, zero_division=0)
    for c in classes:
        fold_recalls[c].append(rep_f[c]["recall"])
    
    print(f"Fold {fold_idx}: Acc={acc_f*100:.2f}% | Low Recall={rep_f['Low']['recall']*100:.1f}% | Med Recall={rep_f['Medium']['recall']*100:.1f}% | High Recall={rep_f['High']['recall']*100:.1f}%")

print("\nSummed 5-Fold Confusion Matrix (3,000 Total Samples):")
df_cm_cv = pd.DataFrame(cm_cv_total, index=[f"Actual {c}" for c in classes], columns=[f"Predicted {c}" for c in classes])
print(df_cm_cv)

print("\nSummed 5-Fold Confusion Matrix Percentage (%):")
cm_cv_norm = cm_cv_total.astype('float') / cm_cv_total.sum(axis=1)[:, np.newaxis] * 100
df_cm_cv_norm = pd.DataFrame(cm_cv_norm.round(2), index=[f"Actual {c}" for c in classes], columns=[f"Predicted {c} (%)" for c in classes])
print(df_cm_cv_norm)

print("\n" + "=" * 70)
print("  3. FEATURE IMPORTANCES (Random Forest)")
print("=" * 70)
for feat, imp in sorted(zip(features, clf.feature_importances_), key=lambda x: x[1], reverse=True):
    print(f"  {feat:20s}: {imp*100:.2f}%")
