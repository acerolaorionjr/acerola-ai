import os
import subprocess
import sys
import time
from pathlib import Path

import pytest
import requests
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SUPABASE_URL = "https://djumpimcwzhjujysznox.supabase.co"
SUPABASE_KEY = "sb_publishable_c34TkPz6oG437WYMSPAKww_T5mFZPy7"


@pytest.fixture(scope="session")
def site_server():
    proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", "5173", "--bind", "127.0.0.1"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        time.sleep(0.8)
        yield "http://localhost:5173"
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


@pytest.fixture
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        try:
            yield b
        finally:
            b.close()


def test_account_button_binds_after_supabase_bootstrap(site_server, browser):
    page = browser.new_page()
    page.goto(site_server + "/index.html?smoke=account", wait_until="domcontentloaded", timeout=30000)
    page.locator("#menu").click()
    page.wait_for_function(
        "() => document.querySelector('#accountBtn') && (document.querySelector('#accountBtn').onclick || document.querySelector('.account-sheet'))",
        timeout=20000,
    )
    page.locator("#accountBtn").scroll_into_view_if_needed()
    page.locator("#accountBtn").click()
    page.locator(".account-sheet.open").wait_for(timeout=5000)


def test_browser_can_reach_gateway_without_ai_generation(site_server, browser):
    # Check DNS/TLS/reachability outside the browser first. This separates an
    # unavailable Supabase project/hostname from a browser-only CORS failure.
    gateway_url = SUPABASE_URL + "/functions/v1/acerola-ai-gateway"
    try:
        preflight = requests.get(gateway_url, timeout=12)
    except requests.exceptions.RequestException as exc:
        pytest.fail(
            "Supabase gateway endpoint is unreachable before browser testing. "
            f"URL={gateway_url}; error_type={type(exc).__name__}; error={exc}. "
            "Check that the Supabase project is active and its project URL resolves. "
            "Do not weaken the browser test to hide this outage."
        )
    # A missing JWT is expected here; any HTTP response proves the hostname and
    # TLS route are reachable. Authentication and CORS are tested in Chromium.
    assert preflight.status_code in range(100, 600)

    page = browser.new_page()
    browser_errors = []
    failed_requests = []
    page.on("pageerror", lambda error: browser_errors.append(f"{error.name}: {error.message}"))
    page.on("console", lambda message: browser_errors.append(message.text) if message.type == "error" else None)
    page.on(
        "requestfailed",
        lambda request: failed_requests.append(
            f"{request.method} {request.url}: {request.failure}"
        ),
    )
    page.goto(site_server + "/index.html?smoke=gateway", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_function(
        "() => !!window.supabase?.createClient",
        timeout=15000,
    )
    try:
        result = page.evaluate(
            """async () => {
              const url = 'https://djumpimcwzhjujysznox.supabase.co';
              const key = 'sb_publishable_c34TkPz6oG437WYMSPAKww_T5mFZPy7';
              if (!window.supabase?.createClient) throw new Error('Supabase client did not load');
              const db = window.supabase.createClient(url, key);
              let { data: { session }, error: sessionError } = await db.auth.getSession();
              if (sessionError) throw new Error('getSession failed: ' + sessionError.message);
              if (!session) {
                const r = await db.auth.signInAnonymously();
                if (r.error) throw new Error('Anonymous sign-in failed: ' + r.error.message);
                session = r.data.session;
              }
              if (!session?.access_token) throw new Error('No anonymous session token');
              let lastError;
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  const r = await fetch(url + '/functions/v1/acerola-ai-gateway', {
                    method: 'GET',
                    headers: {
                      'apikey': key,
                      'Authorization': 'Bearer ' + session.access_token
                    }
                  });
                  const body = await r.json().catch(() => ({}));
                  return { status: r.status, ok: body?.ok === true && body?.status === 'online', code: body?.code || null };
                } catch (error) {
                  lastError = error;
                  if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 700));
                }
              }
              throw new Error('Gateway fetch failed after 3 attempts: ' + (lastError?.name || 'Error') + ': ' + (lastError?.message || 'unknown error'));
            }"""
        )
    except Exception as exc:
        pytest.fail(
            f"Browser gateway check failed after direct endpoint reachability succeeded: {exc}. "
            f"Failed requests: {failed_requests or 'none captured'}. "
            f"Browser errors: {browser_errors or 'none captured'}. "
            "Investigate CORS, anonymous authentication, and gateway deployment."
        )
    assert result["status"] == 200, result
    assert result["ok"] is True, result


def test_only_one_loading_indicator_is_created(site_server, browser):
    page = browser.new_page()
    browser_errors = []
    page.on("pageerror", lambda error: browser_errors.append(f"pageerror: {error.name}: {error.message}"))
    page.on("console", lambda message: browser_errors.append(f"console error: {message.text}") if message.type == "error" else None)
    page.goto(site_server + "/index.html?smoke=loader", wait_until="domcontentloaded", timeout=30000)
    page.evaluate(
        """() => {
          window.AcerolaEngine = class {
            async initialize() {}
            async run() {
              await new Promise(r => setTimeout(r, 150));
              return { ok: true, reply: 'Smoke test response.' };
            }
            recordAssistant() {}
          };
          const input = document.querySelector('#input');
          input.value = 'Smoke test';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('#send').click();
        }"""
    )
    try:
        page.locator(".row.assistant .bubble").wait_for(timeout=10000)
    except Exception:
        pytest.fail("Assistant reply never rendered. Browser errors: " + (" | ".join(browser_errors) if browser_errors else "none captured"))
    assert page.locator(".typing-row").count() == 0
    assert page.locator(".engine-progress").count() == 0
