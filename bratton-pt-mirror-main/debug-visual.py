"""Visual debug — opens browser so you can see what's wrong.
Usage: python debug-visual.py [url]
  Default: http://localhost:8080/
  python debug-visual.py /services/cupping/
"""
import asyncio, sys
from playwright.async_api import async_playwright

LOCAL = "http://localhost:8080"

def analyze(page):
    """Print DOM analysis for debugging."""
    info = {}
    
    # Check all nav/menu elements
    for sel, label in [
        (".g5-mobile-menu", "Mobile menu (black bar)"),
        ("#navbar", "Desktop navbar"),
        (".g5-quickaccess", "Quick-access panel"),
        (".g5-hidemobile", "Orange bars (g5-hidemobile)"),
        ("header", "Header"),
        ("#offcanvas-menu", "Offcanvas menu"),
    ]:
        el = page.query_selector(sel)
        if el:
            display = page.evaluate(f"window.getComputedStyle(document.querySelector('{sel}')).display")
            visible = page.evaluate(f"document.querySelector('{sel}').offsetParent !== null")
            rect = page.evaluate(f"""
                const e = document.querySelector('{sel}');
                const r = e.getBoundingClientRect();
                return {{x: r.x, y: r.y, w: r.width, h: r.height}};
            """)
            info[label] = f"display={display}, visible={visible}, rect={rect}"
        else:
            info[label] = "NOT FOUND"
    
    # Check body height vs viewport
    body_h = page.evaluate("document.body.scrollHeight")
    vp_h = page.evaluate("window.innerHeight")
    info["Body/Viewport"] = f"body={body_h}px, viewport={vp_h}px"
    
    # Count visible nav elements
    nav_count = page.evaluate("""
        const navs = document.querySelectorAll('nav, .g5-mobile-menu, .uk-navbar');
        let visible = 0;
        navs.forEach(n => { if(n.offsetParent !== null) visible++; });
        return visible;
    """)
    info["Visible nav elements"] = nav_count
    
    return info


async def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "/"
    url = f"{LOCAL}{path}" if path.startswith("/") else f"{LOCAL}/{path}"
    
    async with async_playwright() as p:
        # Mobile view
        print("=" * 60)
        print("  MOBILE VIEW (375x667)")
        print("=" * 60)
        browser = await p.chromium.launch(headless=False, slow_mo=100)
        ctx = await browser.new_context(
            viewport={"width": 375, "height": 667},
            user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36"
        )
        page = await ctx.new_page()
        await page.goto(url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        
        info = analyze(page)
        print(f"\\nURL: {url}")
        for k, v in info.items():
            print(f"  {k}: {v}")
        
        print(f"\\n  [Browser open — inspect the page, then close the browser window]")
        print(f"  [Waiting for you to close the browser...]")
        
        await page.wait_for_timeout(999999)  # wait forever until user closes
        await ctx.close()

if __name__ == "__main__":
    asyncio.run(main())
