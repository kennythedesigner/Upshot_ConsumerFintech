/**
 * A vs B (D02): two initiatives over the same horizon, side by side.
 * It lays out both and stops there. No row is marked favourable, no column
 * wins, nothing is coloured good or bad; differences are stated, not judged.
 */
import {
  BUCKET_KINDS,
  BUCKET_LABEL,
  COMPLEXITY_LABEL,
  CONFIDENCE_LABEL,
  CONFIDENCE_SPREAD,
  EVIDENCE_LABEL,
  IMPORTANCE_LABEL,
  MOMENT_LABEL,
  PRESSURE_LABEL,
  STATE_COPY,
  calculateInitiative,
  flagMessage,
  formatMonths,
  formatPoints,
  formatScore,
  momentsOverlap,
  type BucketKind,
  type Flag,
  type HorizonMonths,
  type Initiative,
  type InitiativeResult,
  type Range,
} from '@engine';
import { useMemo, type ReactNode } from 'react';
import { complexitySummary, pressureSummary } from '../components/InitiativeForm';
import { PageHead } from '../components/PageHead';
import { RangeChart, type RangeSeries } from '../components/RangeChart';
import { formatForInput, money, percent, signedMoney, withMinus } from '../lib/numbers';
import { seriesVar, type ColorMap } from '../lib/series';
import type { ComparePair } from '../lib/session';

type Slot = 'a' | 'b';

interface Side {
  slot: Slot;
  letter: 'A' | 'B';
  initiative: Initiative;
  result: InitiativeResult;
  color: string;
  name: string;
}

const nameOf = (i: Initiative) => i.name.trim() || 'Untitled initiative';

/** Ranges read as three lines: the base case carries the weight. */
function RangeLines({ range, format }: { range: Range; format: (n: number) => string }) {
  return (
    <span className="range-lines">
      <span>
        <span className="range-word">Low</span> {format(range.low)}
      </span>
      <span className="is-base">
        <span className="range-word">Base</span> {format(range.expected)}
      </span>
      <span>
        <span className="range-word">High</span> {format(range.high)}
      </span>
    </span>
  );
}

const hasFigures = (r: InitiativeResult) => (r.state.kind === 'results' || r.state.kind === 'not_live') && !!r.metrics;

/** Which flags sit beside which row (PRD 8.5: a flagged row shows the flag in that initiative's cell). */
function flagsFor(row: string, flags: Flag[]): Flag[] {
  return flags.filter((f) => {
    switch (f.kind) {
      case 'overlap_unchecked':
        return row === 'moment';
      case 'lift_high':
        return f.buckets.includes(row as BucketKind);
      case 'retention_lift_high':
        return row === 'later';
      case 'speculative':
      case 'optimistic':
        return row === 'roi';
      case 'evidence_mismatch':
        return row === 'confidence';
      case 'pressure_note':
        return false; // the pressure row already says it
    }
  });
}

function CellFlags({ row, side }: { row: string; side: Side }) {
  const list = flagsFor(row, side.result.flags);
  if (!list.length) return null;
  return (
    <>
      {list.map((f) => (
        <span key={f.kind} className="cell-flag">
          {flagMessage(f)}
        </span>
      ))}
    </>
  );
}

function BucketCell({ kind, side }: { kind: BucketKind; side: Side }) {
  const b = side.initiative.buckets[kind];
  if (b.lift_pts === null && b.value_per_consumer === null) return <span className="cell-note">Not used</span>;
  const m = side.result.metrics;
  const r = m?.buckets[kind];
  const lift = b.lift_pts === null ? '—' : `${formatForInput(b.lift_pts, 'points')} points`;
  const value = b.value_per_consumer === null ? '—' : formatForInput(b.value_per_consumer, 'money');
  return (
    <span className="cell-stack">
      <span>
        {lift} × {value}
        {r?.customRange && <span className="tag">Custom range</span>}
      </span>
      {r?.customRange && (
        <span className="cell-note">
          Your range: {formatForInput(r.liftRangePts.low, 'points')}–{formatForInput(r.liftRangePts.high, 'points')}{' '}
          points{r.note ? `. “${r.note}”` : ''}
        </span>
      )}
      {r && m && hasFigures(side.result) && (
        <span className="cell-note">
          {m.liveMonths} live months: <span className="nowrap">{signedMoney(r.monthly.expected * m.liveMonths)}</span>
        </span>
      )}
    </span>
  );
}

interface Row {
  key: string;
  label: string;
  sub?: string;
  /** Results rows show a dash until an initiative has figures. */
  needsFigures?: boolean;
  cell: (side: Side) => ReactNode;
}

interface Group {
  title: string;
  rows: Row[];
}

function groups(horizon: number): Group[] {
  return [
    {
      title: 'Setup',
      rows: [
        {
          key: 'moment',
          label: 'Consumer moment',
          cell: ({ initiative: i }) => (i.consumer_moment ? MOMENT_LABEL[i.consumer_moment] : <span className="cell-note">Not set</span>),
        },
        {
          key: 'consumers',
          label: 'Consumers per month',
          cell: ({ initiative: i }) =>
            i.consumers_per_month === null ? <span className="cell-note">Not set</span> : formatForInput(i.consumers_per_month, 'count'),
        },
      ],
    },
    {
      title: 'What this change is worth',
      rows: BUCKET_KINDS.map((kind) => ({
        key: kind,
        label: BUCKET_LABEL[kind],
        sub: 'Change × value per outcome',
        cell: (side: Side) => <BucketCell kind={kind} side={side} />,
      })),
    },
    {
      title: `Results over ${horizon} months`,
      rows: [
        {
          key: 'net',
          label: 'Net value',
          sub: 'Benefit minus build and run costs',
          needsFigures: true,
          cell: ({ result }) => {
            const m = result.metrics!;
            return (
              <RangeLines
                range={{
                  low: m.impact.low - m.totalCost,
                  expected: m.impact.expected - m.totalCost,
                  high: m.impact.high - m.totalCost,
                }}
                format={money}
              />
            );
          },
        },
        {
          key: 'roi',
          label: 'ROI',
          sub: 'Net value ÷ total cost × 100',
          needsFigures: true,
          cell: ({ result }) => <RangeLines range={result.metrics!.roiPct!} format={percent} />,
        },
        {
          key: 'spread',
          label: 'ROI spread',
          sub: 'High minus Low: how uncertain this is',
          needsFigures: true,
          cell: ({ result }) => withMinus(formatPoints(result.metrics!.roiSpreadPts ?? 0)),
        },
        {
          key: 'cost',
          label: 'Total cost',
          needsFigures: true,
          cell: ({ initiative: i, result }) => {
            const m = result.metrics!;
            const run = i.run_cost_per_month * m.liveMonths;
            return (
              <span className="cell-stack">
                <span>{money(m.totalCost)}</span>
                <span className="cell-note">
                  {money(i.build_cost ?? 0)} to build{run > 0 ? ` + ${money(run)} to run` : ''}
                </span>
              </span>
            );
          },
        },
        {
          key: 'payback',
          label: 'Payback',
          sub: 'Months from today, including time to go live',
          needsFigures: true,
          cell: ({ result }) => {
            const p = result.metrics!.paybackMonths;
            return p === null ? <span className="cell-note">{STATE_COPY.doesNotPayBack}</span> : formatMonths(p);
          },
        },
        {
          key: 'delay',
          label: 'Cost of delay',
          sub: 'What waiting one more month costs',
          needsFigures: true,
          cell: ({ result }) => {
            const c = result.metrics!.costOfDelay;
            return c < 0 ? (
              <span className="cell-note">{STATE_COPY.waitingIsCheaper(money(-c))}</span>
            ) : (
              `${money(c)} a month`
            );
          },
        },
        {
          key: 'priority',
          label: 'Priority Score',
          sub: 'Expected impact × confidence ÷ total cost. One lens among several, not a verdict.',
          needsFigures: true,
          cell: ({ result }) => withMinus(formatScore(result.metrics!.priorityScore ?? 0)),
        },
      ],
    },
    {
      title: 'How sure',
      rows: [
        {
          key: 'confidence',
          label: 'Confidence and evidence',
          cell: ({ initiative: i }) => (
            <span className="cell-stack">
              <span>
                {i.confidence
                  ? `${CONFIDENCE_LABEL[i.confidence]} · ±${Math.round(CONFIDENCE_SPREAD[i.confidence] * 100)}% range`
                  : 'Confidence not set'}
              </span>
              <span className="cell-note">{i.evidence_type ? `Based on: ${EVIDENCE_LABEL[i.evidence_type]}` : 'Evidence not set'}</span>
            </span>
          ),
        },
      ],
    },
    {
      title: 'Delivery and strategy',
      rows: [
        {
          key: 'complexity',
          label: 'Delivery complexity',
          sub: 'Outside the math',
          cell: ({ initiative: i }) => (
            <span className="cell-stack">
              <span>{complexitySummary(i)}</span>
              {i.complexity_factors.length > 0 && (
                <span className="cell-note">{i.complexity_factors.map((f) => COMPLEXITY_LABEL[f]).join(' · ')}</span>
              )}
            </span>
          ),
        },
        {
          key: 'pressure',
          label: 'Clarity or pressure?',
          sub: 'Never changes the math',
          cell: ({ initiative: i }) => (
            <span className="cell-stack">
              <span>{pressureSummary(i)}</span>
              {i.pressure_patterns.length > 0 && (
                <span className="cell-note">{i.pressure_patterns.map((p) => PRESSURE_LABEL[p]).join(' · ')}</span>
              )}
            </span>
          ),
        },
        {
          key: 'mustdo',
          label: 'Must-do',
          cell: ({ initiative: i }) => (i.must_do ? <span className="tag">Must-do</span> : 'No'),
        },
        {
          key: 'importance',
          label: 'Strategic importance',
          cell: ({ initiative: i }) =>
            i.strategic_importance ? IMPORTANCE_LABEL[i.strategic_importance] : <span className="cell-note">Not set</span>,
        },
      ],
    },
  ];
}

function sideStatus(side: Side): ReactNode {
  const { result, initiative } = side;
  const edit = `#edit-${initiative.id}`;
  switch (result.state.kind) {
    case 'empty':
      return (
        <>
          Nothing entered yet. <a href={edit}>Start it</a>
        </>
      );
    case 'incomplete': {
      const n = result.state.missing.length;
      return (
        <>
          Needs {n} more input{n === 1 ? '' : 's'} before its figures appear. <a href={edit}>Finish it</a>
        </>
      );
    }
    case 'not_live':
      return <>{STATE_COPY.notLive}: its build cost counts, its benefit hasn't started.</>;
    case 'results':
      return null;
  }
}

interface CompareScreenProps {
  initiatives: Initiative[];
  colors: ColorMap;
  pair: ComparePair;
  horizon: HorizonMonths;
  onHorizonChange: (h: HorizonMonths) => void;
  onPick: (slot: Slot, id: string) => void;
  onSwap: () => void;
}

export function CompareScreen({ initiatives, colors, pair, horizon, onHorizonChange, onPick, onSwap }: CompareScreenProps) {
  const sides = useMemo(() => {
    const make = (slot: Slot, id: string | null): Side | null => {
      const initiative = initiatives.find((i) => i.id === id);
      if (!initiative) return null;
      return {
        slot,
        letter: slot === 'a' ? 'A' : 'B',
        initiative,
        result: calculateInitiative(initiative, horizon),
        color: seriesVar(colors[initiative.id]),
        name: nameOf(initiative),
      };
    };
    return [make('a', pair.a), make('b', pair.b)].filter((s): s is Side => s !== null);
  }, [initiatives, colors, pair, horizon]);

  const head = (
    <PageHead
      title="Compare"
      subtitle="Two initiatives over the same window. Upshot lays out both and leaves the call to you."
      horizon={horizon}
      onHorizonChange={onHorizonChange}
      action={
        <a className="button button--secondary" href="#new">
          New initiative
        </a>
      }
    />
  );

  if (sides.length < 2) {
    return (
      <>
        {head}
        <main className="list-page">
          <section className="list-empty">
            <p className="state-lead">{STATE_COPY.onlyOne}</p>
            <p className="panel-text">
              {initiatives.length === 0
                ? 'There are no initiatives in this session yet.'
                : `There's one initiative in this session so far: ${nameOf(initiatives[0]!)}.`}
            </p>
            <div className="list-empty-actions">
              <a className="button button--primary" href="#new">
                New initiative
              </a>
              <a className="button button--secondary" href="#dashboard">
                Dashboard
              </a>
            </div>
          </section>
        </main>
      </>
    );
  }

  const [a, b] = sides as [Side, Side];
  const momentA = a.initiative.consumer_moment;
  const momentB = b.initiative.consumer_moment;
  const overlap = momentsOverlap(momentA, momentB);
  const unchecked = momentA === 'other' || momentB === 'other';

  const series = (pick: (r: InitiativeResult) => Range | null): RangeSeries[] =>
    sides.map((s) => ({
      key: s.slot,
      letter: s.letter,
      name: s.name,
      color: s.color,
      range: hasFigures(s.result) ? pick(s.result) : null,
      note: s.result.state.kind === 'incomplete' ? 'Appears once its required inputs are in' : 'No figures yet',
    }));

  return (
    <>
      {head}
      <main className="compare-page">
        <div className="pickers" role="group" aria-label="Initiatives to compare">
          {sides.map((s) => (
            <div className="picker" key={s.slot}>
              <label className="field-label picker-label" htmlFor={`pick-${s.slot}`}>
                <span className="swatch" style={{ background: s.color }} aria-hidden="true" />
                Initiative {s.letter}
              </label>
              <div className="select-wrap">
                <select
                  id={`pick-${s.slot}`}
                  className="control"
                  value={s.initiative.id}
                  onChange={(e) => onPick(s.slot, e.target.value)}
                >
                  {initiatives.map((i) => (
                    <option key={i.id} value={i.id} disabled={i.id === (s.slot === 'a' ? b : a).initiative.id}>
                      {nameOf(i)}
                    </option>
                  ))}
                </select>
              </div>
              <p className="picker-meta">
                <a href={`#edit-${s.initiative.id}`}>Edit {s.letter}</a>
              </p>
            </div>
          ))}
          <button type="button" className="button button--secondary swap" onClick={onSwap}>
            Swap A and B
          </button>
        </div>

        {(overlap || unchecked) && (
          <p className="compare-note">
            {overlap
              ? `Both touch ${MOMENT_LABEL[momentA!]}${momentA !== momentB ? ` and ${MOMENT_LABEL[momentB!]}` : ''}, so their impact may overlap. Adding the two together could count the same consumers twice.`
              : "Overlap can't be checked when a moment is Other."}
          </p>
        )}

        {sides.some((s) => sideStatus(s)) && (
          <ul className="compare-status">
            {sides.map((s) => {
              const status = sideStatus(s);
              return status ? (
                <li key={s.slot}>
                  <span className="swatch" style={{ background: s.color }} aria-hidden="true" />
                  <strong>{s.letter}</strong> {status}
                </li>
              ) : null;
            })}
          </ul>
        )}

        <section className="compare-charts" aria-label="Ranges at a glance">
          <div className="chart-key">
            <ul className="legend" aria-label="Legend">
              {sides.map((s) => (
                <li key={s.slot}>
                  <span className="swatch" style={{ background: s.color }} aria-hidden="true" />
                  <strong>{s.letter}</strong> {s.name}
                </li>
              ))}
            </ul>
            <p className="encoding-key">
              <span className="key-item">
                <span className="key-band" aria-hidden="true" /> Bar runs from Low to High
              </span>
              <span className="key-item">
                <span className="key-dot" aria-hidden="true" /> Dot marks the base case
              </span>
            </p>
          </div>
          <div className="chart-grid">
            <RangeChart
              id="chart-net"
              title={`${horizon}-month net value`}
              sub="Benefit minus build and run costs"
              series={series((r) => {
                const m = r.metrics!;
                return { low: m.impact.low - m.totalCost, expected: m.impact.expected - m.totalCost, high: m.impact.high - m.totalCost };
              })}
              format={money}
            />
            <RangeChart
              id="chart-roi"
              title={`${horizon}-month ROI`}
              sub="Net value ÷ total cost × 100"
              series={series((r) => r.metrics!.roiPct)}
              format={percent}
            />
          </div>
        </section>

        <table className="compare-table">
          <caption className="visually-hidden">
            {a.name} and {b.name}, side by side over {horizon} months
          </caption>
          <thead>
            <tr>
              <td />
              {sides.map((s) => (
                <th key={s.slot} scope="col">
                  <span className="col-head">
                    <span className="swatch" style={{ background: s.color }} aria-hidden="true" />
                    <span className="col-letter">{s.letter}</span>
                    <span className="col-name">{s.name}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {groups(horizon).map((g) => (
            <tbody key={g.title}>
              <tr className="group-row">
                <th colSpan={3} scope="colgroup">
                  {g.title}
                </th>
              </tr>
              {g.rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="row-label">
                    {row.label}
                    {row.sub && <span className="row-sub">{row.sub}</span>}
                  </th>
                  {sides.map((s) => (
                    <td key={s.slot} data-letter={s.letter}>
                      {row.needsFigures && !hasFigures(s.result) ? (
                        <span className="cell-note">—</span>
                      ) : (
                        <span className="cell-stack">
                          <span>{row.cell(s)}</span>
                          <CellFlags row={row.key} side={s} />
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </main>
    </>
  );
}
