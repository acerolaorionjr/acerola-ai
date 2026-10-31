from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def test_gateway_search_detection_keeps_search_for_current_or_sourced_questions():
    source = (ROOT / "supabase/functions/acerola-ai-gateway/index.ts").read_text(encoding="utf-8")
    match = re.search(r"function needsWebSearch\(text:string\)\{return (.*?);\}", source)
    assert match, "search detector should exist"
    detector = match.group(1).lower()
    assert "latest" in detector
    assert "research" in detector
    assert "weather" in detector
    assert "citation" in detector
    assert "compare" not in detector
    assert "|2026|" not in detector


def test_gateway_uses_client_memory_and_bounds_remote_memory_wait():
    source = (ROOT / "supabase/functions/acerola-ai-gateway/index.ts").read_text(encoding="utf-8")
    assert "Array.isArray(body.memories)" in source
    assert "setTimeout(()=>memoryController.abort(),350)" in source
    assert "Server-Timing" in source
    assert "X-Acerola-Provider" in source


def test_reasoning_effort_is_based_on_user_message_not_full_context():
    source = (ROOT / "supabase/functions/acerola-ai-gateway/index.ts").read_text(encoding="utf-8")
    assert "complexityText=\"\"" in source
    assert "String(complexityText||\"\")" in source
    assert "controller.signal,researchMode,message" in source


def test_gateway_client_emits_timing_and_limits_retries():
    source = (ROOT / "agent-core.js").read_text(encoding="utf-8")
    assert "acerola:gateway-timing" in source
    assert "response.headers.get('Server-Timing')" in source
    assert "const maxAttempts = 2;" in source


def test_notification_script_loads_before_account_and_reply_paths_dispatch_event():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert 'src="notifications.js?v=1.0.0-20261031"' in html
    assert html.index('src="notifications.js?v=1.0.0-20261031"') < html.index('src="account-system.js?v=2.2.5-20261031"')
    assert "acerola:reply-ready" in html
    assert "acerola:gateway-timing" in (ROOT / "agent-core.js").read_text(encoding="utf-8")
