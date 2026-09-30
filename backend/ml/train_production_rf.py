"""
Train production Random Forest model on the new verified balanced dataset.
Saves to: backend/ml/models/hesitation_rf_v2.joblib
Updates: dataset/mockly_training.csv (with original backup preserved)
"""
import os
import shutil
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, f1_score

# ── Paths ─────────────────────────────────────────────────────────
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATASET_DIR = os.path.join(ROOT, "dataset")
MODELS_DIR = os.path.join(ROOT, "backend", "ml", "models")

SOURCE_DATASET = os.path.join(DATASET_DIR, "mockly_hesitation_dataset_new.csv")
MASTER_DATASET = os.path.join(DATASET_DIR, "mockly_training.csv")
BACKUP_DATASET = os.path.join(DATASET_DIR, "mockly_training_legacy_v1_backup.csv")

PRODUCTION_MODEL_PATH = os.path.join(MODELS_DIR, "hesitation_rf_v2.joblib")
MODEL_BACKUP_PATH = os.path.join(MODELS_DIR, "hesitation_rf_v2_legacy_backup.joblib")

FEATURES = ["wpm", "pause_count", "speech_duration", "word_count"]
TARGET = "hesitation_label"

print("=" * 70)
print("  MOCKLY PRODUCTION MODEL RETRAINING")
print("=" * 70)

# Step 1: Backup legacy dataset & model if not already backed up
if os.path.exists(MASTER_DATASET) and not os.path.exists(BACKUP_DATASET):
    shutil.copy2(MASTER_DATASET, BACKUP_DATASET)
    print(f"Backed up legacy dataset to: {BACKUP_DATASET}")

if os.path.exists(PRODUCTION_MODEL_PATH) and not os.path.exists(MODEL_BACKUP_PATH):
    shutil.copy2(PRODUCTION_MODEL_PATH, MODEL_BACKUP_PATH)
    print(f"Backed up legacy model to: {MODEL_BACKUP_PATH}")

# Step 2: Set the new verified dataset as the master dataset
shutil.copy2(SOURCE_DATASET, MASTER_DATASET)
print(f"Updated master dataset: {MASTER_DATASET} (from {SOURCE_DATASET})")

df = pd.read_csv(MASTER_DATASET)
print(f"Loaded master dataset: {len(df)} rows")
print("Class Distribution:")
print(df[TARGET].value_counts().sort_index())

# Step 3: Train Random Forest on full 3,000 balanced rows
X = df[FEATURES]
y = df[TARGET]

clf = RandomForestClassifier(
    n_estimators=100,
    max_depth=None,
    min_samples_split=2,
    min_samples_leaf=1,
    random_state=42
)
clf.fit(X, y)

train_preds = clf.predict(X)
train_acc = accuracy_score(y, train_preds)
print(f"\nTraining complete. Training Accuracy: {train_acc*100:.2f}%")
print("\nClassification Report (Full Dataset):")
print(classification_report(y, train_preds, digits=4))

# Step 4: Save Model Bundle for predict.py
model_bundle = {
    "model": clf,
    "features": FEATURES,
    "classes": list(clf.classes_),
    "trained_at": datetime.now(timezone.utc).isoformat(),
    "n_samples": len(df),
    "dataset": "mockly_hesitation_dataset_new.csv (Balanced 3000 rows)",
    "metrics": {
        "training_accuracy": round(train_acc, 4),
        "classes": list(clf.classes_)
    }
}

joblib.dump(model_bundle, PRODUCTION_MODEL_PATH)
print(f"\nSaved production model to: {PRODUCTION_MODEL_PATH}")

# Step 5: Test Model with Sample Inputs
print("\n" + "=" * 70)
print("  SELF-TESTING PREDICTION FUNCTIONALITY")
print("=" * 70)

test_samples = [
    {"desc": "Fluent / Fast speaker", "wpm": 155, "pause_count": 2, "speech_duration": 45.0, "word_count": 116},
    {"desc": "Normal conversational speaker", "wpm": 120, "pause_count": 5, "speech_duration": 45.0, "word_count": 90},
    {"desc": "Hesitant / Frequent pauses", "wpm": 80, "pause_count": 12, "speech_duration": 45.0, "word_count": 60},
]

for sample in test_samples:
    row_df = pd.DataFrame([[sample[f] for f in FEATURES]], columns=FEATURES)
    pred = clf.predict(row_df)[0]
    probs = {cls: round(float(p), 4) for cls, p in zip(clf.classes_, clf.predict_proba(row_df)[0])}
    print(f"Input: {sample['desc']}")
    print(f"  Features: WPM={sample['wpm']}, Pauses={sample['pause_count']}, Words={sample['word_count']}")
    print(f"  --> Prediction: {pred} | Probabilities: {probs}\n")

print("Production model deployment completed successfully!")
