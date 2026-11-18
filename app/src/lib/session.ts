/**
 * Initiatives live in this browser tab's session only (D53b, D57).
 * Nothing here goes to a server. sessionStorage can be missing or full
 * (private windows, embedded previews), so every call is guarded.
 */
import { BUCKET_KINDS, SCHEMA_VERSION, type Initiative, type PortfolioDocument } from '@engine';

const KEY = 'upshot.session.v1';

function looksLikeInitiative(x: unknown): x is Initiative {
  if (!x || typeof x !== 'object') return false;
  const i = x as Partial<Initiative>;
  return (
    typeof i.id === 'string' &&
    Array.isArray(i.complexity_factors) &&
    Array.isArray(i.pressure_patterns) &&
    !!i.buckets &&
    BUCKET_KINDS.every((k) => typeof i.buckets?.[k] === 'object' && i.buckets?.[k] !== null)
  );
}

export function loadSession(): PortfolioDocument | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw) as Partial<PortfolioDocument>;
    if (doc.schema_version !== SCHEMA_VERSION || !doc.portfolio || !Array.isArray(doc.initiatives)) {
      return null;
    }
    return { ...(doc as PortfolioDocument), initiatives: doc.initiatives.filter(looksLikeInitiative) };
  } catch {
    return null;
  }
}

/** Returns false when the browser won't store anything. */
export function saveSession(doc: PortfolioDocument): boolean {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}

/** Insert or replace one initiative, newest last. */
export function upsertInitiative(doc: PortfolioDocument, initiative: Initiative): PortfolioDocument {
  const others = doc.initiatives.filter((i) => i.id !== initiative.id);
  return { ...doc, initiatives: [...others, initiative] };
}

/** The most recently saved initiative, if any. */
export function latestInitiative(doc: PortfolioDocument): Initiative | null {
  const sorted = [...doc.initiatives].sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  return sorted.at(-1) ?? null;
}
