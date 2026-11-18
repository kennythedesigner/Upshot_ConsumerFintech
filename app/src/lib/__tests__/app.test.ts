import { calculateInitiative } from '@engine';
import { describe, expect, it } from 'vitest';
import { workedExample } from '../example';
import { formatForInput, money, parseNumberInput, percent, signedMoney } from '../numbers';

describe('reading typed numbers', () => {
  it('accepts the ways people actually type', () => {
    expect(parseNumberInput('$240,000')).toEqual({ ok: true, value: 240_000 });
    expect(parseNumberInput('1.2 points')).toEqual({ ok: true, value: 1.2 });
    expect(parseNumberInput('−4')).toEqual({ ok: true, value: -4 });
    expect(parseNumberInput(' 180 000 ')).toEqual({ ok: true, value: 180_000 });
    expect(parseNumberInput('.5')).toEqual({ ok: true, value: 0.5 });
  });

  it('treats blank and half-typed values as no value, not an error', () => {
    for (const raw of ['', ' ', '-', '.', '-.']) {
      expect(parseNumberInput(raw)).toEqual({ ok: true, value: null });
    }
  });

  it('rejects text that is not a number', () => {
    expect(parseNumberInput('abc').ok).toBe(false);
    expect(parseNumberInput('1.2.3').ok).toBe(false);
    expect(parseNumberInput('4-').ok).toBe(false);
  });

  it('shows typed values back with a true minus and their cents', () => {
    expect(formatForInput(-4, 'money')).toBe('−$4');
    expect(formatForInput(4.5, 'money')).toBe('$4.5');
    expect(formatForInput(180_000, 'count')).toBe('180,000');
    expect(formatForInput(1.25, 'points')).toBe('1.25');
  });
});

describe('output figures', () => {
  it('use the engine rounding with a true minus', () => {
    expect(money(-103_680)).toBe('−$103,700');
    expect(signedMoney(1_723_680)).toBe('+$1,723,700');
    expect(signedMoney(0)).toBe('$0');
    expect(percent(-940)).toBe('−940%');
  });
});

describe('the worked example', () => {
  const at = (h: number) => calculateInitiative(workedExample('p'), h);

  it('reaches results with every required input', () => {
    expect(at(12).state.kind).toBe('results');
  });

  it('keeps Revenue now as a loss: a positive lift at −$4', () => {
    const m = at(12).metrics!;
    // 180,000 × 1.2% × −$4 = −$8,640 a month
    expect(m.buckets.now!.monthly.expected).toBeCloseTo(-8_640);
  });

  it('matches hand-worked 12-month figures at Medium confidence (±50%)', () => {
    const m = at(12).metrics!;
    // Monthly: −8,640 + 143,640 + 67,320 = 202,320
    expect(m.monthlyImpact.expected).toBeCloseTo(202_320);
    expect(m.impact.expected - m.totalCost).toBeCloseTo(2_187_840);
    expect(m.roiPct!.expected).toBeCloseTo(911.6, 1);
    // Low: −12,960 + 71,820 + 33,660 = 92,520 a month
    expect(m.monthlyImpact.low).toBeCloseTo(92_520);
    // High: −4,320 + 215,460 + 100,980 = 312,120 a month
    expect(m.monthlyImpact.high).toBeCloseTo(312_120);
  });

  it('fires the pressure note always, and "best case may be optimistic" only once the window is long', () => {
    const kinds = (h: number) => at(h).flags.map((f) => f.kind);
    expect(kinds(3)).toEqual(['pressure_note']);
    expect(kinds(12)).toContain('optimistic');
  });
});
