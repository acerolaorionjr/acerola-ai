CREATE OR REPLACE FUNCTION public.create_acerola_chat_job(
  p_user_id uuid,
  p_conversation_id text,
  p_payload jsonb,
  p_access_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_key text;
  v_id uuid;
BEGIN
  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'service role required';
  END IF;

  SELECT decrypted_secret
    INTO v_key
    FROM vault.decrypted_secrets
   WHERE name = 'acerola_job_encryption_key';

  IF v_key IS NULL OR length(p_access_token) < 20 THEN
    RAISE EXCEPTION 'job encryption or access token unavailable';
  END IF;

  INSERT INTO public.acerola_chat_jobs(
    user_id, conversation_id, payload, access_token_encrypted
  )
  VALUES (
    p_user_id,
    left(p_conversation_id, 160),
    p_payload,
    extensions.pgp_sym_encrypt(p_access_token, v_key)
  )
  RETURNING id INTO v_id;

  -- Queue an immediate asynchronous worker wake-up. If pg_net is temporarily
  -- unavailable, the one-minute cron schedule remains the recovery path.
  BEGIN
    PERFORM public.dispatch_acerola_chat_jobs();
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Acerola immediate job dispatch failed; cron fallback will recover: %', SQLERRM;
  END;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_acerola_chat_job(uuid, text, jsonb, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_acerola_chat_job(uuid, text, jsonb, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.finish_acerola_chat_job(
  p_job_id uuid,
  p_response jsonb DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_non_retryable boolean := left(coalesce(p_error, ''), 14) = 'NON_RETRYABLE:';
BEGIN
  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'service role required';
  END IF;

  UPDATE public.acerola_chat_jobs
     SET response = CASE WHEN p_error IS NULL THEN p_response ELSE NULL END,
         error = CASE
           WHEN p_error IS NULL THEN NULL
           WHEN v_non_retryable THEN left(substr(p_error, 15), 1000)
           ELSE left(p_error, 1000)
         END,
         status = CASE
           WHEN p_error IS NULL THEN 'completed'
           WHEN v_non_retryable THEN 'failed'
           WHEN attempts < 3 THEN 'queued'
           ELSE 'failed'
         END,
         claimed_at = NULL,
         updated_at = now(),
         completed_at = CASE
           WHEN p_error IS NULL OR v_non_retryable OR attempts >= 3 THEN now()
           ELSE NULL
         END
   WHERE id = p_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finish_acerola_chat_job(uuid, jsonb, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_acerola_chat_job(uuid, jsonb, text)
  TO service_role;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid
    INTO v_job_id
    FROM cron.job
   WHERE command ILIKE '%dispatch_acerola_chat_jobs%'
   ORDER BY jobid
   LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.alter_job(job_id := v_job_id, schedule := '* * * * *');
  END IF;
END;
$$;
