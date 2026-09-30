"""
Download and inspect dsfl-segments-info.csv from AMI disfluency dataset.
"""
import urllib.request
import pandas as pd
import io

url = "https://huggingface.co/datasets/hhoangphuoc/ami-disfluency/raw/main/dsfl-segments-info.csv"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        content = resp.read()
        df = pd.read_csv(io.BytesIO(content))
        print("CSV Shape:", df.shape)
        print("Columns:", df.columns.tolist())
        print("\nHead(10):")
        print(df.head(10))
        print("\nDisfluency type value counts (if exists):")
        for col in df.columns:
            if df[col].dtype == object or df[col].nunique() < 20:
                print(f"--- {col} ---")
                print(df[col].value_counts().head(10))
except Exception as e:
    print("Error:", e)
