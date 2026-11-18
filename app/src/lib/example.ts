/**
 * The worked example (D05, D06): initiative A, a neobank's fee and overdraft
 * transparency redesign.
 *
 * Revenue now is a deliberate loss: clearer fees mean fewer overdraft fees
 * collected (D10). The engine reads a lift as points of affected consumers,
 * 0 to 100, so the loss goes in the dollars: 1.2 points at −$4, not −1.2 at −$4.
 */
import { createInitiative, type Initiative } from '@engine';

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
