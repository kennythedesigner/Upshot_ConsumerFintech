/**
 * Initiatives live in this browser tab's session only (D53b, D57).
 * Nothing here goes to a server. sessionStorage can be missing or full
 * (private windows, embedded previews), so every call is guarded.
 */
import { BUCKET_KINDS, SCHEMA_VERSION, type Initiative, type PortfolioDocument } from '@engine';
import { assignColors, type ColorMap } from './series';

const KEY = 'upshot.session.v2';

/** Which two initiatives the comparison shows. */
export interface ComparePair {
  a: string | null;
  b: string | null;
}

/** How the dashboard orders its rows. Every order is a lens, never a ranking (D40). */
export const SORT_KEYS = ['added', 'net', 'roi', 'spread', 'priority', 'complexity'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** What the tab keeps: the portfolio, which initiatives are the worked example, colours, the compared pair and the sort. */
export interface Session {
  doc: PortfolioDocument;
  exampleIds: string[];
  colors: ColorMap;
  compare: ComparePair;
  sort: SortKey;
}

/**
 * Keep the parts that depend on the list in step with it: every initiative has
 * a colour, and the compared pair is two different initiatives that exist.
 * Falls back to the first two in list order.
 */
export function normalize(session: Session): Session {
  const ids = session.doc.initiatives.map((i) => i.id);
  const has = (id: string | null): id is string => id !== null && ids.includes(id);
  let a = has(session.compare.a) ? session.compare.a : null;
  let b = has(session.compare.b) && session.compare.b !== a ? session.compare.b : null;
  // Slot A fills first: if only B survived, it moves over to A.
  if (a === null && b !== null) [a, b] = [b, null];
  if (a === null) a = ids.find((id) => id !== b) ?? null;
  if (b === null) b = ids.find((id) => id !== a) ?? null;
  return { ...session, colors: assignColors(session.doc, session.colors), compare: { a, b } };
}

function looksLikeInitiative(x: unknown): x is Initiative {
  if (!x || typeof x !== 'object') return false;
  const i = x as Partial<Initiative>;
  return (
    typeof i.id === 'string' &&
    typeof i.name === 'string' &&
    Array.isArray(i.complexity_factors) &&
    Array.isArray(i.pressure_patterns) &&
    !!i.buckets &&
    BUCKET_KINDS.every((k) => typeof i.buckets?.[k] === 'object' && i.buckets?.[k] !== null)
  );
}

export function loadSession(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    const doc = parsed.doc;
    if (!doc || doc.schema_version !== SCHEMA_VERSION || !doc.portfolio || !Array.isArray(doc.initiatives)) {
      return null;
    }
    const compare = parsed.compare && typeof parsed.compare === 'object' ? parsed.compare : { a: null, b: null };
    return normalize({
      doc: { ...doc, goals: Array.isArray(doc.goals) ? doc.goals : [], initiatives: doc.initiatives.filter(looksLikeInitiative) },
      exampleIds: Array.isArray(parsed.exampleIds) ? parsed.exampleIds.filter((x) => typeof x === 'string') : [],
      colors: parsed.colors && typeof parsed.colors === 'object' ? parsed.colors : {},
      compare: {
        a: typeof compare.a === 'string' ? compare.a : null,
        b: typeof compare.b === 'string' ? compare.b : null,
      },
      sort: (SORT_KEYS as readonly unknown[]).includes(parsed.sort) ? (parsed.sort as SortKey) : 'added',
    });
  } catch {
    return null;
  }
}

/** Returns false when the browser won't store anything. */
export function saveSession(session: Session): boolean {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

/** Insert or replace one initiative, keeping its place in the list. */
export function upsertInitiative(doc: PortfolioDocument, initiative: Initiative): PortfolioDocument {
  const at = doc.initiatives.findIndex((i) => i.id === initiative.id);
  const initiatives =
    at === -1 ? [...doc.initiatives, initiative] : doc.initiatives.map((i, n) => (n === at ? initiative : i));
  return { ...doc, initiatives };
}

export function removeInitiative(doc: PortfolioDocument, id: string): PortfolioDocument {
  return { ...doc, initiatives: doc.initiatives.filter((i) => i.id !== id) };
}

/** Put an initiative back where it was, for Undo. */
export function restoreInitiative(doc: PortfolioDocument, initiative: Initiative, index: number): PortfolioDocument {
  const initiatives = [...doc.initiatives];
  initiatives.splice(Math.min(index, initiatives.length), 0, initiative);
  return { ...doc, initiatives };
}
