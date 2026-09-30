"""
Test AMI data access and inspection.
Checks HuggingFace datasets, OpenSLR, and AMI repository.
"""
import sys
import json
import urllib.request
from pathlib import Path

print(f"Python version: {sys.version}")

# Test if datasets / huggingface is installed
try:
    import datasets
    print(f"datasets version: {datasets.__version__}")
except ImportError:
    print("datasets library not installed")

# Test AMI OpenSLR / Edinburgh URLs
urls_to_test = {
    "AMI_OpenSLR_16": "https://www.openslr.org/resources/16/",
    "AMI_Edinburgh_XML": "https://groups.inf.ed.ac.uk/ami/corpus/overview.shtml",
    "AMI_NXT_Annotations": "https://groups.inf.ed.ac.uk/ami/AMIDataAnnotations/ami_public_manual_1.6.2.zip",
    "HuggingFace_AMI_Disfluency": "https://huggingface.co/api/datasets/hhoangphuoc/ami-disfluency",
    "HuggingFace_AMI": "https://huggingface.co/api/datasets/edinburghcstr/ami"
}

for name, url in urls_to_test.items():
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"{name}: HTTP {resp.status} (OK)")
    except Exception as e:
        print(f"{name}: Failed ({e})")
