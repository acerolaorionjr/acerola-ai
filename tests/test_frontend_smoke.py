import http.server
import os
import socketserver
import subprocess
import threading
import time
from pathlib import Path

import pytest

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None


pytestmark = pytest.mark.e2e


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


@pytest.fixture(scope="module")
def local_site():
    root = Path(__file__).resolve().parents[1]
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(root), **kwargs)
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as server:
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{port}/"
        finally:
            server.shutdown()
            thread.join(timeout=2)


@pytest.mark.skipif(sync_playwright is None, reason="Playwright is not installed")
def test_mobile_shell_and_controls_are_live(local_site):
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = browser.new_context(
            viewport={"width": 360, "height": 740},
            screen={"width": 360, "height": 740},
            is_mobile=True,
            has_touch=True,
            service_workers="block",
        )
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(f"{error.name}: {error.message}"))

        def route(request):
            # The shell must remain functional even when optional external
            # providers/CDNs are unavailable. Local Acerola assets continue.
            if request.request.url.startswith(local_site):
                request.continue_()
            else:
                request.abort()

        page.route("**/*", route)
        page.goto(local_site + "index.html", wait_until="domcontentloaded", timeout=15000)

        page.locator("#input").wait_for(state="visible", timeout=5000)
        page.locator("#send").wait_for(state="visible", timeout=5000)

        assert page.locator(".welcome h1").inner_text() == "What can I help you with?"
        assert page.evaluate("typeof window.acerolaSend") == "function"
        assert page.evaluate("typeof window.AcerolaEngine") == "function"

        # The home screen is intentionally minimal; capabilities live in the drawer.
        assert page.locator(".ac-cap").count() == 0
        assert page.locator(".drawer-nav button").count() >= 6

        # Mobile navigation must receive the touch/click and open the drawer.
        page.locator("#menu").click()
        assert page.locator("#drawer").evaluate("(el) => el.classList.contains('open')")
        page.locator("#drawerClose").click()

        # The composer must accept a real message and the send control must
        # execute its handler synchronously before any network request.
        page.locator("#input").fill("smoke test")
        page.locator("#send").click()
        assert "smoke test" in page.locator(".row.user .bubble").last.inner_text()

        # No synchronous startup/runtime error is allowed.
        assert not errors, "Acerola page errors: " + " | ".join(errors)

        context.close()
        browser.close()
