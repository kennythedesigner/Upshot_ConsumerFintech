/**
 * Display rounding (D51 and TRD "Number rules"). Display only:
 * the engine always keeps full precision.
 */

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const twoDecimals = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Round half away from zero, so negatives round the same way as positives. */
function roundTo(value: number, step: number): number {
  const r = Math.sign(value) * Math.round(Math.abs(value) / step) * step;
  return r === 0 ? 0 : r; // no "-$0"
}

/** D51: full figures, no cents, no $K/$M. Nearest $100 at $10,000+, nearest $10 below. */
export function roundDollars(value: number): number {
  return roundTo(value, Math.abs(value) >= 10_000 ? 100 : 10);
}

export const formatDollars = (value: number): string => usd.format(roundDollars(value));

/** Proposed: percentages to 1 decimal. */
export const formatPercent = (value: number): string => `${oneDecimal.format(roundTo(value, 0.1))}%`;

/** ROI spread is in percentage points (D40). */
export const formatPoints = (value: number): string => `${whole.format(roundTo(value, 1))} pts`;

/** Proposed: payback to 1 decimal month. */
export const formatMonths = (value: number): string => `${oneDecimal.format(roundTo(value, 0.1))} months`;

/** Proposed: Priority Score to 2 decimals. */
export const formatScore = (value: number): string => twoDecimals.format(roundTo(value, 0.01));
