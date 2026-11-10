/**
 * Portfolio dashboard math (D45, D44, D26, D32–D33, D40).
 * Each initiative keeps its own range; there is no portfolio Low/High (D45).
 */
import { calculateInitiative, type ComplexityLevel, type InitiativeResult } from './calculate';
import { findOverlaps, type OverlapReport } from './overlap';
import { CONFIDENCE_FACTOR } from './settings';
import type { Initiative, PortfolioDocument } from './types';

export interface Totals {
  count: number;
  expectedImpact: number;
  confidenceWeightedImpact: number;
  totalCost: number;
  /** Percent. null when total cost is 0 (no initiatives counted). */
  roiPct: number | null;
}

export interface GoalSubtotal extends Totals {
  /** null = initiatives with no goal tag. */
  goalId: string | null;
  goalName: string;
}

export interface MapPoint {
  id: string;
  name: string;
  expectedImpact: number;
  complexity: ComplexityLevel;
  mustDo: boolean;
}

export interface PortfolioResult {
  /** Per-initiative results, keyed by id, for the dashboard rows. */
  results: Map<string, InitiativeResult>;
  /** Initiatives with every required input; only these are summed. */
  counted: string[];
  /** Initiatives still missing a required input; listed, never summed. */
  notCounted: string[];
  totals: Totals;
  mustDo: { count: number; expectedImpact: number; totalCost: number };
  byGoal: GoalSubtotal[];
  overlap: OverlapReport;
  /** D44: "Total may double-count: N initiatives overlap." null when none. */
  doubleCountWarning: { count: number } | null;
  /** Impact-vs-complexity map (D26). Counted initiatives only. */
  map: MapPoint[];
}

function sumTotals(items: Array<{ i: Initiative; r: InitiativeResult }>): Totals {
  let expectedImpact = 0;
  let confidenceWeightedImpact = 0;
  let totalCost = 0;
  for (const { i, r } of items) {
    const m = r.metrics!;
    expectedImpact += m.impact.expected;
    confidenceWeightedImpact += m.impact.expected * CONFIDENCE_FACTOR[i.confidence!];
    totalCost += m.totalCost;
  }
  return {
    count: items.length,
    expectedImpact,
    confidenceWeightedImpact,
    totalCost,
    roiPct: totalCost > 0 ? ((expectedImpact - totalCost) / totalCost) * 100 : null,
  };
}

export function calculatePortfolio(doc: PortfolioDocument): PortfolioResult {
  const horizon = doc.portfolio.horizon_months;
  const results = new Map<string, InitiativeResult>();
  const counted: Array<{ i: Initiative; r: InitiativeResult }> = [];
  const notCounted: string[] = [];

  for (const i of doc.initiatives) {
    const r = calculateInitiative(i, horizon);
    results.set(i.id, r);
    // Not-live initiatives are counted: their impact is 0 but the build cost is real.
    if (r.metrics) counted.push({ i, r });
    else notCounted.push(i.id);
  }

  const mustDoItems = counted.filter(({ i }) => i.must_do);
  const mustDoTotals = sumTotals(mustDoItems);

  const goalOrder = [...doc.goals].sort((a, b) => a.sort_order - b.sort_order);
  const knownGoalIds = new Set(goalOrder.map((g) => g.id));
  const byGoal: GoalSubtotal[] = goalOrder.map((g) => ({
    goalId: g.id,
    goalName: g.name,
    ...sumTotals(counted.filter(({ i }) => i.goal_id === g.id)),
  }));
  const untagged = counted.filter(({ i }) => i.goal_id === null || !knownGoalIds.has(i.goal_id));
  if (untagged.length) byGoal.push({ goalId: null, goalName: 'No goal', ...sumTotals(untagged) });

  // Overlap is checked across every initiative, counted or not.
  const overlap = findOverlaps(doc.initiatives);

  return {
    results,
    counted: counted.map(({ i }) => i.id),
    notCounted,
    totals: sumTotals(counted),
    mustDo: {
      count: mustDoTotals.count,
      expectedImpact: mustDoTotals.expectedImpact,
      totalCost: mustDoTotals.totalCost,
    },
    byGoal,
    overlap,
    doubleCountWarning: overlap.overlappingIds.size > 0 ? { count: overlap.overlappingIds.size } : null,
    map: counted.map(({ i, r }) => ({
      id: i.id,
      name: i.name,
      expectedImpact: r.metrics!.impact.expected,
      complexity: r.complexity.level,
      mustDo: i.must_do,
    })),
  };
}
