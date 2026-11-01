-- Durable background replies for Acerola.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.acerola_chat_jobs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 conversation_id text not null,
 payload jsonb not null,
 access_token_encrypted bytea not null,
 status text not null default 'queued' check(status in ('queued','running','completed','failed')),
 response jsonb,
 error text,
 attempts integer not null default 0 check(attempts>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 claimed_at timestamptz,
 completed_at timestamptz
);
create index if not exists acerola_chat_jobs_user_created_idx on public.acerola_chat_jobs(user_id,created_at desc);
create index if not exists acerola_chat_jobs_queue_idx on public.acerola_chat_jobs(status,created_at) where status in ('queued','running');
alter table public.acerola_chat_jobs enable row level security;
drop policy if exists "Users can read their own Acerola jobs" on public.acerola_chat_jobs;
create policy "Users can read their own Acerola jobs" on public.acerola_chat_jobs for select to authenticated using((select auth.uid())=user_id);
revoke all on public.acerola_chat_jobs from anon,authenticated;
grant select on public.acerola_chat_jobs to authenticated;

do $$
begin
 if not exists(select 1 from vault.decrypted_secrets where name='acerola_project_url') then perform vault.create_secret('https://djumpimcwzhjujysznox.supabase.co','acerola_project_url'); end if;
 if not exists(select 1 from vault.decrypted_secrets where name='acerola_job_worker_secret') then perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'acerola_job_worker_secret'); end if;
 if not exists(select 1 from vault.decrypted_secrets where name='acerola_job_encryption_key') then perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'acerola_job_encryption_key'); end if;
end $$;

create or replace function public.create_acerola_chat_job(p_user_id uuid,p_conversation_id text,p_payload jsonb,p_access_token text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_key text;v_id uuid;
begin
 if current_setting('request.jwt.claim.role',true)<>'service_role' then raise exception 'service role required';end if;
 select decrypted_secret into v_key from vault.decrypted_secrets where name='acerola_job_encryption_key';
 if v_key is null or length(p_access_token)<20 then raise exception 'job encryption or access token unavailable';end if;
 insert into public.acerola_chat_jobs(user_id,conversation_id,payload,access_token_encrypted)
 values(p_user_id,left(p_conversation_id,160),p_payload,extensions.pgp_sym_encrypt(p_access_token,v_key)) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.create_acerola_chat_job(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_acerola_chat_job(uuid,text,jsonb,text) to service_role;

create or replace function public.verify_acerola_job_worker_secret(p_secret text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_secret text;
begin
 if current_setting('request.jwt.claim.role',true)<>'service_role' then return false;end if;
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='acerola_job_worker_secret';
 return v_secret is not null and p_secret is not null and length(p_secret)>=32 and p_secret=v_secret;
end $$;
revoke all on function public.verify_acerola_job_worker_secret(text) from public,anon,authenticated;
grant execute on function public.verify_acerola_job_worker_secret(text) to service_role;

create or replace function public.claim_acerola_chat_jobs(p_limit integer default 1)
returns table(job_id uuid,user_id uuid,conversation_id text,payload jsonb,access_token text,attempts integer)
language plpgsql security definer set search_path=''
as $$
declare v_key text;
begin
 if current_setting('request.jwt.claim.role',true)<>'service_role' then raise exception 'service role required';end if;
 select decrypted_secret into v_key from vault.decrypted_secrets where name='acerola_job_encryption_key';
 return query with picked as(
  select j.id from public.acerola_chat_jobs j
  where(j.status='queued' or(j.status='running' and j.claimed_at<now()-interval '90 seconds'))and j.attempts<3
  order by j.created_at for update skip locked limit greatest(1,least(coalesce(p_limit,1),2))
 ),updated as(
  update public.acerola_chat_jobs j set status='running',attempts=j.attempts+1,claimed_at=now(),updated_at=now()
  from picked p where j.id=p.id
  returning j.id,j.user_id,j.conversation_id,j.payload,j.access_token_encrypted,j.attempts
 )
 select u.id,u.user_id,u.conversation_id,u.payload,extensions.pgp_sym_decrypt(u.access_token_encrypted,v_key),u.attempts from updated u;
end $$;
revoke all on function public.claim_acerola_chat_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_acerola_chat_jobs(integer) to service_role;

create or replace function public.finish_acerola_chat_job(p_job_id uuid,p_response jsonb default null,p_error text default null)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if current_setting('request.jwt.claim.role',true)<>'service_role' then raise exception 'service role required';end if;
 update public.acerola_chat_jobs set response=case when p_error is null then p_response else null end,
 error=case when p_error is null then null else left(p_error,1000) end,
 status=case when p_error is null then 'completed' when attempts<3 then 'queued' else 'failed' end,
 claimed_at=null,updated_at=now(),completed_at=case when p_error is null or attempts>=3 then now() else null end
 where id=p_job_id;
end $$;
revoke all on function public.finish_acerola_chat_job(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.finish_acerola_chat_job(uuid,jsonb,text) to service_role;

create or replace function public.dispatch_acerola_chat_jobs()
returns bigint language plpgsql security definer set search_path=''
as $$
declare v_url text;v_secret text;v_request_id bigint;
begin
 select decrypted_secret into v_url from vault.decrypted_secrets where name='acerola_project_url';
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='acerola_job_worker_secret';
 if v_url is null or v_secret is null then raise exception 'Acerola job worker configuration missing';end if;
 select net.http_post(url:=v_url||'/functions/v1/acerola-chat-worker',
 headers:=jsonb_build_object('Content-Type','application/json','x-acerola-worker-secret',v_secret),
 body:='{"source":"pg_cron"}'::jsonb,timeout_milliseconds:=120000) into v_request_id;
 return v_request_id;
end $$;
revoke all on function public.dispatch_acerola_chat_jobs() from public,anon,authenticated;
do $$
begin
 if not exists(select 1 from cron.job where jobname='acerola-chat-worker') then perform cron.schedule('acerola-chat-worker','10 seconds','select public.dispatch_acerola_chat_jobs();');end if;
end $$;
