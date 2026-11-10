# Security notes — API keys and secrets

Short version: **there are no secret API keys in this codebase, and there should never be.** This file explains how Upshot stays safe without them, so nobody "fixes" it later by hiding a key that is meant to be public.

## How Upshot talks to its backend

The Framer code component calls Supabase directly from the browser, using the **publishable (anon) key**. That is Supabase's intended design:

- The **publishable key is public**. It only says "a request is coming from this project." It grants nothing on its own.
- What actually protects the data is **row-level security (RLS)**, written in `supabase/migrations/` and tested in `supabase/__tests__/rls.test.ts`. Each visitor is an anonymous Supabase user (D58); the policies check `auth.uid()`, so a visitor can only ever read or change their own rows. Signed-out requests get nothing.

So Supabase **is** the backend. There is no separate server to route through, and the publishable key being in the browser is not a leak — it is how the system is meant to work. Do not try to hide it or build a proxy server to "protect" it.

## The real secrets (never in this repo, never in frontend code)

| Secret | Where it lives | Never |
|---|---|---|
| Supabase **service-role** key | Supabase dashboard only; server-side use only | In code, in `.env` that gets committed, or in the Framer component. It bypasses RLS. |
| Cloudflare **Turnstile secret** key | Supabase dashboard → Authentication → Attack Protection | In frontend code. The Turnstile **site key** is the public half and is the only part the component uses. |

`.env` is git-ignored. `.env.example` (committed) documents the two safe client values with placeholders — real values go in a local `.env` or straight into Framer, never into the repo.

## The two "Anonymous Access Policies" advisories are expected

Supabase's security advisor flags the `portfolio` and `goal` tables with an "Anonymous Access Policies" warning. This is expected for Upshot and is not a hole: the warning fires because the policies allow the anonymous role, but every one of those policies also checks `auth.uid() = owner_id`, so each anonymous visitor is still scoped to their own rows (D58). The warning exists to make sure that scoping is intentional. It is.
