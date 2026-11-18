/**
 * The worked example (D05, D06): a neobank weighing two initiatives.
 *   A = Fee and overdraft transparency redesign
 *   B = Premium-upgrade prompt in the app
 *
 * A's figures come from the Upshot V1 wireframe. B's are illustrative,
 * chosen so the pair lands close on ROI but differs on range width and
 * pressure patterns — the comparison the tool exists to show (D02, D35).
 */
import { createInitiative, type Initiative } from '@engine';

/**
 * A. Revenue now is a deliberate loss: clearer fees mean fewer overdraft fees
 * collected (D10). The engine reads a lift as points of affected consumers,
 * 0 to 100, so the loss goes in the dollars: 1.2 points at −$4, not −1.2 at −$4.
 */
export function workedExample(portfolioId: string): Initiative {
  const i = createInitiative(portfolioId, 'Fee and overdraft transparency redesign');
  i.consumer_moment = 'fees_overdraft';
  i.consumers_per_month = 180_000;

  i.buckets.now.lift_pts = 1.2;
  i.buckets.now.value_per_consumer = -4;
  i.buckets.later.lift_pts = 2.1;
  i.buckets.later.value_per_consumer = 38;
  i.buckets.saved.lift_pts = 3.4;
  i.buckets.saved.value_per_consumer = 11;

  i.build_cost = 240_000;
  i.run_cost_per_month = 0;
  i.months_until_live = 0;

  i.confidence = 'medium';
  i.evidence_type = 'analytics';

  i.complexity_factors = ['compliance_signoff', 'multiple_teams'];
  i.must_do = false;
  // The fee notice appears right after an overdraft, so an honest PM ticks this one.
  i.pressure_patterns = ['stressful_moment'];
  return i;
}

/**
 * B. An in-app prompt to upgrade to a paid plan. Revenue now is the first
 * three months of the plan; Retention is the lower churn of paying members.
 * No cost saved, so that bucket is left blank (unused). Benchmark evidence
 * only, so confidence is Low and the range runs wide.
 */
export function workedExampleB(portfolioId: string): Initiative {
  const i = createInitiative(portfolioId, 'Premium-upgrade prompt in the app');
  i.consumer_moment = 'upgrade_new_product';
  i.consumers_per_month = 120_000;

  i.buckets.now.lift_pts = 1.5;
  i.buckets.now.value_per_consumer = 24;
  i.buckets.later.lift_pts = 0.8;
  i.buckets.later.value_per_consumer = 60;

  i.build_cost = 90_000;
  i.run_cost_per_month = 1_500;
  i.months_until_live = 1;

  i.confidence = 'low';
  i.evidence_type = 'benchmark';

  i.complexity_factors = ['new_backend_logic'];
  i.must_do = false;
  i.strategic_importance = 'high';
  // A limited-time offer, and a "No thanks, I'll keep paying fees" decline link.
  i.pressure_patterns = ['urgency', 'hard_to_decline'];
  return i;
}

/** Both initiatives, A first, with B stamped a moment later so list order is stable. */
export function workedPair(portfolioId: string): [Initiative, Initiative] {
  const a = workedExample(portfolioId);
  const b = workedExampleB(portfolioId);
  const later = new Date(Date.parse(a.updated_at) + 1).toISOString();
  b.created_at = later;
  b.updated_at = later;
  return [a, b];
}
