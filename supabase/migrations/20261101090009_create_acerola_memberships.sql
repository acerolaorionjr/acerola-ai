-- Monthly Acerola memberships. Writes are reserved for trusted Edge Functions.
create table if not exists public.acerola_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  tier text not null check (tier in ('standard', 'premium', 'ultimate')),
  plan_code text not null,
  amount integer not null check (amount in (100000, 250000, 500000)),
  currency text not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'non_renewing', 'attention', 'cancelled', 'disabled', 'expired')),
  reference text not null unique,
  paystack_subscription_code text unique,
  paystack_customer_code text,
  paystack_email_token text,
  next_payment_date timestamptz,
  last_payment_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists acerola_memberships_user_status_idx
  on public.acerola_memberships (user_id, status);
create index if not exists acerola_memberships_next_payment_idx
  on public.acerola_memberships (next_payment_date)
  where status in ('active', 'non_renewing');

alter table public.acerola_memberships enable row level security;

drop policy if exists "Users can view their own Acerola memberships" on public.acerola_memberships;
create policy "Users can view their own Acerola memberships"
  on public.acerola_memberships
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.acerola_memberships from anon, authenticated;
grant select on public.acerola_memberships to authenticated;

create or replace function public.set_acerola_membership_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_acerola_membership_updated_at on public.acerola_memberships;
create trigger set_acerola_membership_updated_at
  before update on public.acerola_memberships
  for each row execute function public.set_acerola_membership_updated_at();

revoke all on function public.set_acerola_membership_updated_at() from public, anon, authenticated;
