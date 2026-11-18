/**
 * Reading what people type into number fields, and dressing the engine's
 * formatted figures for the screen. Rounding rules live in the engine
 * (format.ts, D51); this file only adds the typographic minus and signs.
 */
import { formatDollars, formatPercent } from '@engine';

export type ParseResult = { ok: true; value: number | null } | { ok: false };

/**
 * Accepts what people actually type: "$240,000", "1.2 points", "−4", " 180 000 ".
 * Empty, or a lone "-" or "." while someone is still typing, reads as no value.
 */
export function parseNumberInput(raw: string): ParseResult {
  const cleaned = raw
    .replace(/[−‒–—]/g, '-') // typographic minus and dashes
    .replace(/points?|pts?|\$|%|,|\s/gi, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
    return { ok: true, value: null };
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return { ok: false };
  const value = Number(cleaned);
  return Number.isFinite(value) ? { ok: true, value } : { ok: false };
}

/** Negatives take a true minus sign (U+2212), never a hyphen. */
export const withMinus = (s: string): string => s.replace(/-/g, '−');

const inputMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const inputCount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const inputDecimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export type NumberKind = 'money' | 'count' | 'points' | 'months';

/** How a typed value is shown back once the field loses focus. Inputs keep cents. */
export function formatForInput(value: number, kind: NumberKind): string {
  switch (kind) {
    case 'money':
      return withMinus(inputMoney.format(value));
    case 'count':
    case 'months':
      return withMinus(inputCount.format(value));
    case 'points':
      return withMinus(inputDecimal.format(value));
  }
}

/** Output dollars: the engine's rounding (D51) with a true minus. */
export const money = (value: number): string => withMinus(formatDollars(value));

/** Output dollars with an explicit + on gains, for the "Behind the base case" ledger. */
export const signedMoney = (value: number): string => {
  const s = money(value);
  return s === '$0' || s.startsWith('−') ? s : `+${s}`;
};

/** Output ROI: whole percent (engine format) with a true minus. */
export const percent = (value: number): string => withMinus(formatPercent(value));

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export const count = (value: number): string => withMinus(grouped.format(value));
