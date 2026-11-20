-- Upshot: marketing-site email signups (D52a, revised)
--
-- D52a planned to collect the optional email through a Framer form. Framer is
-- gone (D53a, rev 26), so the form on upshotpm.app posts here instead.
--
-- The security posture is deliberately different from portfolio/goal. Those
-- belong to a signed-in anonymous visitor, so RLS can check auth.uid() (D58).
-- A marketing signup has no visitor behind it: the person is signed out, and
-- the anon key is public by design. So instead of granting the anon role
-- anything on the table, the table is sealed and the only way in is one
-- SECURITY DEFINER function that can write but never read.
--
-- The consequence worth knowing: nobody holding the anon key can list the
-- addresses. Reading the list means the Supabase dashboard or a service-role
-- key, which never ships to a browser.
--
-- Stored: the address and when it arrived. No IP, no user agent, nothing else,
-- so the Privacy page can describe this in one sentence.

-- ── Table ───────────────────────────────────────────────────────────────────

create table public.email_signup (
  id         uuid primary key default gen_random_uuid(),
  -- Normalised to lowercase by subscribe_email before it ever gets here; the
  -- check keeps that true for anything written by hand in the dashboard.
  email      text not null
               check (char_length(email) between 3 and 254)
               check (email = lower(email))
               check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  created_at timestamptz not null default now(),
  -- Re-submitting an address is a no-op rather than a duplicate row, so the
  -- form can say "you're on the list" without revealing whether it already was.
  constraint email_signup_unique_email unique (email)
);

comment on table public.email_signup is
  'Optional marketing-site signups. Write-only from the client, via subscribe_email().';

-- ── Access: the table is sealed ─────────────────────────────────────────────
-- RLS on with NO policies means every PostgREST request is refused, whatever
-- grants exist. The revokes are belt and braces on top of that.

alter table public.email_signup enable row level security;

revoke all on public.email_signup from anon, authenticated, public;

-- ── The one way in ──────────────────────────────────────────────────────────
-- SECURITY DEFINER: runs as the owner, so it can insert into a table the
-- caller has no rights to. It returns void on purpose - success and "already
-- subscribed" are indistinguishable to the caller, which keeps the form from
-- becoming a way to test whether an address is on the list.

create or replace function public.subscribe_email(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  -- Validated again here: the browser's check is a convenience, not a control.
  if char_length(v_email) not between 3 and 254
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email address'
      using errcode = '22023';
  end if;

  insert into public.email_signup (email)
  values (v_email)
  on conflict (email) do nothing;
end;
$$;

revoke all on function public.subscribe_email(text) from public;
grant execute on function public.subscribe_email(text) to anon, authenticated;

comment on function public.subscribe_email(text) is
  'Adds an address to email_signup. Callable signed-out; writes only, never reads. Re-subscribing is a no-op.';
