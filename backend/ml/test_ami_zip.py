"""
Check official AMI XML annotations zip link.
"""
import urllib.request

url = "https://groups.inf.ed.ac.uk/ami/AMICorpusAnnotations/ami_public_manual_1.6.2.zip"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}, method="HEAD")
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print(f"Status: {resp.status}")
        print(f"Content-Length: {resp.headers.get('Content-Length')} bytes (~{int(resp.headers.get('Content-Length',0))/(1024*1024):.2f} MB)")
except Exception as e:
    print("Error:", e)
