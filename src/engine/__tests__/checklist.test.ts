/**
 * Testing & Security Checklist, section 1: the cases the TRD tests don't
 * already cover, plus the "fires at its threshold and only at its threshold"
 * checks from section 2.
 */
import { describe, expect, it } from 'vitest';
import { calculateInitiative, calculatePortfolio, createPortfolio } from '..';
import { base } from '../examples';

const kinds = (i: ReturnType<typeof base>, horizon = 12) =>
  calculateInitiative(i, horizon).flags.map((f) => f.kind);

describe('D10 / D17: negative buckets', () => {
  it('a negative Value Later alone: Low is more negative than Expected', () => {
    const i = base();
    i.buckets.later.value_per_consumer = -150; // 5,000 × 2% × −150 = −15,000/mo
    const b = calculateInitiative(i, 12).metrics!.buckets.later!;
    expect(b.monthly.expected).toBeCloseTo(-15_000);
    expect(b.monthly.low).toBeCloseTo(-22_500);
    expect(b.monthly.high).toBeCloseTo(-7_500);
  });

  it('all three buckets negative at once', () => {
    const i = base();
    i.buckets.later.value_per_consumer = -150;
    i.buckets.saved.value_per_consumer = -8;
    const m = calculateInitiative(i, 12).metrics!;
    // Now −15,000 · Later −15,000 · Saved −2,000 = −32,000/mo
    expect(m.monthlyImpact.expected).toBeCloseTo(-32_000);
    expect(m.monthlyImpact.low).toBeCloseTo(-48_000);
    expect(m.monthlyImpact.high).toBeCloseTo(-16_000);
    expect(m.priorityScore!).toBeLessThan(0);
  });
});

describe('D16: an override touches its own bucket only', () => {
  it('other buckets keep the confidence spread', () => {
    const i = base();
    Object.assign(i.buckets.later, { override_on: true, override_low_pts: 1, override_high_pts: 3 });
    const m = calculateInitiative(i, 12).metrics!;
    expect(m.buckets.now!.customRange).toBe(false);
    expect(m.buckets.now!.liftRangePts).toEqual({ low: 5, high: 15 }); // 10 ± 50%
    expect(m.buckets.saved!.liftRangePts).toEqual({ low: 2.5, high: 7.5 });
  });
});

describe('D21: live months never go below 0', () => {
  it('months until live past the horizon', () => {
    const i = base();
    i.months_until_live = 18;
    const r = calculateInitiative(i, 12);
    expect(r.state.kind).toBe('not_live');
    expect(r.metrics!.liveMonths).toBe(0);
    expect(r.metrics!.impact.expected).toBe(0);
  });
});

describe('D45: portfolio with a negative initiative and a must-do', () => {
  it('negative impacts reduce the total; must-do share still reported', () => {
    const d = createPortfolio();
    d.portfolio.horizon_months = 12;
    const up = base(); // +24,000, cost 20,000
    const down = base(); // −24,000, cost 20,000
    down.buckets.saved.value_per_consumer = -8;
    down.must_do = true;
    d.initiatives.push(up, down);
    const p = calculatePortfolio(d);
    expect(p.totals.expectedImpact).toBeCloseTo(0);
    expect(p.totals.totalCost).toBeCloseTo(40_000);
    expect(p.totals.roiPct).toBeCloseTo(-100);
    expect(p.mustDo.expectedImpact).toBeCloseTo(-24_000);
  });
});

describe('D43 / D31: flags fire at their threshold and only there', () => {
  it('lift exactly 30 points: no flag; above 30: flag', () => {
    const i = base();
    i.buckets.now.lift_pts = 30;
    expect(kinds(i)).not.toContain('lift_high');
    i.buckets.now.lift_pts = 30.5;
    expect(kinds(i)).toContain('lift_high');
  });

  it('Value Later lift exactly 5 points: no flag; above 5: flag', () => {
    const i = base();
    i.buckets.later.lift_pts = 5;
    expect(kinds(i)).not.toContain('retention_lift_high');
    i.buckets.later.lift_pts = 5.5;
    expect(kinds(i)).toContain('retention_lift_high');
  });

  it('speculative: needs ROI above 100% AND Low confidence', () => {
    const i = base();
    i.build_cost = 12_000; // 24,000 impact → ROI exactly 100%
    i.confidence = 'low';
    expect(kinds(i)).not.toContain('speculative');
    i.build_cost = 11_000; // ROI ≈ 118%
    expect(kinds(i)).toContain('speculative');
    i.confidence = 'medium';
    expect(kinds(i)).not.toContain('speculative');
  });

  it('optimistic: ROI High exactly 500%: no flag; above: flag', () => {
    const i = base();
    // High impact 216,000 at 12 months. ROI High = 500% when cost = 36,000.
    i.build_cost = 36_000;
    expect(kinds(i)).not.toContain('optimistic');
    i.build_cost = 35_000;
    expect(kinds(i)).toContain('optimistic');
  });

  it('High confidence with Analytics or Experiment: no evidence warning', () => {
    for (const ev of ['analytics', 'experiment'] as const) {
      const i = base();
      i.confidence = 'high';
      i.evidence_type = ev;
      expect(kinds(i)).not.toContain('evidence_mismatch');
    }
    for (const ev of ['benchmark', 'expert_opinion', 'none'] as const) {
      const i = base();
      i.confidence = 'high';
      i.evidence_type = ev;
      expect(kinds(i)).toContain('evidence_mismatch');
    }
  });
});
