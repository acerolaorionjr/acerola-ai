from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_durable_chat_job_functions_are_present_and_private():
    sql = (ROOT / "supabase/migrations/20261101124719_add_durable_acerola_chat_jobs.sql").read_text()
    assert "create table if not exists public.acerola_chat_jobs" in sql
    assert "enable row level security" in sql
    assert "acerola_push_subscriptions_user_idx" in (ROOT / "supabase/migrations/20261101130306_index_acerola_push_subscriptions_by_user.sql").read_text()
    assert "pgp_sym_encrypt" in sql
    assert "for update skip locked" in sql
    assert "revoke all on function public.claim_acerola_chat_jobs" in sql
    assert "cron.schedule('acerola-chat-worker','10 seconds'" in sql


def test_job_api_requires_authenticated_user_and_limits_attachments():
    source = (ROOT / "supabase/functions/acerola-chat-jobs/index.ts").read_text()
    assert "/auth/v1/user" in source
    assert "create_acerola_chat_job" in source
    assert "20 * 1024 * 1024" in source


def test_worker_verifies_secret_and_calls_gateway():
    source = (ROOT / "supabase/functions/acerola-chat-worker/index.ts").read_text()
    assert "verify_acerola_job_worker_secret" in source
    assert "claim_acerola_chat_jobs" in source
    assert "/functions/v1/acerola-ai-gateway" in source
    assert "finish_acerola_chat_job" in source


def test_background_chat_client_persists_and_resumes_job_ids():
    source = (ROOT / "index.html").read_text()
    assert "acerola:pending-chat-jobs-v1" in source
    assert "resumePendingBackgroundJobs()" in source
    assert "acerola-chat-jobs" in source
    assert "shouldQueueBackground(text,selected)" in source

def test_web_push_keys_and_subscriptions_are_server_managed():
    sql = (ROOT / "supabase/migrations/20261101125640_add_acerola_web_push_subscriptions.sql").read_text()
    jobs = (ROOT / "supabase/functions/acerola-chat-jobs/index.ts").read_text()
    worker = (ROOT / "supabase/functions/acerola-chat-worker/index.ts").read_text()
    index = (ROOT / "index.html").read_text()
    sw = (ROOT / "sw.js").read_text()
    assert "enable row level security" in sql
    assert "vault.create_secret" in sql
    assert "action === \"subscribe\"" in jobs
    assert "generateVAPIDKeys" in jobs
    assert "sendNotification" in worker
    assert "acerolaEnablePush" in index
    assert "self.addEventListener('push'" in sw
