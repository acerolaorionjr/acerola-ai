from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")

def test_public_app_and_sponsor_page_exist():
    assert (ROOT / "index.html").is_file()
    assert (ROOT / "sponsorship.html").is_file()
    assert "Acerola" in read("index.html")
    assert "Sponsorship" in read("sponsorship.html")

def test_gateway_uses_openai_first_and_gemini_as_fallback():
    source = read("supabase/functions/acerola-ai-gateway/index.ts")
    assert 'return "openai"' in source
    assert '["openai","gemini"]' in source
    assert '"gpt-6-astra"' in source
    assert '"gpt-6.1-sol"' in source
    assert '"gpt-6-luna"' in source
    assert '"gemini-3.8-flash"' in source
    assert '"gemini-3.5-flash-lite"' in source

def test_gateway_enforces_durable_monthly_usage_before_provider_calls():
    source = read("supabase/functions/acerola-ai-gateway/index.ts")
    assert "acerola_consume_monthly_request" in source
    assert "MONTHLY_LIMIT_REACHED" in source
    assert "USAGE_SERVICE_UNAVAILABLE" in source
    assert source.index("consumeMonthlyRequest(user.id)") < source.index("async function tryOpenAI")

def test_gateway_keeps_limits_and_authentication():
    source = read("supabase/functions/acerola-ai-gateway/index.ts")
    assert "MAX_ATTACHMENTS = 5" in source
    assert "MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024" in source
    assert "MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024" in source
    assert "Authentication required" in source
    assert "ACEROLA_OWNER_USER_ID" in source
    assert "user_metadata" in source and "app_metadata" in source

def test_chat_worker_verifies_secret_and_does_not_retry_permanent_client_errors():
    source = read("supabase/functions/acerola-chat-worker/index.ts")
    assert "verify_acerola_job_worker_secret" in source
    assert "x-acerola-worker-secret" in source
    assert "NON_RETRYABLE:" in source

def test_payment_webhook_verifies_paystack_signature():
    source = read("supabase/functions/paystack-webhook/index.ts")
    assert "x-paystack-signature" in source.lower()
    assert "hmacSha512" in source
    assert "safeEqual" in source

def test_media_functions_require_authenticated_sessions():
    image = read("supabase/functions/acerola-image/index.ts")
    audio = read("supabase/functions/acerola-audio/index.ts")
    assert "Authentication required" in image
    assert "Authentication required" in audio

def test_pages_workflow_runs_quality_checks_before_deploy():
    source = read(".github/workflows/deploy-pages.yml")
    assert "node --check" in source
    assert "pytest -m 'not live' -q" in source
    assert "deploy-pages@v4" in source
    assert "Verify deployed Pages routes" in source
def test_profile_role_is_server_managed():
    migration = read("supabase/migrations/20261113181431_server_manage_profile_roles.sql")
    assert "enforce_server_managed_profile_role" in migration
    assert "NEW.role := 'user'" in migration
    assert "NEW.role IS DISTINCT FROM OLD.role" in migration
    assert "ERRCODE = '42501'" in migration
