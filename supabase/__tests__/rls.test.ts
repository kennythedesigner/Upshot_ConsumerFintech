/**
 * Runs the real migration in an in-process Postgres (PGlite) with a stand-in
 * for Supabase's auth schema, then proves the RLS rules hold:
 * a visitor can only ever see and change their own portfolio and goals.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';

const MIGRATION = readFileSync(
  fileURLToPath(new URL('../migrations/20261110000000_portfolio_metadata.sql', import.meta.url)),
  'utf8',
);

/** The minimum of Supabase's setup the migration relies on. */
const SUPABASE_STANDIN = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth, public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const G1 = '00000000-0000-4000-8000-000000000001';
const G2 = '00000000-0000-4000-8000-000000000002';

let db: PGlite;

/** Run SQL as a signed-in visitor (or as a signed-out request when uid is null). */
async function as<T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

const save = (uid: string | null, name: string, goal: string | null, goals: unknown[]) =>
  as<{ save_onboarding: string }>(uid, 'select public.save_onboarding($1, $2, $3::jsonb)', [
    name,
    goal,
    JSON.stringify(goals),
  ]);

beforeEach(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STANDIN);
  await db.exec(MIGRATION);
  await db.exec(`insert into auth.users (id) values ('${A}'), ('${B}')`);
});

describe('save_onboarding', () => {
  it('saves the business goal and goal list for the signed-in visitor', async () => {
    await save(A, 'Neobank', 'Cut overdraft complaints', [
      { id: G1, name: 'Trust', sort_order: 0 },
      { id: G2, name: 'Growth', sort_order: 1 },
    ]);
    const rows = await as(A, 'select business_goal from public.portfolio');
    expect(rows).toEqual([{ business_goal: 'Cut overdraft complaints' }]);
    const goals = await as<{ name: string }>(A, 'select name from public.goal order by sort_order');
    expect(goals.map((g) => g.name)).toEqual(['Trust', 'Growth']);
  });

  it('re-submitting updates the same row, never a duplicate (idempotency)', async () => {
    await save(A, 'Neobank', 'v1', [{ id: G1, name: 'Trust' }]);
    await save(A, 'Neobank', 'v2', [{ id: G1, name: 'Trust' }]);
    await save(A, 'Neobank', 'v2', [{ id: G1, name: 'Trust' }]);
    const rows = await as(A, 'select business_goal from public.portfolio');
    expect(rows).toEqual([{ business_goal: 'v2' }]);
  });

  it('removes goals dropped from the list and keeps ids stable', async () => {
    await save(A, 'Neobank', null, [
      { id: G1, name: 'Trust', sort_order: 0 },
      { id: G2, name: 'Growth', sort_order: 1 },
    ]);
    await save(A, 'Neobank', null, [{ id: G2, name: 'Growth', sort_order: 0 }]);
    expect(await as(A, 'select id, name from public.goal')).toEqual([{ id: G2, name: 'Growth' }]);
  });

  it('allows two goals to swap names in one save', async () => {
    await save(A, 'N', null, [{ id: G1, name: 'Trust' }, { id: G2, name: 'Growth' }]);
    await save(A, 'N', null, [{ id: G1, name: 'Growth' }, { id: G2, name: 'Trust' }]);
    const goals = await as<{ id: string; name: string }>(A, 'select id, name from public.goal order by name');
    expect(goals).toEqual([{ id: G1, name: 'Growth' }, { id: G2, name: 'Trust' }]);
  });

  it('enforces length and count limits in the database', async () => {
    await expect(save(A, 'N', 'x'.repeat(550), [])).resolves.toBeDefined(); // exactly at the limit
    await expect(save(A, 'N', 'x'.repeat(551), [])).rejects.toThrow();
    await expect(save(A, 'N', null, [{ id: G1, name: 'x'.repeat(81) }])).rejects.toThrow();
    const eleven = Array.from({ length: 11 }, (_, n) => ({
      id: `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`,
      name: `Goal ${n}`,
    }));
    await expect(save(A, 'N', null, eleven)).rejects.toThrow(/at most 10 goals/);
  });
});

describe('RLS: visitors are isolated', () => {
  beforeEach(async () => {
    await save(A, 'A portfolio', 'A secret goal', [{ id: G1, name: 'A goal' }]);
  });

  it('visitor B sees none of A’s rows', async () => {
    expect(await as(B, 'select * from public.portfolio')).toEqual([]);
    expect(await as(B, 'select * from public.goal')).toEqual([]);
  });

  it('visitor B cannot change or delete A’s rows', async () => {
    await as(B, `update public.portfolio set business_goal = 'hacked'`);
    await as(B, `delete from public.goal`);
    await as(B, `delete from public.portfolio`);
    expect(await as(A, 'select business_goal from public.portfolio')).toEqual([{ business_goal: 'A secret goal' }]);
    expect(await as(A, 'select name from public.goal')).toEqual([{ name: 'A goal' }]);
  });

  it('visitor B cannot insert a row owned by A', async () => {
    await expect(
      as(B, `insert into public.portfolio (owner_id, name) values ('${A}', 'fake')`),
    ).rejects.toThrow(/row-level security/);
  });

  it('visitor B cannot attach goals to A’s portfolio', async () => {
    const id = (await as<{ id: string }>(A, 'select id from public.portfolio'))[0]!.id;
    await expect(
      as(B, `insert into public.goal (portfolio_id, name) values ('${id}', 'sneaky')`),
    ).rejects.toThrow(/row-level security/);
  });

  it('visitor B cannot take over A’s goal by reusing its id', async () => {
    await save(B, 'B portfolio', null, [{ id: G1, name: 'B steals' }]).catch(() => undefined);
    expect(await as(A, 'select name from public.goal')).toEqual([{ name: 'A goal' }]);
  });

  it('signed-out requests (anon key, no sign-in) get nothing', async () => {
    await expect(as(null, 'select * from public.portfolio')).rejects.toThrow(/permission denied/);
    await expect(save(null, 'x', null, [])).rejects.toThrow(/permission denied/);
  });
});
