/**
 * The left column: every input for one initiative, in seven groups.
 * Required fields (D46) live in the groups that start open, so a PM can reach
 * a result without opening anything.
 */
import {
  BUCKET_KINDS,
  COMPLEXITY_FACTORS,
  COMPLEXITY_LABEL,
  CONFIDENCE_LABEL,
  CONFIDENCE_LEVELS,
  EVIDENCE_LABEL,
  EVIDENCE_TYPES,
  IMPORTANCE_LABEL,
  IMPORTANCE_LEVELS,
  MOMENT_LABEL,
  ONBOARDING_MOMENTS,
  ONGOING_MOMENTS,
  PRESSURE_LABEL,
  PRESSURE_PATTERNS,
  complexityLevel,
  pressureLabel,
  type BucketKind,
  type ConsumerMoment,
  type EvidenceType,
  type Initiative,
  type ValueBucket,
} from '@engine';
import { useState, type ReactNode } from 'react';
import { count, money } from '../lib/numbers';
import { CheckboxGroup, NumberField, Segmented, SelectField, TextField } from './Fields';
import { Group } from './Group';
import { Chevron } from './Icons';
import { ValueBucketRow } from './ValueBucketRow';

export type GroupId = 'setup' | 'volume' | 'value' | 'cost' | 'confidence' | 'complexity' | 'strategy';

export const GROUP_TITLE: Record<GroupId, string> = {
  setup: 'Setup',
  volume: 'Volume',
  value: 'What this change is worth',
  cost: 'Cost and timing',
  confidence: 'How sure are you?',
  complexity: 'Delivery complexity',
  strategy: 'Strategy and ethics',
};

const LEVEL_WORD = { low: 'Low', medium: 'Medium', high: 'High' } as const;

export function complexitySummary(i: Initiative): string {
  const n = i.complexity_factors.length;
  const level = LEVEL_WORD[complexityLevel(n)];
  return n === 0 ? `${level} — nothing ticked` : `${level} — ${n} factor${n === 1 ? '' : 's'}`;
}

export function pressureSummary(i: Initiative): string {
  const n = i.pressure_patterns.length;
  switch (pressureLabel(n)) {
    case 'none':
      return 'No pressure patterns';
    case 'mixed':
      return 'Mixed — 1 pattern';
    case 'pressure':
      return `Pressure — ${n} patterns`;
  }
}

function summaries(i: Initiative): Record<GroupId, string> {
  const filled = BUCKET_KINDS.filter(
    (k) => i.buckets[k].lift_pts !== null && i.buckets[k].value_per_consumer !== null,
  ).length;
  return {
    setup: [i.name.trim() || 'Unnamed', i.consumer_moment ? MOMENT_LABEL[i.consumer_moment] : null]
      .filter(Boolean)
      .join(' · '),
    volume: i.consumers_per_month !== null ? `${count(i.consumers_per_month)} consumers a month` : '',
    value: `${filled} of 3 filled in`,
    cost: i.build_cost !== null ? `${money(i.build_cost)} to build` : '',
    confidence: [
      i.confidence ? `${CONFIDENCE_LABEL[i.confidence]} confidence` : null,
      i.evidence_type ? EVIDENCE_LABEL[i.evidence_type] : null,
    ]
      .filter(Boolean)
      .join(' · '),
    complexity: complexitySummary(i),
    strategy: [
      `Must-do: ${i.must_do ? 'Yes' : 'No'}`,
      pressureSummary(i),
      i.strategic_importance ? `${IMPORTANCE_LABEL[i.strategic_importance]} importance` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

const validateConsumers = (v: number) => (v < 0 ? "Consumers per month can't be negative." : null);
const validateBuildCost = (v: number) => (v <= 0 ? 'Build cost needs to be above $0.' : null);
const validateRunCost = (v: number) => (v < 0 ? "Run cost can't be negative." : null);
const validateMonths = (v: number) =>
  v < 0 || !Number.isInteger(v) ? 'Use whole months, 0 or more.' : null;

interface InitiativeFormProps {
  initiative: Initiative;
  open: Record<GroupId, boolean>;
  onToggle: (id: GroupId) => void;
  onUpdate: (patch: Partial<Initiative>) => void;
  onUpdateBucket: (kind: BucketKind, patch: Partial<ValueBucket>) => void;
}

export function InitiativeForm({ initiative: i, open, onToggle, onUpdate, onUpdateBucket }: InitiativeFormProps) {
  const summary = summaries(i);
  const timingSet = i.run_cost_per_month !== 0 || i.months_until_live !== 0;
  const [timingOpen, setTimingOpen] = useState(timingSet);
  const showTiming = timingOpen || timingSet;

  const group = (id: GroupId, children: ReactNode) => (
    <Group
      id={`group-${id}`}
      title={GROUP_TITLE[id]}
      open={open[id]}
      onToggle={() => onToggle(id)}
      summary={summary[id]}
    >
      {children}
    </Group>
  );

  return (
    <div className="groups">
      {group(
        'setup',
        <div className="field-row field-row--setup">
          <TextField
            id="f-name"
            label="Initiative name"
            placeholder="Name this initiative"
            maxLength={100}
            value={i.name}
            onChange={(name) => onUpdate({ name })}
          />
          <SelectField
            id="f-moment"
            label="Consumer moment"
            placeholder="Choose a moment"
            value={i.consumer_moment ?? ''}
            onChange={(v) => onUpdate({ consumer_moment: (v || null) as ConsumerMoment | null })}
            groups={[
              {
                label: 'Onboarding, in order',
                options: ONBOARDING_MOMENTS.map((m) => ({ value: m, label: MOMENT_LABEL[m] })),
              },
              { label: 'Ongoing', options: ONGOING_MOMENTS.map((m) => ({ value: m, label: MOMENT_LABEL[m] })) },
            ]}
          />
        </div>,
      )}

      {group(
        'volume',
        <NumberField
          id="f-consumers"
          label="Consumers per month"
          kind="count"
          placeholder="0"
          value={i.consumers_per_month}
          validate={validateConsumers}
          onChange={(v) => onUpdate({ consumers_per_month: v })}
          helper="Consumers exposed to this change each month. Keep this volume consistent across outcomes."
        />,
      )}

      {group(
        'value',
        <div className="buckets">
          {BUCKET_KINDS.map((kind) => (
            <ValueBucketRow
              key={kind}
              bucket={i.buckets[kind]}
              confidence={i.confidence}
              onChange={(patch) => onUpdateBucket(kind, patch)}
            />
          ))}
        </div>,
      )}

      {group(
        'cost',
        <>
          <NumberField
            id="f-build-cost"
            label="Build cost"
            kind="money"
            placeholder="$0"
            value={i.build_cost}
            validate={validateBuildCost}
            onChange={(v) => onUpdate({ build_cost: v })}
            helper="One-time cost to design, build and ship."
          />
          {timingSet ? (
            // Once either value is set, the fields stay in view so a cost can't hide.
            <p className="subhead">Run cost and timing</p>
          ) : (
            <button
              type="button"
              className="disclosure"
              aria-expanded={showTiming}
              aria-controls="timing-fields"
              onClick={() => setTimingOpen(!showTiming)}
            >
              <Chevron direction={showTiming ? 'down' : 'right'} />
              <span>Add run cost and timing</span>
            </button>
          )}
          <div id="timing-fields" className="field-row" hidden={!showTiming}>
            <NumberField
              id="f-run-cost"
              label="Run cost per month"
              kind="money"
              placeholder="$0"
              value={i.run_cost_per_month}
              validate={validateRunCost}
              onChange={(v) => onUpdate({ run_cost_per_month: v ?? 0 })}
              helper="Optional. Ongoing cost once live."
            />
            <NumberField
              id="f-months-until-live"
              label="Months until live"
              kind="months"
              placeholder="0"
              value={i.months_until_live}
              validate={validateMonths}
              onChange={(v) => onUpdate({ months_until_live: v ?? 0 })}
              helper="Optional. How long before impact starts."
            />
          </div>
        </>,
      )}

      {group(
        'confidence',
        <div className="field-row field-row--confidence">
          <Segmented
            idBase="f-confidence"
            legend="Confidence"
            value={i.confidence}
            options={CONFIDENCE_LEVELS.map((c) => ({ value: c, label: CONFIDENCE_LABEL[c] }))}
            onChange={(confidence) => onUpdate({ confidence })}
            helper="Confidence sets how wide the range is, not how big the number is."
          />
          <SelectField
            id="f-evidence"
            label="What's this based on?"
            placeholder="Choose one"
            value={i.evidence_type ?? ''}
            onChange={(v) => onUpdate({ evidence_type: (v || null) as EvidenceType | null })}
            options={EVIDENCE_TYPES.map((e) => ({ value: e, label: EVIDENCE_LABEL[e] }))}
          />
        </div>,
      )}

      {group(
        'complexity',
        <>
          <CheckboxGroup
            idBase="f-complexity"
            legend="Tick what applies"
            options={COMPLEXITY_FACTORS.map((f) => ({ value: f, label: COMPLEXITY_LABEL[f] }))}
            selected={i.complexity_factors}
            onChange={(complexity_factors) => onUpdate({ complexity_factors })}
            footer={
              <>
                <strong className="inline-strong">{complexitySummary(i)}.</strong> None ticked is Low, one or two is
                Medium, three or more is High. This sits outside the math.
              </>
            }
          />
        </>,
      )}

      {group(
        'strategy',
        <>
          <div className="field-row">
            <Segmented
              idBase="f-must-do"
              legend="Must-do"
              value={i.must_do ? 'yes' : 'no'}
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
              onChange={(v) => onUpdate({ must_do: v === 'yes' })}
              helper="Regulatory, parity, or a promise already made. Shown as a badge, never part of the math."
            />
            <Segmented
              idBase="f-importance"
              legend="Strategic importance"
              value={i.strategic_importance}
              options={IMPORTANCE_LEVELS.map((l) => ({ value: l, label: IMPORTANCE_LABEL[l] }))}
              onChange={(strategic_importance) => onUpdate({ strategic_importance })}
              helper="Shown beside the figures, never part of the math."
            />
          </div>
          <SelectField
            id="f-goal"
            label="Goal"
            placeholder="No goals yet"
            value=""
            onChange={() => {}}
            options={[]}
            disabled
            helper="You'll add goals during onboarding. They tag initiatives on the dashboard."
          />
          <CheckboxGroup
            idBase="f-pressure"
            legend="Clarity or pressure?"
            helper="If the customer fully understood what's happening, would they still choose it? Tick any pattern this design uses."
            options={PRESSURE_PATTERNS.map((p) => ({ value: p, label: PRESSURE_LABEL[p] }))}
            selected={i.pressure_patterns}
            onChange={(pressure_patterns) => onUpdate({ pressure_patterns })}
            footer={
              <>
                <strong className="inline-strong">{pressureSummary(i)}.</strong> Never changes the math.
              </>
            }
          />
        </>,
      )}
    </div>
  );
}
