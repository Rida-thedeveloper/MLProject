"""
Fetch AMI official download documentation from Edinburgh.
"""
import urllib.request
import re

url = "https://groups.inf.ed.ac.uk/ami/download/"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode("utf-8", errors="replace")
        print("Title/Headers:")
        for h in re.findall(r'<h[1-3][^>]*>(.*?)</h[1-3]>', html):
            print(" -", h.strip())
        print("\nLinks containing wget or download or zip or tar:")
        for link in re.findall(r'href="([^"]+(?:\.zip|\.tar\.gz|\.sh|\.py|\.shtml))"', html):
            print(" -", link)
except Exception as e:
    print("Error:", e)
