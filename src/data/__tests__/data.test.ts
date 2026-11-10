import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyError, cleanOnboarding, cleanText, ensureVisitor, loadOnboarding, saveOnboarding } from '..';

const G1 = '00000000-0000-4000-8000-000000000001';
const G2 = '00000000-0000-4000-8000-000000000002';

/** A stand-in for the Supabase client with only what this module calls. */
function fakeClient(over: Partial<Record<'getSession' | 'signInAnonymously' | 'rpc' | 'maybeSingle', unknown>> = {}) {
  const rpc = vi.fn(over.rpc as never ?? (async () => ({ data: 'portfolio-1', error: null })));
  const maybeSingle = vi.fn(over.maybeSingle as never ?? (async () => ({ data: null, error: null })));
  const client = {
    auth: {
      getSession: vi.fn(over.getSession as never ?? (async () => ({ data: { session: null } }))),
      signInAnonymously: vi.fn(
        over.signInAnonymously as never ?? (async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      ),
    },
    rpc,
    from: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle })) })),
  };
  return { client: client as unknown as SupabaseClient, raw: client };
}

describe('cleanText', () => {
  it('trims, collapses whitespace and strips invisible characters', () => {
    expect(cleanText('  Cut\n\noverdraft​  complaints\u0000 ')).toBe('Cut overdraft complaints');
  });
  it('leaves markup as plain text (escaping happens on render)', () => {
    expect(cleanText('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
  });
});

describe('cleanOnboarding', () => {
  it('turns a blank business goal into null and numbers the goals', () => {
    const r = cleanOnboarding({ businessGoal: '   ', goals: [{ id: G1, name: ' Trust ' }] });
    expect(r).toEqual({
      ok: true,
      value: { portfolioName: 'My portfolio', businessGoal: null, goals: [{ id: G1, name: 'Trust', sort_order: 0 }] },
    });
  });
  it('lists every problem at once', () => {
    const r = cleanOnboarding({
      businessGoal: 'x'.repeat(501),
      goals: [{ id: G1, name: 'Trust' }, { id: G2, name: 'trust' }, { id: 'bad', name: '' }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.problems).toEqual([
        'Keep the business goal to 500 characters.',
        '"trust" is listed twice.',
        'Goal 3 is missing its id.',
        'Goal 3 needs a name.',
      ]);
    }
  });
});

describe('ensureVisitor', () => {
  it('reuses an existing session', async () => {
    const { client, raw } = fakeClient({
      getSession: async () => ({ data: { session: { user: { id: 'user-9' } } } }),
    });
    expect(await ensureVisitor(client)).toEqual({ ok: true, value: { userId: 'user-9' } });
    expect(raw.auth.signInAnonymously).not.toHaveBeenCalled();
  });
  it('signs in anonymously on a first visit, passing the CAPTCHA token', async () => {
    const { client, raw } = fakeClient();
    await ensureVisitor(client, { captchaToken: 'tok' });
    expect(raw.auth.signInAnonymously).toHaveBeenCalledWith({ options: { captchaToken: 'tok' } });
  });
});

describe('saveOnboarding', () => {
  it('sends cleaned values in one call', async () => {
    const { client, raw } = fakeClient();
    const r = await saveOnboarding(client, { businessGoal: ' Grow deposits ', goals: [{ id: G1, name: 'Growth' }] });
    expect(r).toEqual({ ok: true, value: { portfolioId: 'portfolio-1' } });
    expect(raw.rpc).toHaveBeenCalledWith('save_onboarding', {
      p_name: 'My portfolio',
      p_business_goal: 'Grow deposits',
      p_goals: [{ id: G1, name: 'Growth', sort_order: 0 }],
    });
  });
  it('never calls the database with invalid input', async () => {
    const { client, raw } = fakeClient();
    const r = await saveOnboarding(client, { businessGoal: '', goals: [{ id: G1, name: '' }] });
    expect(r.ok).toBe(false);
    expect(raw.rpc).not.toHaveBeenCalled();
  });
  it('a network failure comes back as a clear offline message, not silence', async () => {
    const { client } = fakeClient({ rpc: async () => { throw new TypeError('Failed to fetch'); } });
    const r = await saveOnboarding(client, { businessGoal: 'x', goals: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('offline');
      expect(r.error.message).toMatch(/offline/);
    }
  });
});

describe('loadOnboarding', () => {
  it('returns null on a first visit', async () => {
    expect(await loadOnboarding(fakeClient().client)).toEqual({ ok: true, value: null });
  });
  it('maps the saved row and sorts goals', async () => {
    const { client } = fakeClient({
      maybeSingle: async () => ({
        data: {
          id: 'p1',
          name: 'Neobank',
          business_goal: 'Trust',
          goal: [
            { id: G2, name: 'B', sort_order: 1 },
            { id: G1, name: 'A', sort_order: 0 },
          ],
        },
        error: null,
      }),
    });
    const r = await loadOnboarding(client);
    expect(r.ok && r.value?.goals.map((g) => g.name)).toEqual(['A', 'B']);
  });
});

describe('classifyError', () => {
  it.each([
    [{ message: 'Failed to fetch' }, 'offline'],
    [{ code: '23514', message: 'violates check constraint' }, 'invalid'],
    [{ code: '42501', message: 'permission denied' }, 'not_signed_in'],
    [{ code: 'XX000', message: 'boom' }, 'server'],
  ])('%o → %s', (err, kind) => {
    expect(classifyError(err)).toBe(kind);
  });
});
