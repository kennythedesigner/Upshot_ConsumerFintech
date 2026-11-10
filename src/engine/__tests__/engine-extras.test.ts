/**
 * Cases the TRD doesn't list: states, edge cases, overlap, portfolio totals, display.
 */
import { describe, expect, it } from 'vitest';
import {
  calculateInitiative,
  calculatePortfolio,
  complexityLevel,
  createGoal,
  createInitiative,
  createPortfolio,
  formatDollars,
  formatPercent,
  formatScore,
  momentsOverlap,
  pressureLabel,
  roundDollars,
} from '..';
import { base } from '../examples';

describe('states (D46)', () => {
  it('empty when nothing is entered', () => {
    expect(calculateInitiative(createInitiative('p'), 12).state.kind).toBe('empty');
  });

  it('incomplete names what is missing', () => {
    const i = base();
    i.build_cost = null;
    const s = calculateInitiative(i, 12).state;
    expect(s).toEqual({ kind: 'incomplete', missing: [{ field: 'build_cost' }] });
  });

  it('a half-filled bucket is named, not silently dropped', () => {
    const i = base();
    i.buckets.saved.value_per_consumer = null;
    const s = calculateInitiative(i, 12).state;
    expect(s).toEqual({ kind: 'incomplete', missing: [{ field: 'bucket_value', bucket: 'saved' }] });
  });

  it('a blank bucket is left out of the math', () => {
    const i = base();
    i.buckets.saved.lift_pts = null;
    i.buckets.saved.value_per_consumer = null;
    const m = calculateInitiative(i, 12).metrics!;
    expect(m.buckets.saved).toBeUndefined();
    expect(m.monthlyImpact.expected).toBeCloseTo(0);
  });

  it('build cost of 0 counts as missing', () => {
    const i = base();
    i.build_cost = 0;
    expect(calculateInitiative(i, 12).state.kind).toBe('incomplete');
  });
});

describe('ranges', () => {
  it('override entered backwards is sorted (D16)', () => {
    const i = base();
    Object.assign(i.buckets.later, { override_on: true, override_low_pts: 3, override_high_pts: 1 });
    expect(calculateInitiative(i, 12).metrics!.buckets.later!.liftRangePts).toEqual({ low: 1, high: 3 });
  });

  it('override switched on but left blank falls back to the confidence spread', () => {
    const i = base();
    i.buckets.later.override_on = true;
    const b = calculateInitiative(i, 12).metrics!.buckets.later!;
    expect(b.customRange).toBe(false);
    expect(b.liftRangePts.low).toBeCloseTo(1);
    expect(b.liftRangePts.high).toBeCloseTo(3);
  });

  it('the high end of a lift is capped at 100 points', () => {
    const i = base();
    i.confidence = 'low';
    i.buckets.now.lift_pts = 80; // 80 × 1.75 = 140 → capped at 100
    expect(calculateInitiative(i, 12).metrics!.buckets.now!.liftRangePts.high).toBe(100);
  });
});

describe('flags', () => {
  it('speculative: expected ROI > 100% on low confidence', () => {
    const i = base();
    i.confidence = 'low';
    i.build_cost = 5_000; // 24,000 impact → ROI 380%
    expect(calculateInitiative(i, 12).flags.map((f) => f.kind)).toContain('speculative');
  });

  it('pressure note and "Other" moment show even before results', () => {
    const i = createInitiative('p');
    i.consumer_moment = 'other';
    i.pressure_patterns = ['urgency', 'guilt_wording'];
    const r = calculateInitiative(i, 12);
    expect(r.state.kind).toBe('incomplete');
    expect(r.pressure.label).toBe('pressure');
    expect(r.flags.map((f) => f.kind)).toEqual(['pressure_note', 'overlap_unchecked']);
  });

  it('labels from counts (D27, D35)', () => {
    expect([0, 1, 2, 3, 5].map(complexityLevel)).toEqual(['low', 'medium', 'medium', 'high', 'high']);
    expect([0, 1, 2, 6].map(pressureLabel)).toEqual(['none', 'mixed', 'pressure', 'pressure']);
  });
});

describe('overlap (D36, D42)', () => {
  it('next-door onboarding steps overlap; two apart do not', () => {
    expect(momentsOverlap('sign_up', 'verify_identity')).toBe(true);
    expect(momentsOverlap('sign_up', 'fund_account')).toBe(false);
  });
  it('ongoing moments overlap only when identical', () => {
    expect(momentsOverlap('fees_overdraft', 'fees_overdraft')).toBe(true);
    expect(momentsOverlap('fees_overdraft', 'support_disputes')).toBe(false);
  });
  it('onboarding never overlaps ongoing; Other never checks', () => {
    expect(momentsOverlap('first_transaction', 'everyday_use')).toBe(false);
    expect(momentsOverlap('other', 'other')).toBe(false);
  });
});

describe('portfolio totals (D45, D44)', () => {
  function doc() {
    const d = createPortfolio();
    d.portfolio.horizon_months = 12;
    const goal = createGoal(d.portfolio.id, 'Trust', 0);
    d.goals.push(goal);

    const a = base(); // expected 24,000, cost 20,000, medium
    a.goal_id = goal.id;
    a.must_do = true;

    const b = base(); // same moment as A → overlap
    b.confidence = 'high';
    b.evidence_type = 'analytics';
    b.build_cost = 10_000;

    const c = createInitiative(d.portfolio.id, 'Unfinished'); // incomplete → not counted
    c.consumer_moment = 'sign_up';

    d.initiatives.push(a, b, c);
    return { d, a, b, c };
  }

  it('sums counted initiatives only and lists the rest', () => {
    const { d, c } = doc();
    const p = calculatePortfolio(d);
    expect(p.counted).toHaveLength(2);
    expect(p.notCounted).toEqual([c.id]);
    expect(p.totals.expectedImpact).toBeCloseTo(48_000);
    expect(p.totals.confidenceWeightedImpact).toBeCloseTo(24_000 * 0.6 + 24_000 * 0.9);
    expect(p.totals.totalCost).toBeCloseTo(30_000);
    expect(p.totals.roiPct).toBeCloseTo(60);
  });

  it('shows the must-do share and goal subtotals', () => {
    const { d } = doc();
    const p = calculatePortfolio(d);
    expect(p.mustDo).toEqual({ count: 1, expectedImpact: expect.closeTo(24_000), totalCost: 20_000 });
    expect(p.byGoal.map((g) => [g.goalName, g.count])).toEqual([
      ['Trust', 1],
      ['No goal', 1],
    ]);
  });

  it('warns about double counting but keeps both initiatives', () => {
    const { d } = doc();
    const p = calculatePortfolio(d);
    expect(p.doubleCountWarning).toEqual({ count: 2 });
    expect(p.totals.count).toBe(2);
  });

  it('a not-live initiative adds its build cost but no impact', () => {
    const { d, b } = doc();
    b.months_until_live = 12;
    const p = calculatePortfolio(d);
    expect(p.totals.expectedImpact).toBeCloseTo(24_000);
    expect(p.totals.totalCost).toBeCloseTo(30_000);
  });

  it('empty portfolio has no ROI', () => {
    expect(calculatePortfolio(createPortfolio()).totals.roiPct).toBeNull();
  });
});

describe('display (D51)', () => {
  it('rounds to $100 at $10,000 and above, $10 below', () => {
    expect(roundDollars(12_345)).toBe(12_300);
    expect(roundDollars(9_994)).toBe(9_990);
    expect(roundDollars(-168_049)).toBe(-168_000);
    expect(roundDollars(-4)).toBe(0);
    expect(formatDollars(216_000)).toBe('$216,000');
    expect(formatDollars(-15_050)).toBe('-$15,100');
  });
  it('percent and score precision', () => {
    expect(formatPercent(-940)).toBe('-940.0%');
    expect(formatScore(0.288)).toBe('0.29');
  });
});
