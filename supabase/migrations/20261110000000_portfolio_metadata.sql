-- Upshot V1: portfolio metadata (D53b, D52b, D52c, D58, D59)
--
-- Stores ONLY the business goal and the goal/OKR list. Initiatives stay in the
-- calculator session (D57 deferred).
--
-- Who owns a row: each visitor is a Supabase anonymous user (D58), so
-- auth.uid() is a real, signed id that RLS can trust. The Framer component uses
-- the public anon key only; never ship the service-role key (it bypasses RLS).
--
-- Run once in the Supabase SQL editor, or with `supabase db push`.

-- ── Tables ──────────────────────────────────────────────────────────────────

create table public.portfolio (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null default 'My portfolio'
                  check (char_length(name) between 1 and 100),
  business_goal text
                  check (business_goal is null or char_length(business_goal) <= 550),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One portfolio per visitor in V1, so re-submitting onboarding updates the
  -- same row instead of creating a duplicate (checklist 4: idempotency).
  constraint portfolio_one_per_owner unique (owner_id)
);

create table public.goal (
  id           uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolio (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  sort_order   integer not null default 0 check (sort_order between 0 and 99),
  -- Checked at the end of the save, so swapping two goals' names doesn't trip it.
  constraint goal_unique_name unique (portfolio_id, name) deferrable initially deferred
);

create index goal_portfolio_id_idx on public.goal (portfolio_id);

-- ── Access: least privilege (checklist 4) ───────────────────────────────────

alter table public.portfolio enable row level security;
alter table public.goal      enable row level security;

-- Signed-out requests (the anon role) get nothing. Every visitor signs in
-- anonymously first and uses the authenticated role.
revoke all on public.portfolio from anon, public;
revoke all on public.goal      from anon, public;
grant select, insert, update, delete on public.portfolio to authenticated;
grant select, insert, update, delete on public.goal      to authenticated;

-- portfolio: you can only see and change your own row.
create policy portfolio_select_own on public.portfolio
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy portfolio_insert_own on public.portfolio
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy portfolio_update_own on public.portfolio
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy portfolio_delete_own on public.portfolio
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- goal: allowed only when its portfolio is yours.
create policy goal_select_own on public.goal
  for select to authenticated
  using (exists (select 1 from public.portfolio p
                 where p.id = portfolio_id and p.owner_id = (select auth.uid())));

create policy goal_insert_own on public.goal
  for insert to authenticated
  with check (exists (select 1 from public.portfolio p
                      where p.id = portfolio_id and p.owner_id = (select auth.uid())));

create policy goal_update_own on public.goal
  for update to authenticated
  using (exists (select 1 from public.portfolio p
                 where p.id = portfolio_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.portfolio p
                      where p.id = portfolio_id and p.owner_id = (select auth.uid())));

create policy goal_delete_own on public.goal
  for delete to authenticated
  using (exists (select 1 from public.portfolio p
                 where p.id = portfolio_id and p.owner_id = (select auth.uid())));

-- ── Save onboarding in one step ─────────────────────────────────────────────
-- Upserts the visitor's portfolio and replaces its goal list in a single
-- transaction, so a failed save never leaves half a list behind.
-- SECURITY INVOKER: runs as the visitor, so every RLS policy above still applies.
--
-- p_goals: [{ "id": uuid, "name": text, "sort_order": int }, ...]
-- Goal ids come from the client so goal tags on session initiatives stay valid.

create or replace function public.save_onboarding(
  p_name          text,
  p_business_goal text,
  p_goals         jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_portfolio_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if jsonb_typeof(p_goals) is distinct from 'array' then
    raise exception 'goals must be a list' using errcode = '22023';
  end if;
  if jsonb_array_length(p_goals) > 10 then
    raise exception 'at most 10 goals' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_goals) g where g->>'id' is null) then
    raise exception 'every goal needs an id' using errcode = '22023';
  end if;

  insert into public.portfolio as p (owner_id, name, business_goal)
  values ((select auth.uid()), p_name, p_business_goal)
  on conflict (owner_id) do update
    set name = excluded.name,
        business_goal = excluded.business_goal,
        updated_at = now()
  returning p.id into v_portfolio_id;

  delete from public.goal g
  where g.portfolio_id = v_portfolio_id
    and g.id not in (select (x->>'id')::uuid from jsonb_array_elements(p_goals) x);

  insert into public.goal as g (id, portfolio_id, name, sort_order)
  select (x->>'id')::uuid, v_portfolio_id, x->>'name', coalesce((x->>'sort_order')::int, 0)
  from jsonb_array_elements(p_goals) x
  on conflict (id) do update
    set name = excluded.name,
        sort_order = excluded.sort_order
    where g.portfolio_id = v_portfolio_id;

  return v_portfolio_id;
end;
$$;

revoke all on function public.save_onboarding(text, text, jsonb) from public, anon;
grant execute on function public.save_onboarding(text, text, jsonb) to authenticated;
