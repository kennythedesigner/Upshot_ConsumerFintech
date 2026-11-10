/**
 * TRD "Testing" cases 1–9, with the TRD's known answers.
 * If the math changes, these must keep passing.
 */
import { describe, expect, it } from 'vitest';
import { base } from '../examples';
import {
  calculateInitiative,
  doesNotPayBack,
  isShortWindow,
  waitingIsCheaper,
  type InitiativeResult,
} from '..';

const flagKinds = (r: InitiativeResult) => r.flags.map((f) => f.kind);

describe('TRD test cases', () => {
  it('1. Base', () => {
    const r = calculateInitiative(base(), 12);
    expect(r.state.kind).toBe('results');
    const m = r.metrics!;
    expect(m.monthlyImpact.expected).toBeCloseTo(2_000);
    expect(m.impact.low).toBeCloseTo(-168_000);
    expect(m.impact.expected).toBeCloseTo(24_000);
    expect(m.impact.high).toBeCloseTo(216_000);
    expect(m.roiPct!.low).toBeCloseTo(-940);
    expect(m.roiPct!.expected).toBeCloseTo(20);
    expect(m.roiPct!.high).toBeCloseTo(980);
    expect(m.roiSpreadPts).toBeCloseTo(1_920);
    expect(m.priorityScore).toBeCloseTo(0.72);
    expect(m.costOfDelay).toBeCloseTo(2_000);
    expect(m.paybackMonths).toBeCloseTo(10.0);
    expect(flagKinds(r)).toEqual(['optimistic']);
    // Sign rule: Value Now is negative, so its loss grows in Low.
    expect(m.buckets.now!.monthly.low).toBeCloseTo(-22_500);
    expect(m.buckets.now!.monthly.high).toBeCloseTo(-7_500);
  });

  it('2. Short window', () => {
    const r = calculateInitiative(base(), 3);
    const m = r.metrics!;
    expect(m.impact.expected).toBeCloseTo(6_000);
    expect(m.roiPct!.expected).toBeCloseTo(-70);
    expect(m.priorityScore).toBeCloseTo(0.18);
    expect(isShortWindow(3)).toBe(true);
  });

  it('3. Late launch', () => {
    const i = base();
    i.months_until_live = 2;
    const m = calculateInitiative(i, 12).metrics!;
    expect(m.liveMonths).toBe(10);
    expect(m.impact.expected).toBeCloseTo(20_000);
    expect(m.roiPct!.expected).toBeCloseTo(0);
    expect(m.priorityScore).toBeCloseTo(0.6);
    expect(m.paybackMonths).toBeCloseTo(12.0);
  });

  it('4. Not live', () => {
    const i = base();
    i.months_until_live = 12;
    const r = calculateInitiative(i, 12);
    expect(r.state.kind).toBe('not_live');
    expect(r.metrics!.liveMonths).toBe(0);
  });

  it('5. Run cost', () => {
    const i = base();
    i.run_cost_per_month = 2_500;
    const m = calculateInitiative(i, 12).metrics!;
    expect(m.totalCost).toBeCloseTo(50_000);
    expect(m.roiPct!.expected).toBeCloseTo(-52);
    expect(m.costOfDelay).toBeCloseTo(-500);
    expect(waitingIsCheaper(m)).toBe(true);
    expect(doesNotPayBack(m)).toBe(true);
    expect(m.priorityScore).toBeCloseTo(0.288); // shows as 0.29
  });

  it('6. Mismatch', () => {
    const i = base();
    i.confidence = 'high';
    i.evidence_type = 'expert_opinion';
    expect(flagKinds(calculateInitiative(i, 12))).toContain('evidence_mismatch');
  });

  it('7. High lifts', () => {
    const i = base();
    i.buckets.now.lift_pts = 35;
    i.buckets.later.lift_pts = 6;
    const kinds = flagKinds(calculateInitiative(i, 12));
    expect(kinds).toContain('lift_high');
    expect(kinds).toContain('retention_lift_high');
  });

  it('8. Override', () => {
    const i = base();
    i.buckets.later.override_on = true;
    i.buckets.later.override_low_pts = 1;
    i.buckets.later.override_high_pts = 3;
    const b = calculateInitiative(i, 12).metrics!.buckets.later!;
    expect(b.customRange).toBe(true);
    expect(b.liftRangePts).toEqual({ low: 1, high: 3 });
    expect(b.monthly.low).toBeCloseTo(5000 * 0.01 * 150);
    expect(b.monthly.high).toBeCloseTo(5000 * 0.03 * 150);
  });

  it('9. Negative bucket', () => {
    const i = base();
    i.buckets.saved.value_per_consumer = -8;
    const r = calculateInitiative(i, 12);
    const m = r.metrics!;
    expect(m.monthlyImpact.expected).toBeCloseTo(-2_000);
    expect(m.impact.low).toBeCloseTo(-216_000);
    expect(m.impact.expected).toBeCloseTo(-24_000);
    expect(m.impact.high).toBeCloseTo(168_000);
    expect(m.roiPct!.low).toBeCloseTo(-1_180);
    expect(m.roiPct!.expected).toBeCloseTo(-220);
    expect(m.roiPct!.high).toBeCloseTo(740);
    expect(m.priorityScore).toBeCloseTo(-0.72);
    expect(waitingIsCheaper(m)).toBe(true);
    expect(doesNotPayBack(m)).toBe(true);
    expect(flagKinds(r)).toEqual(['optimistic']);
  });
});
