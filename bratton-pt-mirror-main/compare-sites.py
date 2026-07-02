"""True comparison: local mirror vs real brattonphysicaltherapy.com"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "comparison"
OUT.mkdir(exist_ok=True)

LOCAL = "http://localhost:8080"
REAL = "https://www.brattonphysicaltherapy.com"

PAGES = ["/", "/services/cupping/", "/about/", "/contact/"]
VIEWPORTS = [
    ("iphone-se", 375, 667, True),
    ("desktop", 1440, 900, False),
]

CHECKS = {
    "body_smartphone": "document.body.className.includes('smartphone')",
    "mobile_menu_visible": "(()=>{const e=document.querySelector('.g5-mobile-menu');return e?window.getComputedStyle(e).display!=='none':null})()",
    "navbar_visible": "(()=>{const e=document.querySelector('#navbar');return e?window.getComputedStyle(e).display!=='none':null})()",
    "hidemobile_visible": "(()=>{const e=document.querySelector('.g5-hidemobile');return e?window.getComputedStyle(e).display!=='none':null})()",
    "logo_found": "!!document.querySelector('img[src*=\"BRATTON\"]')",
    "address_found": "!!document.querySelector('.rfa_4031')",
    "body_classes": "document.body.className",
}

MOBILE_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36"
DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


async def check_site(page, url, vp_name, vp_w, vp_h, is_mob, label):
    ua = MOBILE_UA if is_mob else DESKTOP_UA
    await page.set_extra_http_headers({"User-Agent": ua})
    await page.set_viewport_size({"width": vp_w, "height": vp_h})

    print(f"  {label} at {vp_name} ({vp_w}x{vp_h})...", end=" ", flush=True)

    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2000)
    except Exception as e:
        print(f"LOAD ERROR: {e}")
        return {"error": str(e), "console_errors": errors[:5]}

    body_ok = await page.evaluate("!!document.body")
    if not body_ok:
        print("BODY NULL")
        return {"error": "body is null", "console_errors": errors[:5]}

    results = {}
    for name, js in CHECKS.items():
        try:
            val = await page.evaluate(js)
            results[name] = val
        except Exception as e:
            results[name] = f"ERR: {e}"

    results["console_errors"] = errors[:3]
    print(f"{len(errors)} JS errors" if errors else "OK")
    return results


async def main():
    print("=" * 65)
    print("  Side-by-Side: Local Mirror vs Real brattonphysicaltherapy.com")
    print("=" * 65)

    # Check local server
    import urllib.request
    try:
        urllib.request.urlopen(f"{LOCAL}/", timeout=5)
        print(f"Local server OK\n")
    except:
        print("ERROR: Start local server first: python -m http.server 8080")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        all_diffs = {}

        for path in PAGES:
            name = path.strip("/") or "homepage"
            print(f"--- {name} ---")
            all_diffs[name] = {}

            for vp_name, vp_w, vp_h, is_mob in VIEWPORTS:
                # Local
                ctx_l = await browser.new_context()
                page_l = await ctx_l.new_page()
                local_r = await check_site(page_l, f"{LOCAL}{path}", vp_name, vp_w, vp_h, is_mob, "LOCAL")
                await ctx_l.close()

                # Real
                ctx_r = await browser.new_context()
                page_r = await ctx_r.new_page()
                real_r = await check_site(page_r, f"{REAL}{path}", vp_name, vp_w, vp_h, is_mob, "REAL ")
                await ctx_r.close()

                # Compare
                diffs = []
                if "error" in local_r:
                    diffs.append(f"LOCAL ERROR: {local_r['error']}")
                if "error" in real_r:
                    diffs.append(f"REAL ERROR: {real_r['error']}")

                if "error" not in local_r and "error" not in real_r:
                    for key in ["body_smartphone", "mobile_menu_visible", "navbar_visible",
                                "hidemobile_visible", "logo_found", "address_found"]:
                        lv = local_r.get(key)
                        rv = real_r.get(key)
                        if lv != rv:
                            diffs.append(f"{key}: local={lv}, real={rv}")

                all_diffs[name][vp_name] = {
                    "local": {k: v for k, v in local_r.items() if k != "body_classes"},
                    "real": {k: v for k, v in real_r.items() if k != "body_classes"},
                    "diffs": diffs
                }

                if diffs:
                    for d in diffs:
                        print(f"    DIFF: {d}")
                else:
                    print(f"    MATCH")
            print()

        await browser.close()

    # Summary
    print("=" * 65)
    total = sum(len(v["diffs"]) for p in all_diffs.values() for v in p.values())
    if total == 0:
        print("ALL MATCH — local mirror identical to real site!")
    else:
        print(f"{total} DIFFERENCES found:")
        for page, vps in all_diffs.items():
            for vp, data in vps.items():
                if data["diffs"]:
                    print(f"  {page} @ {vp}:")
                    for d in data["diffs"]:
                        print(f"    {d}")

    (OUT / "real-vs-local.json").write_text(json.dumps(all_diffs, indent=2, default=str))
    print(f"\nFull results: {OUT}/real-vs-local.json")


if __name__ == "__main__":
    asyncio.run(main())
