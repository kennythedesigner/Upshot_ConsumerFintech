/**
 * The marketing-site signup, posting to Supabase (D52a, revised).
 *
 * One RPC call, so this uses plain fetch rather than @supabase/supabase-js —
 * the library is mostly auth and realtime, none of which a marketing page
 * needs, and it would be the heaviest thing on the page.
 *
 * The key below is the publishable key. It is meant to be public and ships in
 * the bundle by design; what protects the list is the database, not the key.
 * public.email_signup grants the anon role nothing at all and has RLS on with
 * no policies, so the only thing this key can do is call subscribe_email(),
 * which writes and never reads. See supabase/migrations/..._email_signup.sql.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

/** False when the build has no Supabase config, so the form can say so. */
export const signupConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export type SignupResult = 'sent' | 'invalid' | 'error';

/**
 * Adds an address to the list. Resolves 'sent' whether or not the address was
 * already there — the function is deliberately silent about that, so the form
 * can't be used to test whether someone is subscribed.
 */
export async function subscribe(email: string): Promise<SignupResult> {
  if (!signupConfigured) return 'error';

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/subscribe_email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ p_email: email }),
    });
  } catch {
    // Offline, DNS, blocked request: nothing was written.
    return 'error';
  }

  if (response.ok) return 'sent';

  // 22023 is the invalid_parameter_value the function raises on a bad address.
  // The browser checks first, so this is the belt-and-braces path.
  if (response.status === 400) {
    const body = await response.text().catch(() => '');
    if (body.includes('22023') || body.includes('invalid email')) return 'invalid';
  }
  return 'error';
}
