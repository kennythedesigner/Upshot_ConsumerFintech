/**
 * Saves and loads portfolio metadata in Supabase (D52b, D52c, D53b, D58).
 * Only the business goal and the goal/OKR list. Initiatives never come here (D57).
 *
 * The Framer code component creates the Supabase client with the public anon
 * key and passes it in. This module never sees a service-role key.
 *
 * D52c: a failed save is a failed save. There is no local fallback, so every
 * failure comes back as a message the screen must show the PM.
 *
 * Call saveOnboarding when the PM submits Onboarding, not on every keystroke
 * (checklist 4: rate limiting).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Goal } from '../engine/types';
import { cleanOnboarding, type OnboardingInput } from './clean';

export type DataErrorKind = 'offline' | 'invalid' | 'not_signed_in' | 'server';

export interface DataError {
  kind: DataErrorKind;
  /** Plain-language message for the PM. */
  message: string;
  /** Field-level problems, for the invalid case. */
  problems?: string[];
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: DataError };

export interface OnboardingData {
  portfolioId: string;
  name: string;
  businessGoal: string | null;
  goals: Goal[];
}

const MESSAGES: Record<DataErrorKind, string> = {
  offline: "Couldn't save. You seem to be offline. Your business goal and goals are still on screen; try again once you're connected.",
  invalid: 'Some entries need a fix before they can be saved.',
  not_signed_in: "Couldn't start your session, so nothing was saved. Refresh the page and try again.",
  server: "Couldn't save right now. Your business goal and goals are still on screen; try again in a moment.",
};

const fail = <T>(kind: DataErrorKind, problems?: string[]): Result<T> => ({
  ok: false,
  error: { kind, message: MESSAGES[kind], ...(problems ? { problems } : {}) },
});

interface ErrorLike {
  message?: string;
  code?: string;
  name?: string;
}

/** Sorts any Supabase or network error into one of the four kinds. */
export function classifyError(e: unknown): DataErrorKind {
  const err = (e ?? {}) as ErrorLike;
  const text = `${err.name ?? ''} ${err.message ?? ''}`.toLowerCase();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  if (/failed to fetch|networkerror|network request failed|load failed|fetch failed/.test(text)) return 'offline';
  if (err.code === '28000' || err.code === '42501' || /jwt|not signed in|permission denied/.test(text)) {
    return 'not_signed_in';
  }
  // 22023 = our raised checks, 23514 = check constraint, 23505 = unique.
  if (err.code === '22023' || err.code === '23514' || err.code === '23505') return 'invalid';
  return 'server';
}

/**
 * Make sure this browser has a Supabase anonymous user (D58).
 * Supabase keeps only its sign-in token in the browser, so the same visitor
 * gets the same portfolio back after a refresh.
 * Pass a CAPTCHA token if CAPTCHA protection is on (recommended).
 */
export async function ensureVisitor(
  client: SupabaseClient,
  options: { captchaToken?: string } = {},
): Promise<Result<{ userId: string }>> {
  try {
    const { data: existing } = await client.auth.getSession();
    const current = existing.session?.user.id;
    if (current) return { ok: true, value: { userId: current } };

    const { data, error } = await client.auth.signInAnonymously(
      options.captchaToken ? { options: { captchaToken: options.captchaToken } } : undefined,
    );
    if (error || !data.user) {
      const kind = classifyError(error);
      return fail(kind === 'offline' ? 'offline' : 'not_signed_in');
    }
    return { ok: true, value: { userId: data.user.id } };
  } catch (e) {
    return fail(classifyError(e) === 'offline' ? 'offline' : 'not_signed_in');
  }
}

/** Load this visitor's saved Onboarding. value is null on a first visit. */
export async function loadOnboarding(client: SupabaseClient): Promise<Result<OnboardingData | null>> {
  try {
    const { data, error } = await client
      .from('portfolio')
      .select('id, name, business_goal, goal(id, name, sort_order)')
      .maybeSingle();
    if (error) return fail(classifyError(error));
    if (!data) return { ok: true, value: null };

    const row = data as {
      id: string;
      name: string;
      business_goal: string | null;
      goal: Array<{ id: string; name: string; sort_order: number }> | null;
    };
    const goals: Goal[] = (row.goal ?? [])
      .map((g) => ({ id: g.id, portfolio_id: row.id, name: g.name, sort_order: g.sort_order }))
      .sort((a, b) => a.sort_order - b.sort_order);
    return { ok: true, value: { portfolioId: row.id, name: row.name, businessGoal: row.business_goal, goals } };
  } catch (e) {
    return fail(classifyError(e));
  }
}

/**
 * Save Onboarding in one step: the portfolio row and its whole goal list,
 * all or nothing (the save_onboarding function runs in one transaction).
 * Re-submitting updates the same row; it never creates a duplicate.
 */
export async function saveOnboarding(
  client: SupabaseClient,
  input: OnboardingInput,
): Promise<Result<{ portfolioId: string }>> {
  const cleaned = cleanOnboarding(input);
  if (!cleaned.ok) return fail('invalid', cleaned.problems);

  try {
    const { data, error } = await client.rpc('save_onboarding', {
      p_name: cleaned.value.portfolioName,
      p_business_goal: cleaned.value.businessGoal,
      p_goals: cleaned.value.goals,
    });
    if (error) return fail(classifyError(error));
    return { ok: true, value: { portfolioId: data as string } };
  } catch (e) {
    return fail(classifyError(e));
  }
}
