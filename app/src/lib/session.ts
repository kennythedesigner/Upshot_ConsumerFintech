/**
 * Initiatives live in this browser tab's session only (D53b, D57).
 * Nothing here goes to a server. sessionStorage can be missing or full
 * (private windows, embedded previews), so every call is guarded.
 */
import { BUCKET_KINDS, SCHEMA_VERSION, type Initiative, type PortfolioDocument } from '@engine';

const KEY = 'upshot.session.v2';

/** What the tab keeps: the portfolio, plus which initiatives are the worked example. */
export interface Session {
  doc: PortfolioDocument;
  exampleIds: string[];
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
    return {
      doc: { ...doc, goals: Array.isArray(doc.goals) ? doc.goals : [], initiatives: doc.initiatives.filter(looksLikeInitiative) },
      exampleIds: Array.isArray(parsed.exampleIds) ? parsed.exampleIds.filter((x) => typeof x === 'string') : [],
    };
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
