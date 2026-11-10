/**
 * New-record builders with the Schema's defaults filled in.
 * Screens call these instead of building objects by hand.
 */
import { DEFAULT_HORIZON } from './settings';
import type {
  BucketKind,
  Goal,
  HorizonMonths,
  Initiative,
  Portfolio,
  PortfolioDocument,
  ValueBucket,
} from './types';
import { BUCKET_KINDS } from './types';

export const SCHEMA_VERSION = 1;

const newId = (): string => crypto.randomUUID();
const now = (): string => new Date().toISOString();

export function createPortfolio(name = 'My portfolio'): PortfolioDocument {
  const stamp = now();
  const portfolio: Portfolio = {
    id: newId(),
    name,
    business_goal: null,
    horizon_months: DEFAULT_HORIZON as HorizonMonths,
    schema_version: SCHEMA_VERSION,
    created_at: stamp,
    updated_at: stamp,
  };
  return { schema_version: SCHEMA_VERSION, portfolio, goals: [], initiatives: [] };
}

export function createGoal(portfolioId: string, name: string, sortOrder: number): Goal {
  return { id: newId(), portfolio_id: portfolioId, name, sort_order: sortOrder };
}

export function createBucket(initiativeId: string, kind: BucketKind): ValueBucket {
  return {
    id: newId(),
    initiative_id: initiativeId,
    kind,
    lift_pts: null,
    value_per_consumer: null,
    value_basis: 'per_month',
    override_on: false,
    override_low_pts: null,
    override_high_pts: null,
    override_note: null,
  };
}

export function createInitiative(portfolioId: string, name = 'Untitled initiative'): Initiative {
  const id = newId();
  const stamp = now();
  const buckets = Object.fromEntries(
    BUCKET_KINDS.map((kind) => [kind, createBucket(id, kind)]),
  ) as Record<BucketKind, ValueBucket>;
  return {
    id,
    portfolio_id: portfolioId,
    goal_id: null,
    name,
    consumer_moment: null,
    consumers_per_month: null,
    build_cost: null,
    run_cost_per_month: 0,
    months_until_live: 0,
    confidence: null,
    evidence_type: null,
    must_do: false,
    strategic_importance: null,
    complexity_factors: [],
    pressure_patterns: [],
    buckets,
    created_at: stamp,
    updated_at: stamp,
  };
}
