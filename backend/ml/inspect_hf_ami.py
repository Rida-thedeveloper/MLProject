"""
Inspect hhoangphuoc/ami-disfluency dataset files via HuggingFace API.
"""
import json
import urllib.request

url = "https://huggingface.co/api/datasets/hhoangphuoc/ami-disfluency"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("Dataset info:")
        print("ID:", data.get("id"))
        print("Author:", data.get("author"))
        print("Last modified:", data.get("lastModified"))
        print("Tags:", data.get("tags"))
        print("Siblings (files):")
        for sib in data.get("siblings", []):
            print(" -", sib.get("rfilename"))
except Exception as e:
    print(f"Error: {e}")
