/**
 * One value bucket (D09): a lift in points and a dollar value per outcome,
 * plus an optional range of the PM's own (D16) behind "Edit range".
 */
import { BUCKET_LABEL, CONFIDENCE_SPREAD, MAX_LIFT_PTS, type BucketKind, type Confidence, type ValueBucket } from '@engine';
import { NumberField, Switch } from './Fields';

const BUCKET_HELPER: Record<BucketKind, string> = {
  now: 'Immediate revenue or conversion. Use a negative dollar value if this change gives up revenue on purpose.',
  later: 'Additional consumers retained × value per retained consumer.',
  saved: 'Support contacts avoided × cost saved per contact.',
};

export function validateLift(value: number): string | null {
  if (value < 0) return 'Lifts start at 0 points. If this change costs revenue, make the dollar value negative.';
  if (value > MAX_LIFT_PTS) return `A lift can't pass ${MAX_LIFT_PTS} points — that's every affected consumer.`;
  return null;
}

interface ValueBucketRowProps {
  bucket: ValueBucket;
  confidence: Confidence | null;
  onChange: (patch: Partial<ValueBucket>) => void;
}

export function ValueBucketRow({ bucket, confidence, onChange }: ValueBucketRowProps) {
  const kind = bucket.kind;
  const rowLabelId = `bucket-${kind}-label`;
  const changeLabelId = `bucket-${kind}-change-label`;
  const valueLabelId = `bucket-${kind}-value-label`;
  const customActive =
    bucket.override_on && bucket.override_low_pts !== null && bucket.override_high_pts !== null;
  const spread = confidence ? `±${Math.round(CONFIDENCE_SPREAD[confidence] * 100)}%` : 'confidence';

  return (
    <div className="bucket" role="group" aria-labelledby={rowLabelId}>
      <div className="bucket-head">
        <span className="bucket-label" id={rowLabelId}>
          {BUCKET_LABEL[kind]}
          {customActive && <span className="tag">Custom range</span>}
        </span>
        <div className="bucket-switch">
          <Switch
            id={`f-${kind}-range-toggle`}
            label="Edit range"
            srContext={`for ${BUCKET_LABEL[kind]}`}
            checked={bucket.override_on}
            onChange={(on) => onChange({ override_on: on })}
          />
        </div>
      </div>

      <div className="bucket-fields">
        <div>
          <span className="column-label" id={changeLabelId}>
            Change
          </span>
          <NumberField
            id={`f-${kind}-lift`}
            labelledBy={`${rowLabelId} ${changeLabelId}`}
            kind="points"
            suffix="points"
            placeholder="0"
            value={bucket.lift_pts}
            validate={validateLift}
            onChange={(v) => onChange({ lift_pts: v })}
          />
        </div>
        <div>
          <span className="column-label" id={valueLabelId}>
            Per outcome
          </span>
          <NumberField
            id={`f-${kind}-value`}
            labelledBy={`${rowLabelId} ${valueLabelId}`}
            kind="money"
            allowNegative
            placeholder="$0"
            value={bucket.value_per_consumer}
            onChange={(v) => onChange({ value_per_consumer: v })}
          />
        </div>
      </div>
      <p className="field-helper">{BUCKET_HELPER[kind]}</p>

      {bucket.override_on && (
        <div className="override">
          <p className="field-helper field-helper--lead">
            Enter the range you'd defend. It replaces the {spread} spread for this row, and Upshot puts
            whichever end is worse for the business at Low.
          </p>
          <div className="bucket-fields">
            <NumberField
              id={`f-${kind}-low`}
              label="Lowest believable change"
              kind="points"
              suffix="points"
              placeholder="0"
              value={bucket.override_low_pts}
              validate={validateLift}
              onChange={(v) => onChange({ override_low_pts: v })}
            />
            <NumberField
              id={`f-${kind}-high`}
              label="Highest believable change"
              kind="points"
              suffix="points"
              placeholder="0"
              value={bucket.override_high_pts}
              validate={validateLift}
              onChange={(v) => onChange({ override_high_pts: v })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor={`f-${kind}-note`}>
              Why this range? <span className="optional">Optional</span>
            </label>
            <input
              id={`f-${kind}-note`}
              className="control"
              type="text"
              maxLength={200}
              placeholder="From our March A/B test"
              value={bucket.override_note ?? ''}
              onChange={(e) => onChange({ override_note: e.target.value || null })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
