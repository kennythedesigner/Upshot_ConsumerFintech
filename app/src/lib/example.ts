/**
 * The worked example (D05, D06): a neobank weighing two initiatives.
 *   A = Fee and overdraft transparency redesign
 *   B = Premium-upgrade prompt in the app
 *
 * A's figures come from the Upshot V1 wireframe. B's come from public
 * figures, each noted beside its input and listed in docs/worked-example-sources.md.
 * The bank itself is fictional, so its size (consumers a month) and its
 * timeline stay stated assumptions.
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

  // Revenue now is fee revenue GIVEN UP: clearer fees mean fewer overdrafts, so
  // this bucket is negative (D10). A UK field study (Journal of Finance, 2024)
  // found overdraft alerts cut charges 4–19%; 8 points is mid-range. The fee
  // avoided is the average US overdraft fee, ~$27 (Bankrate, 2025).
  i.buckets.now.lift_pts = 8;
  i.buckets.now.value_per_consumer = -27;
  // Retention: fee-charged customers are >2× as likely to switch banks (J.D.
  // Power), so clearer fees keep some. 0.8 points × a year of revenue from a
  // kept member — Chime ARPAM, $257 (Q4 2025).
  i.buckets.later.lift_pts = 0.8;
  i.buckets.later.value_per_consumer = 257;
  // Cost saved: fewer overdraft surprises mean fewer support contacts. 4 points
  // × the median assisted-contact cost, $13.50 (Gartner).
  i.buckets.saved.lift_pts = 4;
  i.buckets.saved.value_per_consumer = 13.5;

  // BLS developer median wage / 70% wage share ≈ $16,200 a developer-month;
  // $240,000 ≈ 15 developer-months, in line with a compliance-touching redesign
  // across several teams (the complexity factors below).
  i.build_cost = 240_000;
  i.run_cost_per_month = 0;
  i.months_until_live = 0;

  // Benchmarks from other banks, not this bank's own data, so Medium / Benchmark.
  // The small gap between a large fee loss and large retention gains makes the
  // range very wide — the honest shape of a transparency bet.
  i.confidence = 'medium';
  i.evidence_type = 'benchmark';

  i.complexity_factors = ['compliance_signoff', 'multiple_teams'];
  i.must_do = false;
  // The fee notice appears right after an overdraft, so an honest PM ticks this one.
  i.pressure_patterns = ['stressful_moment'];
  return i;
}

/**
 * B. An in-app prompt to upgrade to a paid plan. Revenue now is the first
 * three months of the plan; Retention is the lower churn of the members who
 * upgrade. No cost saved, so that bucket is left blank (unused). Benchmark
 * evidence only, so confidence is Low and the range runs wide.
 */
export function workedExampleB(portfolioId: string): Initiative {
  const i = createInitiative(portfolioId, 'Premium-upgrade prompt in the app');
  i.consumer_moment = 'upgrade_new_product';
  // Assumption: free-plan members who see the prompt each month. The bank is fictional.
  i.consumers_per_month = 120_000;

  // Monzo FY2026: subscribers rose from 1m+ to 1.6m+ on 10.4m monthly active users,
  // about 0.57% of free users a month across every channel, net of cancellations.
  // One prompt is one channel, so about half: 0.3 points.
  i.buckets.now.lift_pts = 0.3;
  // Three months of a US plan: Revolut Premium $9.99/month, SoFi Plus $10/month.
  i.buckets.now.value_per_consumer = 30;
  // The weakest input. Digital-bank churn is reported at roughly 12–25% a year; no
  // public source says how much a paid plan cuts it, so this assumes it halves it
  // for the 0.3 points who upgrade: 0.3 × ~10% ≈ 0.03 points.
  i.buckets.later.lift_pts = 0.03;
  // A year of revenue from a kept member: Chime ARPAM, $257 (Q4 2025).
  i.buckets.later.value_per_consumer = 257;

  // BLS: software developer median wage $135,980 (May 2025); wages are 70% of
  // employer cost (ECEC, June 2026), so about $16,200 a developer-month.
  // $90,000 is about 5½ developer-months.
  i.build_cost = 90_000;
  // Upkeep: about 10% of one developer-month.
  i.run_cost_per_month = 1_600;
  // Assumption.
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
