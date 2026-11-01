create table if not exists public.acerola_monthly_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start)
);
alter table public.acerola_monthly_usage enable row level security;
revoke all on public.acerola_monthly_usage from anon, authenticated;
grant select, insert, update, delete on public.acerola_monthly_usage to service_role;

create or replace function public.acerola_consume_monthly_request(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', now())::date;
  v_tier text := 'free';
  v_status text := 'free';
  v_limit integer := 100;
  v_count integer;
  v_next_payment timestamptz;
begin
  select m.tier, m.status, m.next_payment_date
    into v_tier, v_status, v_next_payment
  from public.acerola_memberships m
  where m.user_id = p_user_id
    and (
      m.status = 'active'
      or (m.status = 'non_renewing' and m.next_payment_date > now())
    )
  order by case when m.status = 'active' then 0 else 1 end, m.created_at desc
  limit 1;

  if found then
    if v_tier = 'standard' then v_limit := 500;
    elsif v_tier = 'premium' then v_limit := 1500;
    elsif v_tier = 'ultimate' then v_limit := 4000;
    else v_tier := 'free'; v_status := 'free';
    end if;
  else
    v_tier := 'free';
    v_status := 'free';
  end if;

  insert into public.acerola_monthly_usage(user_id, month_start, request_count)
  values (p_user_id, v_month, 1)
  on conflict (user_id, month_start)
  do update set request_count = public.acerola_monthly_usage.request_count + 1,
                updated_at = now()
  where public.acerola_monthly_usage.request_count < v_limit
  returning request_count into v_count;

  if v_count is null then
    select request_count into v_count from public.acerola_monthly_usage
    where user_id = p_user_id and month_start = v_month;
    return jsonb_build_object('allowed', false, 'tier', v_tier, 'limit', v_limit, 'used', coalesce(v_count, 0), 'status', v_status);
  end if;

  return jsonb_build_object('allowed', true, 'tier', v_tier, 'limit', v_limit, 'used', v_count, 'status', v_status);
end;
$$;
revoke all on function public.acerola_consume_monthly_request(uuid) from public, anon, authenticated;
grant execute on function public.acerola_consume_monthly_request(uuid) to service_role;
