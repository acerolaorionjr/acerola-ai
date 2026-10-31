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


def test_gateway_bounds_authenticated_remote_memory_wait():
    source = (ROOT / "supabase/functions/acerola-ai-gateway/index.ts").read_text(encoding="utf-8")
    assert "user_id=eq.${encodeURIComponent(user.id)}" in source
    assert "Array.isArray(body.memories)" not in source
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



def test_gateway_streams_direct_openai_replies_as_server_sent_events():
    source = (ROOT / "supabase/functions/acerola-ai-gateway/index.ts").read_text(encoding="utf-8")
    assert "streamResponse=false" in source
    assert "if(streamResponse)body.stream=true" in source
    assert "message,!Boolean(body.agent_mode)" in source
    assert 'provider==="openai"&&!body.agent_mode&&upstream.body' in source
    assert '"Content-Type":"text/event-stream; charset=utf-8"' in source


def test_browser_consumes_stream_deltas_and_renders_progressively():
    core = (ROOT / "agent-core.js").read_text(encoding="utf-8")
    runtime = (ROOT / "engine-runtime.js").read_text(encoding="utf-8")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "response.output_text.delta" in core
    assert "acerola:stream-delta" in core
    assert "disable_stream: true" in core
    assert "acerola:stream-reset" in core
    assert "needsAgentTools" in runtime
    assert "agent_mode: false" in runtime
    assert "acerola:stream-delta" in html
    assert "streaming-preview" in html


def test_streaming_scripts_use_fresh_cache_versions():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "agent-core.js?v=1.6.4-20261031" in html
    assert "engine-runtime.js?v=0.9.4-20261031" in html



def test_local_action_results_render_as_human_readable_text():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "value.action==='calculator.calculate'" in html
    assert "String(value.result.expression)+' = '+String(value.result.result)" in html
    assert "return 'Opened the '+String(value.result?.module||'requested')+' module.'" in html



def test_local_time_intent_accepts_natural_question_wording():
    source = (ROOT / "agent-core.js").read_text(encoding="utf-8")
    assert r"(?:current\s+)?time(?:\s+is\s+it)?" in source
