/**
 * Tool assumptions — the one settings file (TRD "Flags and states").
 * Every value here is shown on screen as a tool assumption (D15, D43).
 * D43 thresholds are placeholders; change them here without touching the math.
 */
import type { Confidence, OnboardingMoment } from './types';

/** D19: how much a confidence level counts in the Priority Score. */
export const CONFIDENCE_FACTOR: Record<Confidence, number> = {
  low: 0.3,
  medium: 0.6,
  high: 0.9,
};

/** D15: range half-width applied to each bucket's lift. */
export const CONFIDENCE_SPREAD: Record<Confidence, number> = {
  low: 0.75,
  medium: 0.5,
  high: 0.25,
};

/** D43 sanity flag thresholds (placeholders to finalize). */
export const FLAG_THRESHOLDS = {
  /** Any bucket's lift above this many points. */
  liftHighPts: 30,
  /** Value Later lift above this many points. */
  retentionLiftHighPts: 5,
  /** Expected ROI above this % with Low confidence. */
  speculativeRoiPct: 100,
  /** ROI High above this %. */
  optimisticRoiHighPct: 500,
} as const;

/** D31: the only evidence types that support High confidence. */
export const STRONG_EVIDENCE = ['analytics', 'experiment'] as const;

/** D42: onboarding steps carry an order so "next-door" is a simple check. */
export const ONBOARDING_STEP: Record<OnboardingMoment, number> = {
  sign_up: 1,
  verify_identity: 2,
  fund_account: 3,
  first_transaction: 4,
};

/** D42/D36: onboarding steps this far apart or closer count as overlapping. */
export const OVERLAP_MAX_STEP_GAP = 1;

/** D46: the slider position that triggers the short-window note. */
export const SHORT_WINDOW_MONTHS = 3;

/** D23 default slider position. */
export const DEFAULT_HORIZON = 3;

/** Lifts can't move more than every affected consumer. */
export const MAX_LIFT_PTS = 100;
