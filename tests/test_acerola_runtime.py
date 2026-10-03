import os
import subprocess
import sys
import time
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


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
    page = browser.new_page()
    page.goto(site_server + "/index.html?smoke=gateway", wait_until="domcontentloaded", timeout=30000)
    # Supabase is intentionally loaded through a resilient CDN bootstrap on the
    # static site. Wait for that bootstrap instead of assuming it is synchronous.
    page.wait_for_function(
        "() => !!window.supabase?.createClient",
        timeout=15000,
    )
    result = page.evaluate(
        """async () => {
          const url = 'https://djumpimcwzhjujysznox.supabase.co';
          const key = 'sb_publishable_c34TkPz6oG437WYMSPAKww_T5mFZPy7';
          if (!window.supabase?.createClient) throw new Error('Supabase client did not load');
          const db = window.supabase.createClient(url, key);
          let { data: { session } } = await db.auth.getSession();
          if (!session) {
            const r = await db.auth.signInAnonymously();
            if (r.error) throw new Error(r.error.message);
            session = r.data.session;
          }
          if (!session?.access_token) throw new Error('No anonymous session token');
          const r = await fetch(url + '/functions/v1/acerola-ai-gateway', {
            method: 'GET',
            headers: {
              'apikey': key,
              'Authorization': 'Bearer ' + session.access_token
            }
          });
          const body = await r.json().catch(() => ({}));
          return { status: r.status, ok: body?.ok === true && body?.status === 'online', code: body?.code || null };
        }"""
    )
    assert result["status"] == 200, result
    assert result["ok"] is True, result


def test_only_one_loading_indicator_is_created(site_server, browser):
    page = browser.new_page()
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
    page.locator(".row.assistant .bubble").wait_for(timeout=10000)
    assert page.locator(".typing-row").count() == 0
    assert page.locator(".engine-progress").count() == 0
