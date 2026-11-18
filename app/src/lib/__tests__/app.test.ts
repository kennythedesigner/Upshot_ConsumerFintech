import { calculateInitiative, calculatePortfolio, createInitiative, createPortfolio, type HorizonMonths } from '@engine';
import { describe, expect, it } from 'vitest';
import { workedExample, workedExampleB, workedPair } from '../example';
import { formatForInput, money, parseNumberInput, percent, signedMoney } from '../numbers';
import { parseHash, toHash } from '../router';
import { normalize, removeInitiative, restoreInitiative, upsertInitiative } from '../session';
import { OTHER, assignColors } from '../series';
import { niceTicks } from '../../components/RangeChart';
import { sortInitiatives } from '../../screens/DashboardScreen';

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

describe('initiative B, the premium-upgrade prompt', () => {
  const b = () => calculateInitiative(workedExampleB('p'), 12);

  it('reaches results, with Cost saved left unused', () => {
    const r = b();
    expect(r.state.kind).toBe('results');
    expect(r.metrics!.buckets.saved).toBeUndefined();
  });

  it('matches hand-worked 12-month figures: one month to go live, run cost included', () => {
    const m = b().metrics!;
    // 120,000 × 1.5% × $24 + 120,000 × 0.8% × $60 = 43,200 + 57,600
    expect(m.monthlyImpact.expected).toBeCloseTo(100_800);
    expect(m.liveMonths).toBe(11);
    expect(m.totalCost).toBeCloseTo(90_000 + 1_500 * 11);
    expect(m.impact.expected - m.totalCost).toBeCloseTo(1_002_300);
    expect(m.roiPct!.expected).toBeCloseTo(941.1, 1);
  });

  it('lands near A on ROI but differs on confidence and pressure', () => {
    const kinds = b().flags.map((f) => f.kind);
    expect(kinds).toEqual(expect.arrayContaining(['pressure_note', 'speculative', 'optimistic']));
    expect(b().pressure.label).toBe('pressure');
  });

  it('is stamped after A, so the list keeps A first', () => {
    const [a, bb] = workedPair('p');
    expect(bb.updated_at > a.updated_at).toBe(true);
  });
});

describe('routes', () => {
  it('reads and writes plain #names', () => {
    expect(parseHash('')).toEqual({ screen: 'dashboard' });
    expect(parseHash('#new')).toEqual({ screen: 'new' });
    expect(parseHash('#edit-3f2a-9c')).toEqual({ screen: 'edit', id: '3f2a-9c' });
    expect(parseHash('#settings')).toEqual({ screen: 'dashboard' });
    expect(toHash({ screen: 'edit', id: 'abc-1' })).toBe('#edit-abc-1');
  });
});

describe('the session list', () => {
  const doc = () => {
    const d = createPortfolio();
    const [a, b] = workedPair(d.portfolio.id);
    return { ...d, initiatives: [a, b] };
  };

  it('saving an existing initiative keeps its place', () => {
    const d = doc();
    const edited = { ...d.initiatives[0]!, name: 'Renamed' };
    const next = upsertInitiative(d, edited);
    expect(next.initiatives.map((i) => i.name)).toEqual(['Renamed', d.initiatives[1]!.name]);
  });

  it('undo puts a deleted initiative back where it was', () => {
    const d = doc();
    const first = d.initiatives[0]!;
    const back = restoreInitiative(removeInitiative(d, first.id), first, 0);
    expect(back.initiatives.map((i) => i.id)).toEqual(d.initiatives.map((i) => i.id));
  });
});

describe('colours follow the initiative, not its place', () => {
  const docWith = (n: number) => {
    const d = createPortfolio();
    const list = Array.from({ length: n }, (_, k) => ({ ...workedExample(d.portfolio.id), id: `i${k}` }));
    return { ...d, initiatives: list };
  };

  it('gives the first four their own colours and the rest Other', () => {
    const c = assignColors(docWith(6), {});
    expect([c.i0, c.i1, c.i2, c.i3, c.i4, c.i5]).toEqual([0, 1, 2, 3, OTHER, OTHER]);
  });

  it('keeps survivors’ colours when one is deleted, and hands the freed colour to the next new one', () => {
    const d = docWith(3);
    const first = assignColors(d, {});
    const afterDelete = assignColors({ ...d, initiatives: d.initiatives.filter((i) => i.id !== 'i0') }, first);
    expect(afterDelete).toEqual({ i1: 1, i2: 2 });
    const added = { ...d, initiatives: [...d.initiatives.filter((i) => i.id !== 'i0'), { ...d.initiatives[0]!, id: 'new' }] };
    expect(assignColors(added, afterDelete).new).toBe(0);
  });
});

describe('the compared pair', () => {
  const base = () => {
    const d = createPortfolio();
    const [a, b] = workedPair(d.portfolio.id);
    return { doc: { ...d, initiatives: [a, b] }, exampleIds: [], colors: {}, compare: { a: null, b: null }, sort: 'added' as const };
  };

  it('defaults to the first two, in list order', () => {
    const s = normalize(base());
    expect([s.compare.a, s.compare.b]).toEqual(s.doc.initiatives.map((i) => i.id));
  });

  it('never compares an initiative with itself, and drops a deleted one', () => {
    const s0 = base();
    const [a, b] = s0.doc.initiatives;
    expect(normalize({ ...s0, compare: { a: a!.id, b: a!.id } }).compare).toEqual({ a: a!.id, b: b!.id });
    const gone = normalize({ ...s0, doc: { ...s0.doc, initiatives: [b!] }, compare: { a: a!.id, b: b!.id } });
    expect(gone.compare).toEqual({ a: b!.id, b: null });
  });
});

describe('chart ticks', () => {
  it('land on clean numbers and include zero when the range crosses it', () => {
    const t = niceTicks(-500_000, 3_500_000, 5);
    expect(t).toContain(0);
    expect(t.every((v) => v % 500_000 === 0)).toBe(true);
    expect(t[0]).toBeLessThanOrEqual(-500_000);
    expect(t.at(-1)).toBeGreaterThanOrEqual(3_500_000);
  });
});

describe('the dashboard', () => {
  const twelve = () => {
    const d = createPortfolio();
    d.portfolio.horizon_months = 12 as HorizonMonths;
    const [a, b] = workedPair(d.portfolio.id);
    return { ...d, initiatives: [a, b] };
  };

  it('adds base cases only, matching the hand math at 12 months', () => {
    const p = calculatePortfolio(twelve());
    // A: 2,427,840 expected, 240,000 cost. B: 1,108,800 expected, 90,000 + 11 × 1,500 = 106,500 cost.
    expect(p.totals.expectedImpact).toBeCloseTo(3_536_640, 2);
    expect(p.totals.totalCost).toBe(346_500);
    // Weighted: A at medium (0.6) + B at low (0.3).
    expect(p.totals.confidenceWeightedImpact).toBeCloseTo(2_427_840 * 0.6 + 1_108_800 * 0.3, 2);
    // (3,536,640 − 346,500) ÷ 346,500.
    expect(p.totals.roiPct).toBeCloseTo(920.675, 2);
    expect(p.notCounted).toEqual([]);
  });

  it('leaves an initiative missing inputs out of the totals', () => {
    const doc = twelve();
    const blank = createInitiative(doc.portfolio.id, 'Half-filled');
    const p = calculatePortfolio({ ...doc, initiatives: [...doc.initiatives, blank] });
    expect(p.notCounted).toEqual([blank.id]);
    expect(p.totals.totalCost).toBe(346_500);
  });

  it('sorts as a lens, keeping rows without figures last', () => {
    const doc = twelve();
    const [a, b] = doc.initiatives;
    const blank = createInitiative(doc.portfolio.id, 'Half-filled');
    const list = [blank, a!, b!];
    const { results } = calculatePortfolio({ ...doc, initiatives: list });
    const order = (key: Parameters<typeof sortInitiatives>[2]) =>
      sortInitiatives(list, results, key).map((i) => i.name);
    expect(order('added')).toEqual([blank.name, a!.name, b!.name]);
    expect(order('net')).toEqual([a!.name, b!.name, blank.name]);
    expect(order('roi')).toEqual([b!.name, a!.name, blank.name]); // 941% vs 912%
    expect(order('spread')).toEqual([b!.name, a!.name, blank.name]); // 1,562 vs 1,098 pts
    expect(order('priority')).toEqual([a!.name, b!.name, blank.name]); // 6.07 vs 3.12
  });
});
