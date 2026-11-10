import { createInitiative, type Initiative } from '.';

/** TRD test-case base inputs (illustrative, not the worked example's real figures). */
export function base(): Initiative {
  const i = createInitiative('p1', 'Base');
  i.consumer_moment = 'fees_overdraft';
  i.consumers_per_month = 5000;
  i.buckets.now.lift_pts = 10;
  i.buckets.now.value_per_consumer = -30;
  i.buckets.later.lift_pts = 2;
  i.buckets.later.value_per_consumer = 150;
  i.buckets.saved.lift_pts = 5;
  i.buckets.saved.value_per_consumer = 8;
  i.confidence = 'medium';
  i.build_cost = 20_000;
  i.run_cost_per_month = 0;
  i.months_until_live = 0;
  return i;
}

