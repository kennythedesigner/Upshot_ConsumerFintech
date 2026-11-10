/**
 * On-screen wording for each saved code (Schema rule 4: codes, not labels).
 * Change wording here; saved data never breaks.
 */
import type {
  BucketKind,
  ComplexityFactor,
  Confidence,
  ConsumerMoment,
  EvidenceType,
  PressurePattern,
  StrategicImportance,
} from './types';

export const MOMENT_LABEL: Record<ConsumerMoment, string> = {
  sign_up: '1 Sign up',
  verify_identity: '2 Verify identity',
  fund_account: '3 Fund account',
  first_transaction: '4 First transaction',
  everyday_use: 'Everyday use (payments, transfers)',
  fees_overdraft: 'Fees and overdraft',
  upgrade_new_product: 'Upgrade or new product',
  support_disputes: 'Support and disputes',
  closing_account: 'Closing an account',
  other: 'Other',
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const EVIDENCE_LABEL: Record<EvidenceType, string> = {
  analytics: 'Analytics',
  experiment: 'Experiment',
  benchmark: 'Benchmark',
  expert_opinion: 'Expert opinion',
  none: 'None',
};

export const IMPORTANCE_LABEL: Record<StrategicImportance, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const COMPLEXITY_LABEL: Record<ComplexityFactor, string> = {
  compliance_signoff: 'Compliance / legal sign-off',
  new_backend_logic: 'New backend logic',
  third_party_dependency: 'Third-party or partner-bank dependency',
  multiple_teams: 'Multiple teams',
  hard_to_roll_back: 'Hard to roll back',
};

export const PRESSURE_LABEL: Record<PressurePattern, string> = {
  urgency: 'Urgency or countdowns',
  preselected_choice: 'Pre-selected or opt-out choices',
  hard_to_decline: 'Saying no is harder than saying yes',
  hidden_costs: 'Cost or terms shown late or in fine print',
  guilt_wording: 'Guilt or shame wording',
  stressful_moment: 'Shown at a stressful moment (after a declined payment or overdraft)',
};

export const BUCKET_LABEL: Record<BucketKind, string> = {
  now: 'Value Now',
  later: 'Value Later',
  saved: 'Value Saved',
};
