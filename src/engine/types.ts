/**
 * Data shapes for Upshot, matching the Backend Schema doc.
 * Only INPUTS live here. Every output is recalculated by the engine (Schema rule 1).
 *
 * What persists in V1 (D53b): portfolio metadata only — business goal and the
 * goal/OKR list — saved to Supabase. Initiatives and their buckets live in the
 * calculator's session only (full persistence deferred, D57).
 *
 * Units:
 *   - Lifts are percentage points, 0–100 (D11). The engine divides by 100.
 *   - Dollars are plain numbers, full precision (D51 rounds for display only).
 *   - Months are whole numbers (D13, D21).
 */

// ── Lists (Schema "Lists"). Codes are saved; labels live in labels.ts ──

export const ONBOARDING_MOMENTS = [
  'sign_up',
  'verify_identity',
  'fund_account',
  'first_transaction',
] as const;

export const ONGOING_MOMENTS = [
  'everyday_use',
  'fees_overdraft',
  'upgrade_new_product',
  'support_disputes',
  'closing_account',
  'other',
] as const;

export type OnboardingMoment = (typeof ONBOARDING_MOMENTS)[number];
export type OngoingMoment = (typeof ONGOING_MOMENTS)[number];
export type ConsumerMoment = OnboardingMoment | OngoingMoment; // D42

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number]; // D19

export const EVIDENCE_TYPES = [
  'analytics',
  'experiment',
  'benchmark',
  'expert_opinion',
  'none',
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number]; // D30

export const IMPORTANCE_LEVELS = ['low', 'medium', 'high'] as const;
export type StrategicImportance = (typeof IMPORTANCE_LEVELS)[number]; // D34

export const COMPLEXITY_FACTORS = [
  'compliance_signoff',
  'new_backend_logic',
  'third_party_dependency',
  'multiple_teams',
  'hard_to_roll_back',
] as const;
export type ComplexityFactor = (typeof COMPLEXITY_FACTORS)[number]; // D27

export const PRESSURE_PATTERNS = [
  'urgency',
  'preselected_choice',
  'hard_to_decline',
  'hidden_costs',
  'guilt_wording',
  'stressful_moment',
] as const;
export type PressurePattern = (typeof PRESSURE_PATTERNS)[number]; // D35

export const BUCKET_KINDS = ['now', 'later', 'saved'] as const;
export type BucketKind = (typeof BUCKET_KINDS)[number]; // D09

export const VALUE_BASES = ['per_month', 'per_event'] as const;
export type ValueBasis = (typeof VALUE_BASES)[number]; // D13 (label only)

export const HORIZON_STOPS = [3, 6, 9, 12, 18, 24] as const;
export type HorizonMonths = (typeof HORIZON_STOPS)[number]; // D20, D23

// ── Records ──

export interface Portfolio {
  id: string;
  name: string;
  business_goal: string | null; // D52b
  horizon_months: HorizonMonths; // D20, D23 — default 3
  schema_version: number;
  created_at: string; // ISO date-time
  updated_at: string;
}

export interface Goal {
  id: string;
  portfolio_id: string;
  name: string; // D33
  sort_order: number;
}

export interface ValueBucket {
  id: string;
  initiative_id: string;
  kind: BucketKind;
  /** Percentage points, 0–100. null = bucket not used (Schema rule 2). */
  lift_pts: number | null;
  /** Dollars per affected consumer. Can be negative in any bucket (D10). */
  value_per_consumer: number | null;
  value_basis: ValueBasis;
  override_on: boolean; // D16
  override_low_pts: number | null;
  override_high_pts: number | null;
  override_note: string | null;
}

export interface Initiative {
  id: string;
  portfolio_id: string;
  goal_id: string | null; // D32
  name: string;
  consumer_moment: ConsumerMoment | null; // D42, D56 — required to see results
  consumers_per_month: number | null; // D12 — required
  build_cost: number | null; // D24 — required, above 0
  run_cost_per_month: number; // D41 — default 0
  months_until_live: number; // D21 — default 0
  confidence: Confidence | null; // D19 — required
  evidence_type: EvidenceType | null; // D30
  must_do: boolean; // D34
  strategic_importance: StrategicImportance | null; // D34
  complexity_factors: ComplexityFactor[]; // D27
  pressure_patterns: PressurePattern[]; // D35
  /** Always exactly three: now, later, saved. */
  buckets: Record<BucketKind, ValueBucket>;
  created_at: string;
  updated_at: string;
}

/** Everything the calculator holds in one session: the portfolio, its goals and its initiatives. */
export interface PortfolioDocument {
  schema_version: number;
  portfolio: Portfolio;
  goals: Goal[];
  initiatives: Initiative[];
}
