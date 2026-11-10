/**
 * Draft on-screen copy for states and flags (D35, D43, D44, D46).
 * Placeholder wording to finalize in the PRD. Describes, never accuses;
 * no verdict language (D02, D35).
 */
import type { Flag, MissingField } from './calculate';
import { BUCKET_LABEL } from './labels';

export function missingMessage(m: MissingField): string {
  switch (m.field) {
    case 'consumer_moment':
      return 'Pick the moment this change touches';
    case 'consumers_per_month':
      return 'Add consumers per month';
    case 'value_bucket':
      return 'Fill in at least one value (its lift and its dollars)';
    case 'bucket_lift':
      return `Add a lift for ${BUCKET_LABEL[m.bucket]}`;
    case 'bucket_value':
      return `Add a dollar value for ${BUCKET_LABEL[m.bucket]}`;
    case 'build_cost':
      return 'Add a build cost to see ROI';
    case 'confidence':
      return 'Pick a confidence level';
  }
}

export function flagMessage(f: Flag): string {
  switch (f.kind) {
    case 'evidence_mismatch':
      return 'High confidence usually rests on analytics or an experiment. Worth a second look.';
    case 'lift_high':
      return `Lift looks high for ${f.buckets.map((b) => BUCKET_LABEL[b]).join(', ')}. Worth a second look.`;
    case 'retention_lift_high':
      return 'Retention lift looks high. Worth a second look.';
    case 'speculative':
      return 'Promising but speculative: high expected ROI on low confidence. Worth a second look.';
    case 'optimistic':
      return 'Best case may be optimistic. Worth a second look.';
    case 'pressure_note':
      return `This design uses ${f.count} pressure pattern${f.count === 1 ? '' : 's'}. Worth a second look.`;
    case 'overlap_unchecked':
      return "Overlap can't be checked for this one.";
  }
}

export const STATE_COPY = {
  empty: 'Start with the moment this change touches',
  notLive: 'Not live in this window',
  onlyOne: 'Add a second initiative to compare.',
  shortWindow: 'Short windows rarely recover build costs. Drag the slider to see longer ones.',
  emptyPortfolio: 'Add your first initiative to start the portfolio.',
  doesNotPayBack: "Doesn't pay back in this scenario",
  waitingIsCheaper: (perMonth: string) => `Waiting is cheaper by ${perMonth} a month`,
  doubleCount: (n: number) => `Total may double-count: ${n} initiatives overlap.`,
  customRange: 'Custom range',
} as const;
