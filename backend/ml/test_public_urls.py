"""
Test public unauthenticated speech datasets:
1. OpenSLR 16 (AMI Corpus transcripts/annotations)
2. Edinburgh AMI transcripts direct
3. Switchboard Disfluency Github open data
4. Buckeye / L2-ARCTIC HuggingFace open data
"""
import urllib.request
import json

urls = [
    ("AMI_SLR16_transcripts", "https://www.openslr.org/resources/16/ami_public_manual_1.6.2.zip"),
    ("AMI_Edinburgh_word_level", "https://groups.inf.ed.ac.uk/ami/AMIDataAnnotations/ami_public_manual_1.6.2_extracted.zip"),
    ("Switchboard_Disfluency_Open", "https://raw.githubusercontent.com/parlance-scribe/parlance/master/parlance/data/swbd_disfluency.json"),
    ("L2_ARCTIC_Open", "https://psi.engr.tamu.edu/wp-content/uploads/2020/07/L2-ARCTIC-corpus.zip"),
]

for name, u in urls:
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}, method="HEAD")
        with urllib.request.urlopen(req, timeout=8) as r:
            print(f"{name}: Status {r.status}, Content-Length: {r.headers.get('Content-Length')}")
    except Exception as e:
        print(f"{name}: Failed ({e})")
