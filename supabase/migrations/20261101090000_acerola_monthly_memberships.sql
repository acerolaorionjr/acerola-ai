-- Acerola monthly memberships. Paystack remains the source of truth for recurring charges.
create table if not exists public.acerola_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_email text not null,
  tier text not null check (tier in ('standard','premium','ultimate')),
  plan_code text not null check (plan_code in (
    'PLN_6drn57e1ub3xcu7',
    'PLN_hk2hfjiz23kl17c',
    'PLN_pf6exaeg73to1s2'
  )),
  subscription_code text not null unique,
  status text not null default 'active' check (status in ('active','non_renewing','past_due','cancelled','completed')),
  next_payment_date timestamptz,
  last_paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists acerola_memberships_user_status_idx
  on public.acerola_memberships(user_id, status, next_payment_date desc);

alter table public.acerola_memberships enable row level security;

drop policy if exists "Users can read their own Acerola memberships" on public.acerola_memberships;
create policy "Users can read their own Acerola memberships"
  on public.acerola_memberships for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.acerola_memberships from anon, authenticated;
grant select on public.acerola_memberships to authenticated;

create or replace function public.sync_acerola_membership(
  p_email text,
  p_plan_code text,
  p_subscription_code text,
  p_status text,
  p_next_payment_date timestamptz default null,
  p_last_paid_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_tier text;
begin
  if p_email is null or p_subscription_code is null or length(trim(p_subscription_code)) < 8 then
    raise exception 'Missing membership identity';
  end if;

  v_tier := case p_plan_code
    when 'PLN_6drn57e1ub3xcu7' then 'standard'
    when 'PLN_hk2hfjiz23kl17c' then 'premium'
    when 'PLN_pf6exaeg73to1s2' then 'ultimate'
    else null
  end;

  if v_tier is null then
    raise exception 'Unknown Acerola plan';
  end if;

  if p_status not in ('active','non_renewing','past_due','cancelled','completed') then
    raise exception 'Invalid membership status';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'No Acerola account matches the subscription email';
  end if;

  insert into public.acerola_memberships (
    user_id, customer_email, tier, plan_code, subscription_code,
    status, next_payment_date, last_paid_at, updated_at
  ) values (
    v_user_id, lower(trim(p_email)), v_tier, p_plan_code, p_subscription_code,
    p_status, p_next_payment_date, p_last_paid_at, now()
  )
  on conflict (subscription_code) do update set
    user_id = excluded.user_id,
    customer_email = excluded.customer_email,
    tier = excluded.tier,
    plan_code = excluded.plan_code,
    status = case
      when public.acerola_memberships.status = 'non_renewing'
       and excluded.status = 'active'
      then 'non_renewing'
      else excluded.status
    end,
    next_payment_date = coalesce(excluded.next_payment_date, public.acerola_memberships.next_payment_date),
    last_paid_at = coalesce(excluded.last_paid_at, public.acerola_memberships.last_paid_at),
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.sync_acerola_membership(text,text,text,text,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.sync_acerola_membership(text,text,text,text,timestamptz,timestamptz) to service_role;
