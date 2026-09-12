alter table public.acerola_memory enable row level security;

revoke all on table public.acerola_memory from anon, authenticated;
grant all on table public.acerola_memory to service_role;

-- Persistent memory is accessed only through the authenticated Edge Function.
drop policy if exists "Users can read their own Acerola memory" on public.acerola_memory;
drop policy if exists "Users can insert their own Acerola memory" on public.acerola_memory;
drop policy if exists "Users can update their own Acerola memory" on public.acerola_memory;
drop policy if exists "Users can delete their own Acerola memory" on public.acerola_memory;
