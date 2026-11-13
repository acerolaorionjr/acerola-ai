from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def isolate_backend(page):
    # Browser smoke tests validate the static shell only; never call production APIs.
    page.route("https://djumpimcwzhjujysznox.supabase.co/**", lambda route: route.abort())

@pytest.fixture(scope="module")
def local_site():
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/"
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()

def test_homepage_renders_in_chromium(local_site):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        isolate_backend(page)
        page.goto(local_site, wait_until="domcontentloaded", timeout=30000)
        assert page.title().startswith("Acerola")
        assert page.locator("#app").count() == 1
        assert page.locator("#messages").count() == 1
        assert page.locator("#input").count() == 1
        assert page.locator("#send").count() == 1
        assert page.locator("#app").is_visible()
        browser.close()

def test_homepage_fits_a_mobile_viewport(local_site):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True)
        isolate_backend(page)
        page.goto(local_site, wait_until="domcontentloaded", timeout=30000)
        assert page.locator("#app").is_visible()
        assert page.locator("#send").is_visible()
        overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
        assert overflow is False
        browser.close()

def test_sponsorship_page_renders_in_chromium(local_site):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        isolate_backend(page)
        page.goto(local_site + "sponsorship.html", wait_until="domcontentloaded", timeout=30000)
        assert "Sponsor Acerola" in page.title()
        assert page.get_by_role("heading", name="Your Personal").count() == 1
        assert page.get_by_text("Sponsorship opportunity").count() >= 1
        browser.close()
