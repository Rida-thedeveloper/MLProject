import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

# Audio dataset
audio = pd.read_csv(ROOT / "dataset" / "audio_speaking_dataset.csv")
print("=== audio_speaking_dataset.csv ===")
print(f"Shape: {audio.shape}")
print(f"Columns: {audio.columns.tolist()}")
print()
for col in ["target_level", "hesitation_label", "label", "class"]:
    if col in audio.columns:
        print(f"  {col} distribution:")
        print(audio[col].value_counts())
        print()
print("Numeric stats (selected):")
num_cols = [c for c in ["speaking_rate_wpm","pause_count","speech_duration_sec","word_count","overall_score"] if c in audio.columns]
print(audio[num_cols].describe().round(3))

print()
print("=== mockly_training.csv ===")
train = pd.read_csv(ROOT / "dataset" / "mockly_training.csv")
print(f"Shape: {train.shape}")
print(f"Columns: {train.columns.tolist()}")
print()
for col in ["hesitation_label", "label", "target_level", "class"]:
    if col in train.columns:
        print(f"  {col} distribution:")
        print(train[col].value_counts())
        print()
print("NaN counts:")
print(train.isnull().sum())

print()
print("=== mockly_training_balanced_candidate.csv ===")
cand = pd.read_csv(ROOT / "dataset" / "mockly_training_balanced_candidate.csv")
print(f"Shape: {cand.shape}")
print(f"Columns: {cand.columns.tolist()}")
if "hesitation_label" in cand.columns:
    print(cand["hesitation_label"].value_counts())
print()
print("Numeric stats:")
num_cols2 = [c for c in ["wpm","pause_count","speech_duration","word_count"] if c in cand.columns]
print(cand[num_cols2].describe().round(3))

# Check per-class feature means in candidate
print()
print("Per-class means (candidate):")
print(cand.groupby("hesitation_label")[num_cols2].mean().round(3))
