/**
 * The calculation engine for one initiative (TRD "Calculation engine").
 * Plain functions: inputs in, outputs out. No screen code, no storage.
 * Every result is recomputed from inputs on each call (Schema rule 1).
 */
import {
  CONFIDENCE_FACTOR,
  CONFIDENCE_SPREAD,
  FLAG_THRESHOLDS,
  MAX_LIFT_PTS,
  STRONG_EVIDENCE,
} from './settings';
import type {
  BucketKind,
  ComplexityFactor,
  Initiative,
  PressurePattern,
  ValueBucket,
} from './types';
import { BUCKET_KINDS } from './types';

// ── Output shapes ──

/** Low = worst for the business, High = best (D17). */
export interface Range {
  low: number;
  expected: number;
  high: number;
}

export interface BucketResult {
  kind: BucketKind;
  /** Dollars per month at Low / Expected / High lift. */
  monthly: Range;
  /** The lift ends actually used, in points (after sorting and capping). */
  liftRangePts: { low: number; high: number };
  /** True when the PM's own range replaced the confidence spread (D16). */
  customRange: boolean;
  note: string | null;
}

export type MissingField =
  | { field: 'consumer_moment' }
  | { field: 'consumers_per_month' }
  | { field: 'value_bucket' }
  | { field: 'bucket_lift'; bucket: BucketKind }
  | { field: 'bucket_value'; bucket: BucketKind }
  | { field: 'build_cost' }
  | { field: 'confidence' };

/** Only one main state shows at a time, checked in this order (TRD "State precedence"). */
export type MainState =
  | { kind: 'empty' }
  | { kind: 'incomplete'; missing: MissingField[] }
  | { kind: 'not_live' }
  | { kind: 'results' };

export type ComplexityLevel = 'low' | 'medium' | 'high';
export type PressureLabel = 'none' | 'mixed' | 'pressure';

export type Flag =
  | { kind: 'evidence_mismatch' }
  | { kind: 'lift_high'; buckets: BucketKind[] }
  | { kind: 'retention_lift_high' }
  | { kind: 'speculative' }
  | { kind: 'optimistic' }
  | { kind: 'pressure_note'; count: number }
  | { kind: 'overlap_unchecked' };

export interface Metrics {
  liveMonths: number;
  buckets: Partial<Record<BucketKind, BucketResult>>;
  /** Dollars per month. */
  monthlyImpact: Range;
  /** Dollars over the live months in the window. */
  impact: Range;
  totalCost: number;
  /** Percent. null only if total cost is 0, which validation prevents. */
  roiPct: Range | null;
  roiSpreadPts: number | null;
  priorityScore: number | null;
  /** Net dollars per month lost by waiting (D28). Negative = waiting is cheaper. */
  costOfDelay: number;
  /** Months from today. null = doesn't pay back in this scenario (D29). */
  paybackMonths: number | null;
}

export interface InitiativeResult {
  state: MainState;
  /** Present whenever every required input is in (results or not_live). */
  metrics: Metrics | null;
  complexity: { level: ComplexityLevel; factors: ComplexityFactor[] };
  pressure: { label: PressureLabel; count: number; patterns: PressurePattern[] };
  flags: Flag[];
}

// ── Small pure helpers ──

/** D21: never below 0. */
export const liveMonths = (horizon: number, monthsUntilLive: number): number =>
  Math.max(horizon - monthsUntilLive, 0);

/** D27: 0 = Low, 1–2 = Medium, 3+ = High. */
export function complexityLevel(count: number): ComplexityLevel {
  if (count === 0) return 'low';
  if (count <= 2) return 'medium';
  return 'high';
}

/** D35: 0 = No pressure patterns, 1 = Mixed, 2+ = Pressure. */
export function pressureLabel(count: number): PressureLabel {
  if (count === 0) return 'none';
  if (count === 1) return 'mixed';
  return 'pressure';
}

const isBlank = (n: number | null | undefined): n is null | undefined =>
  n === null || n === undefined || Number.isNaN(n);

const clampLift = (pts: number): number => Math.min(Math.max(pts, 0), MAX_LIFT_PTS);

/** A bucket counts once its lift is filled (Schema rule 2). */
const bucketTouched = (b: ValueBucket): boolean =>
  !isBlank(b.lift_pts) || !isBlank(b.value_per_consumer);

const bucketComplete = (b: ValueBucket): boolean =>
  !isBlank(b.lift_pts) && !isBlank(b.value_per_consumer);

// ── Bucket math (D09, D15–D18) ──

export function calculateBucket(
  bucket: ValueBucket,
  consumersPerMonth: number,
  spread: number,
): BucketResult {
  const liftPts = bucket.lift_pts as number;
  const dollars = bucket.value_per_consumer as number;

  const useOverride =
    bucket.override_on && !isBlank(bucket.override_low_pts) && !isBlank(bucket.override_high_pts);

  let endA: number;
  let endB: number;
  if (useOverride) {
    // D16: the PM's lowest and highest believable change. Sorted below if entered backwards.
    endA = bucket.override_low_pts as number;
    endB = bucket.override_high_pts as number;
  } else {
    // D15: confidence spread around the entered lift.
    endA = liftPts * (1 - spread);
    endB = liftPts * (1 + spread);
  }
  // A lift can't exceed 100 points (every affected consumer). See README "Judgment calls".
  const liftLow = clampLift(Math.min(endA, endB));
  const liftHigh = clampLift(Math.max(endA, endB));

  const valueAt = (pts: number): number => consumersPerMonth * (pts / 100) * dollars;
  const atLow = valueAt(liftLow);
  const atHigh = valueAt(liftHigh);

  return {
    kind: bucket.kind,
    monthly: {
      // D17 sign rule: whichever end is worse for the business is Low.
      low: Math.min(atLow, atHigh),
      expected: valueAt(liftPts),
      high: Math.max(atLow, atHigh),
    },
    liftRangePts: { low: liftLow, high: liftHigh },
    customRange: useOverride,
    note: useOverride ? bucket.override_note : null,
  };
}

// ── Required fields and state (D46) ──

export function findMissing(i: Initiative): MissingField[] {
  const missing: MissingField[] = [];
  if (i.consumer_moment === null) missing.push({ field: 'consumer_moment' });
  if (isBlank(i.consumers_per_month) || i.consumers_per_month < 0)
    missing.push({ field: 'consumers_per_month' });

  const buckets = BUCKET_KINDS.map((k) => i.buckets[k]);
  if (!buckets.some(bucketComplete)) {
    // Point at a half-filled bucket if there is one; otherwise ask for any bucket.
    const half = buckets.find((b) => bucketTouched(b) && !bucketComplete(b));
    if (!half) missing.push({ field: 'value_bucket' });
  }
  for (const b of buckets) {
    if (bucketTouched(b) && !bucketComplete(b)) {
      missing.push(
        isBlank(b.lift_pts)
          ? { field: 'bucket_lift', bucket: b.kind }
          : { field: 'bucket_value', bucket: b.kind },
      );
    }
  }

  if (isBlank(i.build_cost) || i.build_cost <= 0) missing.push({ field: 'build_cost' });
  if (i.confidence === null) missing.push({ field: 'confidence' });
  return missing;
}

export function isEmpty(i: Initiative): boolean {
  return (
    i.consumer_moment === null &&
    isBlank(i.consumers_per_month) &&
    isBlank(i.build_cost) &&
    i.confidence === null &&
    !BUCKET_KINDS.some((k) => bucketTouched(i.buckets[k]))
  );
}

// ── Whole initiative ──

export function calculateInitiative(i: Initiative, horizonMonths: number): InitiativeResult {
  const complexity = {
    level: complexityLevel(i.complexity_factors.length),
    factors: [...i.complexity_factors],
  };
  const pressure = {
    label: pressureLabel(i.pressure_patterns.length),
    count: i.pressure_patterns.length,
    patterns: [...i.pressure_patterns],
  };

  // Flags that depend only on inputs show even before results do.
  const flags: Flag[] = [];
  if (i.confidence === 'high' && !(STRONG_EVIDENCE as readonly string[]).includes(i.evidence_type ?? '')) {
    flags.push({ kind: 'evidence_mismatch' }); // D31
  }
  if (pressure.count > 0) flags.push({ kind: 'pressure_note', count: pressure.count }); // D35
  if (i.consumer_moment === 'other') flags.push({ kind: 'overlap_unchecked' }); // D42

  if (isEmpty(i)) return { state: { kind: 'empty' }, metrics: null, complexity, pressure, flags };

  const missing = findMissing(i);
  if (missing.length > 0) {
    return { state: { kind: 'incomplete', missing }, metrics: null, complexity, pressure, flags };
  }

  // From here every required input is present.
  const consumers = i.consumers_per_month as number;
  const confidence = i.confidence!;
  const buildCost = i.build_cost as number;
  const runCost = i.run_cost_per_month;
  const spread = CONFIDENCE_SPREAD[confidence];
  const factor = CONFIDENCE_FACTOR[confidence];

  const M = liveMonths(horizonMonths, i.months_until_live);

  const buckets: Partial<Record<BucketKind, BucketResult>> = {};
  const monthlyImpact: Range = { low: 0, expected: 0, high: 0 };
  for (const kind of BUCKET_KINDS) {
    const b = i.buckets[kind];
    if (!bucketComplete(b)) continue; // blank = unused
    const r = calculateBucket(b, consumers, spread);
    buckets[kind] = r;
    // D18: all buckets move to Low or High together.
    monthlyImpact.low += r.monthly.low;
    monthlyImpact.expected += r.monthly.expected;
    monthlyImpact.high += r.monthly.high;
  }

  // D13: linear accrual over live months.
  const impact: Range = {
    low: monthlyImpact.low * M,
    expected: monthlyImpact.expected * M,
    high: monthlyImpact.high * M,
  };

  const totalCost = buildCost + runCost * M; // D41

  const roi = (x: number): number => ((x - totalCost) / totalCost) * 100;
  const roiPct: Range | null =
    totalCost > 0 ? { low: roi(impact.low), expected: roi(impact.expected), high: roi(impact.high) } : null;

  const costOfDelay = monthlyImpact.expected - runCost; // D28
  const paybackMonths = costOfDelay > 0 ? i.months_until_live + buildCost / costOfDelay : null; // D29

  const metrics: Metrics = {
    liveMonths: M,
    buckets,
    monthlyImpact,
    impact,
    totalCost,
    roiPct,
    roiSpreadPts: roiPct ? roiPct.high - roiPct.low : null, // D40
    priorityScore: totalCost > 0 ? (impact.expected * factor) / totalCost : null, // D25
    costOfDelay,
    paybackMonths,
  };

  if (M === 0) {
    return { state: { kind: 'not_live' }, metrics, complexity, pressure, flags };
  }

  // D43 sanity flags.
  const highLift = BUCKET_KINDS.filter(
    (k) => buckets[k] && (i.buckets[k].lift_pts as number) > FLAG_THRESHOLDS.liftHighPts,
  );
  if (highLift.length) flags.push({ kind: 'lift_high', buckets: highLift });
  if (buckets.later && (i.buckets.later.lift_pts as number) > FLAG_THRESHOLDS.retentionLiftHighPts) {
    flags.push({ kind: 'retention_lift_high' });
  }
  if (roiPct && roiPct.expected > FLAG_THRESHOLDS.speculativeRoiPct && confidence === 'low') {
    flags.push({ kind: 'speculative' });
  }
  if (roiPct && roiPct.high > FLAG_THRESHOLDS.optimisticRoiHighPct) {
    flags.push({ kind: 'optimistic' });
  }

  return { state: { kind: 'results' }, metrics, complexity, pressure, flags };
}

/** Layered states on top of results (TRD "State precedence", step 4). */
export const waitingIsCheaper = (m: Metrics): boolean => m.costOfDelay < 0; // D28
export const doesNotPayBack = (m: Metrics): boolean => m.paybackMonths === null; // D29
