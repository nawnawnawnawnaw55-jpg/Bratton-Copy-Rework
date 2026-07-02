
import urllib.request, os, time, re

base = r"C:\Users\Naw\Desktop\Bratton 2\Project\bratton-pt-v2"

# Find all library mobilear directories
mobilear_dirs = []
for dirpath, dirnames, filenames in os.walk(base):
    if 'library' in dirpath.lower() and 'mobilear' in dirpath.lower():
        rel = os.path.relpath(dirpath, base).replace("\\", "/")
        # Convert to URL path
        url_path = rel.replace("mobilear", "mobilear")
        mobilear_dirs.append((dirpath, rel))

print(f"Found {len(mobilear_dirs)} mobilear directories")

ok = 0
fail = 0
for dirpath, rel in mobilear_dirs[:5]:  # Test first 5
    # Build URL - e.g. library_leg_47/mobilear/
    url_name = rel.replace("\\", "/")
    url = f"https://www.brattonphysicaltherapy.com/{url_name}/"
    time.sleep(10)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=15)
        html = resp.read().decode("utf-8", errors="ignore")
        fp = os.path.join(dirpath, "index.html")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"OK: {rel} ({len(html)}c)")
        ok += 1
    except Exception as e:
        print(f"FAIL: {rel} - {e}")
        fail += 1

print(f"Done: {ok} OK, {fail} FAIL")
