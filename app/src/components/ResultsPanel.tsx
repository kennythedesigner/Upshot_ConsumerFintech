/**
 * The right column: "Your numbers". Shows exactly one main state (D46, TRD
 * state precedence) — empty, incomplete, not live, or results — with flags on
 * top whenever any have fired. Nothing here names a winner or colours a figure
 * good or bad.
 */
import {
  BUCKET_KINDS,
  BUCKET_LABEL,
  CONFIDENCE_LABEL,
  CONFIDENCE_SPREAD,
  FLAG_THRESHOLDS,
  STATE_COPY,
  doesNotPayBack,
  flagMessage,
  missingMessage,
  waitingIsCheaper,
  type Flag,
  type Initiative,
  type InitiativeResult,
  type Metrics,
  type MissingField,
  type Range,
} from '@engine';
import { Figure } from '../lib/motion';
import { count, money, percent, signedMoney } from '../lib/numbers';
import { GROUP_TITLE, type GroupId } from './InitiativeForm';

/** Where to send someone to fix or review a thing: a group and a field inside it. */
export interface FieldTarget {
  group: GroupId;
  field: string;
}

export function missingTarget(m: MissingField): FieldTarget {
  switch (m.field) {
    case 'consumer_moment':
      return { group: 'setup', field: 'f-moment' };
    case 'consumers_per_month':
      return { group: 'volume', field: 'f-consumers' };
    case 'value_bucket':
      return { group: 'value', field: 'f-now-lift' };
    case 'bucket_lift':
      return { group: 'value', field: `f-${m.bucket}-lift` };
    case 'bucket_value':
      return { group: 'value', field: `f-${m.bucket}-value` };
    case 'build_cost':
      return { group: 'cost', field: 'f-build-cost' };
    case 'confidence':
      return { group: 'confidence', field: 'f-confidence-low' };
  }
}

function flagTarget(f: Flag): FieldTarget | null {
  switch (f.kind) {
    case 'evidence_mismatch':
      return { group: 'confidence', field: 'f-evidence' };
    case 'lift_high':
      return { group: 'value', field: `f-${f.buckets[0] ?? 'now'}-lift` };
    case 'retention_lift_high':
      return { group: 'value', field: 'f-later-lift' };
    case 'speculative':
    case 'optimistic':
      return { group: 'confidence', field: 'f-confidence-low' };
    case 'pressure_note':
      return { group: 'strategy', field: 'f-pressure-0' };
    case 'overlap_unchecked':
      return null;
  }
}

/** The threshold that fired a flag, so the reader can judge it (README: "always name the threshold"). */
function flagThreshold(f: Flag): string | null {
  switch (f.kind) {
    case 'evidence_mismatch':
      return 'High confidence expects analytics or an experiment';
    case 'lift_high':
      return `Fires above ${FLAG_THRESHOLDS.liftHighPts} points`;
    case 'retention_lift_high':
      return `Fires above ${FLAG_THRESHOLDS.retentionLiftHighPts} points`;
    case 'speculative':
      return `Fires above ${FLAG_THRESHOLDS.speculativeRoiPct}% expected ROI at Low confidence`;
    case 'optimistic':
      return `Fires when the high end passes ${FLAG_THRESHOLDS.optimisticRoiHighPct}%`;
    case 'pressure_note':
      return 'Never changes the math';
    case 'overlap_unchecked':
      return null;
  }
}

/** Split "Observation. Invitation." so the observation can carry the weight. */
function splitMessage(message: string): [string, string | null] {
  const cut = message.indexOf('. ');
  return cut === -1 ? [message, null] : [message.slice(0, cut + 1), message.slice(cut + 2)];
}

function FlagCard({ flag, onGo }: { flag: Flag; onGo: (t: FieldTarget) => void }) {
  const [head, body] = splitMessage(flagMessage(flag));
  const threshold = flagThreshold(flag);
  const target = flagTarget(flag);
  const marksAssumption = flag.kind !== 'pressure_note' && flag.kind !== 'overlap_unchecked';
  return (
    <li className="flag">
      <p className="flag-text">
        <span className="flag-head">{head}</span>
        {body && <span className="flag-body"> {body}</span>}
      </p>
      <div className="flag-foot">
        {threshold && (
          <span className="flag-threshold">
            {threshold}
            {marksAssumption && ' · Upshot’s assumption'}
          </span>
        )}
        {target && (
          <button type="button" className="text-button" onClick={() => onGo(target)}>
            Go to {GROUP_TITLE[target.group]}
          </button>
        )}
      </div>
    </li>
  );
}

function Flags({ flags, onGo }: { flags: Flag[]; onGo: (t: FieldTarget) => void }) {
  if (flags.length === 0) return null;
  return (
    <section className="panel-section" aria-labelledby="flags-heading">
      <h3 className="eyebrow" id="flags-heading">
        Worth a second look
      </h3>
      <ul className="flags">
        {flags.map((f) => (
          <FlagCard key={f.kind} flag={f} onGo={onGo} />
        ))}
      </ul>
    </section>
  );
}

function RangeTiles({ label, range, format }: { label: string; range: Range; format: (n: number) => string }) {
  const tiles: Array<[string, keyof Range]> = [
    ['Low', 'low'],
    ['Base', 'expected'],
    ['High', 'high'],
  ];
  return (
    <dl className="tiles" aria-label={label}>
      {tiles.map(([name, key]) => (
        <div key={key} className={`tile${key === 'expected' ? ' tile--base' : ''}`}>
          <dt className="tile-label">{name}</dt>
          <dd className="tile-value">
            <Figure value={range[key]} format={format} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Ledger({ initiative, metrics }: { initiative: Initiative; metrics: Metrics }) {
  const months = metrics.liveMonths;
  const runTotal = initiative.run_cost_per_month * months;
  const net = metrics.impact.expected - metrics.totalCost;
  return (
    <section className="panel-section" aria-labelledby="ledger-heading">
      <h3 className="section-title" id="ledger-heading">
        Behind the base case
      </h3>
      <dl className="ledger">
        {BUCKET_KINDS.map((kind) => {
          const b = metrics.buckets[kind];
          return (
            <div className="ledger-row" key={kind}>
              <dt>
                {BUCKET_LABEL[kind]}
                {b?.customRange && <span className="tag">Custom range</span>}
              </dt>
              <dd>{b ? <Figure value={b.monthly.expected * months} format={signedMoney} /> : 'Not used'}</dd>
              {b?.customRange && b.note && <p className="ledger-note">“{b.note}”</p>}
            </div>
          );
        })}
        <div className="ledger-row ledger-row--total">
          <dt>Total benefit</dt>
          <dd>
            <Figure value={metrics.impact.expected} format={money} />
          </dd>
        </div>
        <div className="ledger-row">
          <dt>Build cost</dt>
          <dd>{money(-(initiative.build_cost ?? 0))}</dd>
        </div>
        <div className="ledger-row">
          <dt>Run cost</dt>
          <dd>
            {runTotal === 0 ? '$0' : <Figure value={-runTotal} format={money} />}
          </dd>
        </div>
        <div className="ledger-row ledger-row--total ledger-row--net">
          <dt>Net value</dt>
          <dd>
            <Figure value={net} format={money} />
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Assumptions({ initiative, metrics, horizon }: { initiative: Initiative; metrics: Metrics; horizon: number }) {
  const consumers = initiative.consumers_per_month ?? 0;
  const startsLater = initiative.months_until_live > 0;
  const run = initiative.run_cost_per_month;
  const custom = BUCKET_KINDS.filter((k) => metrics.buckets[k]?.customRange).map((k) => BUCKET_LABEL[k]);
  return (
    <section className="panel-section" aria-labelledby="assumptions-heading">
      <h3 className="section-title" id="assumptions-heading">
        Calculation assumptions
      </h3>
      <p className="panel-text">
        {count(consumers)} consumers a month × {metrics.liveMonths} live month{metrics.liveMonths === 1 ? '' : 's'} ×
        change in points ÷ 100 × value per outcome.{' '}
        {startsLater
          ? `Benefits start after ${initiative.months_until_live} month${initiative.months_until_live === 1 ? '' : 's'}, so ${metrics.liveMonths} of the ${horizon} count.`
          : 'Benefits start immediately.'}{' '}
        {run > 0 ? `Run cost of ${money(run)} a month is included.` : 'No run cost.'}
      </p>
      <p className="panel-text">
        Impact accrues evenly month to month, with no ramp-up, compounding or discounting. This understates
        retention value.
        {custom.length > 0 && ` Your own range replaces the confidence spread for ${custom.join(' and ')}.`}{' '}
        <span className="assumption-mark">Upshot’s assumption</span>
      </p>
    </section>
  );
}

function liveSummary({ state, metrics, flags }: InitiativeResult, horizon: number): string {
  const flagText = flags.length ? ` ${flags.length} item${flags.length === 1 ? '' : 's'} worth a second look.` : '';
  switch (state.kind) {
    case 'empty':
      return `Your numbers appear once the required fields are in.${flagText}`;
    case 'incomplete':
      return `${state.missing.length} input${state.missing.length === 1 ? '' : 's'} to go before your numbers appear.${flagText}`;
    case 'not_live':
      return `Not live in this window.${flagText}`;
    case 'results': {
      if (!metrics?.roiPct) return '';
      const net = metrics.impact.expected - metrics.totalCost;
      return `Base case: ${horizon}-month net value ${money(net)}, ROI ${percent(metrics.roiPct.expected)}.${flagText}`;
    }
  }
}

interface ResultsPanelProps {
  initiative: Initiative;
  result: InitiativeResult;
  horizon: number;
  onGo: (target: FieldTarget) => void;
  onLoadExample: () => void;
}

export function ResultsPanel({ initiative, result, horizon, onGo, onLoadExample }: ResultsPanelProps) {
  const { state, metrics, flags } = result;
  const confidence = initiative.confidence;

  return (
    <div className="panel" aria-labelledby="panel-title">
      <div className="panel-head">
        <h2 className="panel-title" id="panel-title">
          Your numbers
        </h2>
        {initiative.must_do && <span className="tag">Must-do</span>}
      </div>
      <p className="panel-subtitle">Based on your assumptions. Directional, not a forecast.</p>

      {/* One short sentence for screen readers, instead of re-reading the whole panel on every keystroke. */}
      <p className="visually-hidden" aria-live="polite">
        {liveSummary(result, horizon)}
      </p>

      <div className="panel-body">
        <Flags flags={flags} onGo={onGo} />

        {state.kind === 'empty' && (
          <section className="panel-section panel-state">
            <p className="state-lead">{STATE_COPY.empty}.</p>
            <p className="panel-text">
              Your numbers fill in here as you go. To see a finished one first, load the worked example: a
              neobank's fee and overdraft transparency redesign.
            </p>
            <button type="button" className="button button--secondary" onClick={onLoadExample}>
              Load the worked example
            </button>
          </section>
        )}

        {state.kind === 'incomplete' && (
          <section className="panel-section panel-state" aria-labelledby="missing-heading">
            <p className="state-lead" id="missing-heading">
              Your numbers appear once these are in:
            </p>
            <ul className="missing">
              {state.missing.map((m) => {
                const target = missingTarget(m);
                return (
                  <li key={`${m.field}${'bucket' in m ? m.bucket : ''}`}>
                    <button type="button" className="text-button" onClick={() => onGo(target)}>
                      {missingMessage(m)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {state.kind === 'not_live' && (
          <section className="panel-section panel-state">
            <p className="state-lead">{STATE_COPY.notLive}.</p>
            <p className="panel-text">
              This ships in {initiative.months_until_live} months and your horizon is {horizon}, so nothing lands
              inside the window yet. Drag the horizon longer to see impact.
            </p>
          </section>
        )}

        {state.kind === 'results' && metrics && metrics.roiPct && (
          <>
            <section className="panel-section" aria-labelledby="net-heading">
              <h3 className="section-title" id="net-heading">
                {horizon}-month net value
              </h3>
              <p className="section-sub">Estimated benefit minus build and run costs</p>
              <RangeTiles
                label={`${horizon}-month net value, low, base and high`}
                range={{
                  low: metrics.impact.low - metrics.totalCost,
                  expected: metrics.impact.expected - metrics.totalCost,
                  high: metrics.impact.high - metrics.totalCost,
                }}
                format={money}
              />
            </section>

            <section className="panel-section" aria-labelledby="roi-heading">
              <h3 className="section-title" id="roi-heading">
                {horizon}-month ROI
              </h3>
              <p className="section-sub">Net value ÷ total cost × 100</p>
              <RangeTiles label={`${horizon}-month ROI, low, base and high`} range={metrics.roiPct} format={percent} />
            </section>

            {(doesNotPayBack(metrics) || waitingIsCheaper(metrics)) && (
              <div className="note">
                {doesNotPayBack(metrics) && <p className="note-head">{STATE_COPY.doesNotPayBack}.</p>}
                {waitingIsCheaper(metrics) && (
                  <p className="panel-text">{STATE_COPY.waitingIsCheaper(money(-metrics.costOfDelay))}.</p>
                )}
              </div>
            )}

            {confidence && (
              <div className="note">
                <p className="note-head">
                  {CONFIDENCE_LABEL[confidence]} confidence · ±{Math.round(CONFIDENCE_SPREAD[confidence] * 100)}% range
                </p>
                <p className="panel-text">
                  Low and High move each change you entered down and up by{' '}
                  {Math.round(CONFIDENCE_SPREAD[confidence] * 100)}%; costs stay fixed. Every bucket moves to its
                  worst case together, so the range runs slightly wide. This is a modeling assumption, not a
                  validated confidence interval. <span className="assumption-mark">Upshot’s assumption</span>
                </p>
              </div>
            )}

            <Ledger initiative={initiative} metrics={metrics} />
            <Assumptions initiative={initiative} metrics={metrics} horizon={horizon} />
          </>
        )}
      </div>
    </div>
  );
}
