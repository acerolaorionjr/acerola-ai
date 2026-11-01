create table if not exists public.acerola_push_subscriptions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,
 subscription jsonb not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.acerola_push_subscriptions enable row level security;
revoke all on public.acerola_push_subscriptions from anon,authenticated;
create or replace function public.get_acerola_vapid_keys()
returns table(public_key text,private_key text) language plpgsql security definer set search_path=''
as $$
begin
 if current_setting('request.jwt.claim.role',true)<>'service_role' then raise exception 'service role required';end if;
 return query select (select decrypted_secret from vault.decrypted_secrets where name='acerola_vapid_public_key'),(select decrypted_secret from vault.decrypted_secrets where name='acerola_vapid_private_key');
end $$;
revoke all on function public.get_acerola_vapid_keys() from public,anon,authenticated;
grant execute on function public.get_acerola_vapid_keys() to service_role;
create or replace function public.save_acerola_vapid_keys(p_public text,p_private text)
returns table(public_key text,private_key text) language plpgsql security definer set search_path=''
as $$
begin
 if current_setting('request.jwt.claim.role',true)<>'service_role' then raise exception 'service role required';end if;
 if length(p_public)<80 or length(p_private)<40 then raise exception 'invalid VAPID key pair';end if;
 if not exists(select 1 from vault.decrypted_secrets where name='acerola_vapid_public_key') then perform vault.create_secret(p_public,'acerola_vapid_public_key');end if;
 if not exists(select 1 from vault.decrypted_secrets where name='acerola_vapid_private_key') then perform vault.create_secret(p_private,'acerola_vapid_private_key');end if;
 return query select (select decrypted_secret from vault.decrypted_secrets where name='acerola_vapid_public_key'),(select decrypted_secret from vault.decrypted_secrets where name='acerola_vapid_private_key');
end $$;
revoke all on function public.save_acerola_vapid_keys(text,text) from public,anon,authenticated;
grant execute on function public.save_acerola_vapid_keys(text,text) to service_role;
