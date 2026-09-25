import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
df = pd.read_csv(ROOT / "dataset" / "mockly_training_balanced.csv")
print("Columns:", df.columns.tolist())
print("\nis_synthetic counts:")
print(df["is_synthetic"].value_counts())
print("\nSynthetic rows shape:", df[df["is_synthetic"] == True].shape)
print("Real rows shape:", df[df["is_synthetic"] == False].shape)
print("\nHesitation label distribution:")
print(df["hesitation_label"].value_counts())
print("\nSynthetic Low sample feature stats:")
synth = df[df["is_synthetic"] == True]
print(synth[["wpm","pause_count","speech_duration","word_count"]].describe().round(3))
