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
        page.on("pageerror", lambda error: errors.append(f"pageerror: {error.name}: {error.message}"))
        page.on("console", lambda message: errors.append(f"console error: {message.text}") if message.type == "error" and "Failed to load resource: net::ERR_FAILED" not in message.text else None)

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

        try:
            page.locator(".welcome h1").wait_for(state="visible", timeout=5000)
        except Exception:
            pytest.fail("Welcome heading did not render. Browser errors: " + (" | ".join(errors) if errors else "none captured"))
        assert page.locator(".welcome h1").inner_text() == "What can I help you with?"
        assert page.evaluate("typeof window.acerolaSend") == "function"
        assert page.evaluate("typeof window.AcerolaEngine") == "function"

        # The home screen is intentionally minimal; capabilities live in the drawer.
        assert page.locator(".ac-cap").count() == 0
        assert page.locator('#newChat, .new-chat, [data-action="new-chat"], button:has-text("New chat")').count() >= 1

        # Mobile navigation must receive the touch/click and open the drawer.
        page.locator("#menu").click()
        assert page.locator("#drawer").evaluate("(el) => el.classList.contains('open')")
        page.locator("#drawerClose").click()

        # The composer must accept a real message and the send control must
        # execute its handler synchronously before any network request.
        page.locator("#input").fill("smoke test")
        page.locator("#send").click()
        assert "smoke test" in page.locator(".row.user .bubble").last.inner_text()

        # ChatGPT-style message actions should be present and usable.
        user_row = page.locator(".row.user").last
        user_row.locator(".message-actions").wait_for(state="visible", timeout=3000)
        assert user_row.locator('[data-message-action="copy"]').count() == 1
        assert user_row.locator('[data-message-action="edit"]').count() == 1
        assert user_row.locator('[data-message-action="share"]').count() == 1
        user_row.locator(".bubble").dispatch_event("contextmenu", {"clientX": 24, "clientY": 24})
        assert page.locator(".chat-message-menu button[data-a='edit']").count() == 1
        assert page.locator(".chat-message-menu button[data-a='copy']").count() == 1
        page.locator("#drawerClose").click()
        page.locator("#menu").click()
        page.locator(".drawer-search").click()
        search = page.locator(".chat-search-input")
        search.wait_for(state="visible", timeout=2000)
        search.fill("smoke test")
        assert page.locator(".chat-item:visible").count() >= 1
        search.fill("query-that-does-not-match")
        assert page.locator(".chat-item:visible").count() == 0
        search.press("Escape")

        # No synchronous startup/runtime error is allowed.
        assert not errors, "Acerola page errors: " + " | ".join(errors)

        context.close()
        browser.close()
