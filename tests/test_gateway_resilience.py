from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GATEWAY = ROOT / "supabase" / "functions" / "acerola-ai-gateway" / "index.ts"


def test_provider_attempts_have_independent_abort_signals():
    source = GATEWAY.read_text(encoding="utf-8")
    assert "function createProviderAttempt()" in source
    assert "attempt.controller.signal" in source
    assert "clearTimeout(attempt.timer)" in source
    assert "clearTimeout(timer)" not in source


def test_provider_fallback_has_a_bounded_total_budget():
    source = GATEWAY.read_text(encoding="utf-8")
    assert "PROVIDER_BUDGET_MS=48000" in source
    assert "PROVIDER_ATTEMPT_TIMEOUT_MS=11500" in source
    assert "Date.now()>=providerDeadline" in source


def test_both_providers_have_a_primary_and_fallback_model():
    source = GATEWAY.read_text(encoding="utf-8")
    assert '["gpt-6-luna",false],["gpt-6.1-sol",false]' in source
    assert '["gpt-6-astra",true],["gpt-6.1-sol",true]' in source
    assert '["gemini-3.8-flash","gemini-3.5-flash-lite"]' in source
    assert '["openai","gemini"]' in source


def test_provider_diagnostics_do_not_log_provider_error_bodies():
    source = GATEWAY.read_text(encoding="utf-8")
    assert 'console.warn("Acerola provider attempt failed"' in source
    assert "error_code:errorCode" in source
    assert 'console.error("Acerola provider failure",id,{provider:lastError?.provider' in source


def test_gateway_health_version_matches_next_deployment():
    source = GATEWAY.read_text(encoding="utf-8")
    assert 'version:"70"' in source
