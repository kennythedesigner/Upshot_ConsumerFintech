/**
 * Overlap check (D36, D42, D44): warns when initiatives touch the same or
 * next-door consumer moments, so totals aren't silently inflated.
 * The tool never drops an initiative on its own (D02, D44).
 */
import { ONBOARDING_STEP, OVERLAP_MAX_STEP_GAP } from './settings';
import type { ConsumerMoment, Initiative, OnboardingMoment } from './types';

const isOnboarding = (m: ConsumerMoment): m is OnboardingMoment => m in ONBOARDING_STEP;

/**
 * Same or next-door onboarding steps, or the same ongoing moment.
 * Onboarding never overlaps with ongoing. "Other" can't be checked.
 */
export function momentsOverlap(a: ConsumerMoment | null, b: ConsumerMoment | null): boolean {
  if (a === null || b === null || a === 'other' || b === 'other') return false;
  if (isOnboarding(a) && isOnboarding(b)) {
    return Math.abs(ONBOARDING_STEP[a] - ONBOARDING_STEP[b]) <= OVERLAP_MAX_STEP_GAP;
  }
  if (!isOnboarding(a) && !isOnboarding(b)) return a === b;
  return false;
}

export interface OverlapReport {
  pairs: Array<[string, string]>;
  /** Ids of every initiative in at least one overlapping pair. */
  overlappingIds: Set<string>;
}

export function findOverlaps(initiatives: Initiative[]): OverlapReport {
  const pairs: Array<[string, string]> = [];
  const overlappingIds = new Set<string>();
  for (let x = 0; x < initiatives.length; x++) {
    for (let y = x + 1; y < initiatives.length; y++) {
      const a = initiatives[x]!;
      const b = initiatives[y]!;
      if (momentsOverlap(a.consumer_moment, b.consumer_moment)) {
        pairs.push([a.id, b.id]);
        overlappingIds.add(a.id);
        overlappingIds.add(b.id);
      }
    }
  }
  return { pairs, overlappingIds };
}
