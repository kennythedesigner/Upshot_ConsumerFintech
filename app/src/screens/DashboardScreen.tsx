/**
 * The dashboard (home): portfolio totals (D45), the impact-vs-complexity map
 * (D26) and every initiative in the session.
 *
 * Totals add up base cases only. There is no portfolio Low/High: every
 * initiative hitting its worst case at once would overstate the risk (D45).
 * Initiatives missing an input are listed but never summed. Sorting is a lens
 * on the rows, never a ranking (D40, D02); the default is the order added.
 */
import {
  CONFIDENCE_FACTOR,
  MOMENT_LABEL,
  STATE_COPY,
  calculatePortfolio,
  formatPoints,
  formatScore,
  type ComplexityLevel,
  type HorizonMonths,
  type Initiative,
  type InitiativeResult,
  type PortfolioDocument,
} from '@engine';
import { useMemo } from 'react';
import { Chevron } from '../components/Icons';
import { ImpactMap, type MapDatum } from '../components/ImpactMap';
import { PageHead } from '../components/PageHead';
import { Figure } from '../lib/motion';
import { money, percent, withMinus } from '../lib/numbers';
import { seriesVar, type ColorMap } from '../lib/series';
import { SORT_KEYS, type SortKey } from '../lib/session';

const SORT_LABEL: Record<SortKey, string> = {
  added: 'Order added',
  net: 'Net value, highest first',
  roi: 'ROI, highest first',
  spread: 'ROI spread, widest first',
  priority: 'Priority Score, highest first',
  complexity: 'Delivery complexity, lowest first',
};

const LEVEL_RANK: Record<ComplexityLevel, number> = { low: 0, medium: 1, high: 2 };
const LEVEL_WORD: Record<ComplexityLevel, string> = { low: 'Low', medium: 'Medium', high: 'High' };

const nameOf = (i: Initiative) => i.name.trim() || 'Untitled initiative';
const hasFigures = (r: InitiativeResult) => (r.state.kind === 'results' || r.state.kind === 'not_live') && !!r.metrics;

/** The value a sort reads, or null when the initiative has no figures yet (those always go last). */
function sortValue(key: SortKey, r: InitiativeResult): number | null {
  if (r.state.kind === 'empty') return null;
  if (key === 'complexity') return LEVEL_RANK[r.complexity.level];
  if (!hasFigures(r)) return null;
  const m = r.metrics!;
  switch (key) {
    case 'net':
      return m.impact.expected - m.totalCost;
    case 'roi':
      return m.roiPct?.expected ?? null;
    case 'spread':
      return m.roiSpreadPts;
    case 'priority':
      return m.priorityScore;
    default:
      return null;
  }
}

export function sortInitiatives(
  initiatives: Initiative[],
  results: Map<string, InitiativeResult>,
  key: SortKey,
): Initiative[] {
  if (key === 'added') return initiatives;
  const ascending = key === 'complexity';
  return initiatives
    .map((i, n) => ({ i, n, v: sortValue(key, results.get(i.id)!) }))
    .sort((a, b) => {
      if (a.v === null && b.v === null) return a.n - b.n;
      if (a.v === null) return 1;
      if (b.v === null) return -1;
      const diff = ascending ? a.v - b.v : b.v - a.v;
      return diff !== 0 ? diff : a.n - b.n;
    })
    .map(({ i }) => i);
}

function Notes({ r, mustDo, overlaps }: { r: InitiativeResult; mustDo: boolean; overlaps: boolean }) {
  const notes: string[] = [];
  if (r.state.kind === 'incomplete') {
    const n = r.state.missing.length;
    notes.push(`Needs ${n} more input${n === 1 ? '' : 's'}`);
  }
  if (r.state.kind === 'empty') notes.push('Nothing entered yet');
  if (r.state.kind === 'not_live') notes.push('Not live in this window');
  if (overlaps) notes.push('Overlaps another initiative');
  if (r.flags.length) notes.push(`${r.flags.length} worth a second look`);
  return (
    <span className="row-notes">
      {mustDo && <span className="tag">Must-do</span>}
      {notes.map((n) => (
        <span key={n}>{n}</span>
      ))}
    </span>
  );
}

interface DashboardScreenProps {
  doc: PortfolioDocument;
  exampleIds: string[];
  colors: ColorMap;
  sort: SortKey;
  onSortChange: (key: SortKey) => void;
  horizon: HorizonMonths;
  onHorizonChange: (h: HorizonMonths) => void;
  onDelete: (id: string) => void;
  onLoadExample: () => void;
  onCompare: (a: string, b: string) => void;
  removed: { name: string } | null;
  onUndoRemove: () => void;
}

export function DashboardScreen({
  doc,
  exampleIds,
  colors,
  sort,
  onSortChange,
  horizon,
  onHorizonChange,
  onDelete,
  onLoadExample,
  onCompare,
  removed,
  onUndoRemove,
}: DashboardScreenProps) {
  const portfolio = useMemo(() => calculatePortfolio(doc), [doc]);
  const rows = useMemo(() => sortInitiatives(doc.initiatives, portfolio.results, sort), [doc, portfolio, sort]);
  const byId = useMemo(() => new Map(doc.initiatives.map((i) => [i.id, i])), [doc]);

  const showsExample = doc.initiatives.some((i) => exampleIds.includes(i.id));
  const count = doc.initiatives.length;
  const { totals, mustDo, overlap } = portfolio;
  const counted = portfolio.counted.length;
  const notCounted = portfolio.notCounted.map((id) => nameOf(byId.get(id)!));

  const mapData: MapDatum[] = portfolio.map.map((p) => ({
    id: p.id,
    name: nameOf(byId.get(p.id)!),
    color: seriesVar(colors[p.id]),
    impact: p.expectedImpact,
    complexity: p.complexity,
    mustDo: p.mustDo,
  }));

  const head = (
    <PageHead
      title="Dashboard"
      subtitle="Every initiative in this session, over the same window."
      horizon={horizon}
      onHorizonChange={onHorizonChange}
      action={
        <a className="button button--primary" href="#new">
          New initiative
        </a>
      }
    />
  );

  if (count === 0) {
    return (
      <>
        {head}
        <main className="list-page">
          {removed && (
            <p className="toolbar-status" role="status">
              Deleted “{removed.name}”.{' '}
              <button type="button" className="text-button" onClick={onUndoRemove}>
                Undo
              </button>
            </p>
          )}
          <section className="list-empty">
            <p className="state-lead">{STATE_COPY.emptyPortfolio}</p>
            <p className="panel-text">Or load the worked example to see two initiatives already filled in.</p>
            <div className="list-empty-actions">
              <a className="button button--primary" href="#new">
                New initiative
              </a>
              <button type="button" className="button button--secondary" onClick={onLoadExample}>
                Load the worked example
              </button>
            </div>
          </section>
        </main>
      </>
    );
  }

  const tiles: Array<{ label: string; sub: string; value: number | null; format: (n: number) => string; assumption?: boolean }> = [
    {
      label: `${horizon}-month expected impact`,
      sub: 'Sum of base cases',
      value: totals.expectedImpact,
      format: money,
    },
    {
      label: 'Confidence-weighted impact',
      sub: `Each base case × its confidence (${CONFIDENCE_FACTOR.low} / ${CONFIDENCE_FACTOR.medium} / ${CONFIDENCE_FACTOR.high})`,
      value: totals.confidenceWeightedImpact,
      format: money,
      assumption: true,
    },
    {
      label: 'Total cost',
      sub: 'Build, plus run cost over the live months',
      value: totals.totalCost,
      format: money,
    },
    {
      label: 'Portfolio ROI',
      sub: '(Expected impact − total cost) ÷ total cost',
      value: totals.roiPct,
      format: percent,
    },
  ];

  return (
    <>
      {head}
      <main className="dashboard">
        {showsExample && (
          <p className="example-note">
            The first two are the worked example: a neobank weighing a fee and overdraft transparency redesign
            against a premium-upgrade prompt. Edit them, delete them, or add your own.
          </p>
        )}

        <section className="totals" aria-labelledby="totals-title">
          <div className="section-head">
            <h2 className="section-heading" id="totals-title">
              Portfolio totals
            </h2>
            <p className="section-sub">
              {counted === count
                ? `All ${count} initiative${count === 1 ? '' : 's'}, base cases, over ${horizon} months.`
                : `${counted} of ${count} initiatives, base cases, over ${horizon} months.`}
            </p>
          </div>

          {counted === 0 ? (
            <p className="panel-text">Totals appear once an initiative has every required input.</p>
          ) : (
            <dl className="stat-tiles">
              {tiles.map((t) => (
                <div className="stat" key={t.label}>
                  <dt className="stat-label">{t.label}</dt>
                  <dd className="stat-value">
                    {t.value === null ? '—' : <Figure value={t.value} format={t.format} />}
                  </dd>
                  <dd className="stat-sub">
                    {t.sub}
                    {t.assumption && <span className="assumption-mark"> · Upshot’s assumption</span>}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <div className="totals-notes">
            {portfolio.doubleCountWarning && (
              <div className="compare-note" role="note">
                <p className="note-head">{STATE_COPY.doubleCount(portfolio.doubleCountWarning.count)}</p>
                <ul className="overlap-pairs">
                  {overlap.pairs.map(([x, y]) => {
                    const a = byId.get(x)!;
                    const b = byId.get(y)!;
                    const moment = a.consumer_moment ? MOMENT_LABEL[a.consumer_moment] : null;
                    return (
                      <li key={`${x}-${y}`}>
                        {nameOf(a)} and {nameOf(b)}
                        {moment ? ` (${moment}${b.consumer_moment !== a.consumer_moment && b.consumer_moment ? ` and ${MOMENT_LABEL[b.consumer_moment]}` : ''})` : ''}.{' '}
                        <button type="button" className="text-button" onClick={() => onCompare(x, y)}>
                          Compare them
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {counted > 0 && (
              <p className="panel-text">
                {mustDo.count === 0
                  ? 'No must-do initiatives.'
                  : `Must-do: ${mustDo.count} of ${counted}, carrying ${money(mustDo.expectedImpact)} of the ${money(totals.expectedImpact)} expected impact.`}
              </p>
            )}
            {notCounted.length > 0 && (
              <p className="panel-text">
                Not in the totals yet, because {notCounted.length === 1 ? 'it’s' : 'they’re'} missing inputs:{' '}
                {notCounted.join(', ')}.
              </p>
            )}
            <p className="panel-text">
              Totals add base cases. Ranges aren’t summed, because every initiative landing on its worst case at once
              would overstate the risk; each keeps its own range below and in Compare.
            </p>
          </div>
        </section>

        {mapData.length > 0 && (
          <section className="map-section" aria-label="Impact and delivery complexity">
            <ul className="legend" aria-label="Legend">
              {mapData.map((d) => (
                <li key={d.id}>
                  <span className="swatch swatch--round" style={{ background: d.color }} aria-hidden="true" />
                  {d.name}
                </li>
              ))}
              <li className="legend-shape">
                <span className="swatch swatch--diamond" aria-hidden="true" />
                Must-do
              </li>
            </ul>
            <ImpactMap data={mapData} horizon={horizon} format={money} />
            {notCounted.length > 0 && (
              <p className="panel-text">Initiatives missing inputs aren’t on the map until they have figures.</p>
            )}
          </section>
        )}

        <section className="rows-section" aria-labelledby="list-title">
          <div className="list-head">
            <h2 className="section-heading" id="list-title">
              Initiatives <span className="heading-count">{count}</span>
            </h2>
            <div className="sort">
              <label className="sort-label" htmlFor="sort">
                Sort by
              </label>
              <div className="select-wrap">
                <select
                  id="sort"
                  className="control control--compact"
                  value={sort}
                  aria-describedby="sort-helper"
                  onChange={(e) => onSortChange(e.target.value as SortKey)}
                >
                  {SORT_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {SORT_LABEL[k]}
                    </option>
                  ))}
                </select>
                <span className="select-chevron" aria-hidden="true">
                  <Chevron />
                </span>
              </div>
              <span className="sort-helper" id="sort-helper">
                {sort === 'added' ? 'The order you added them.' : 'A lens on the list, not a ranking.'}
              </span>
            </div>
          </div>

          {removed && (
            <p className="toolbar-status" role="status">
              Deleted “{removed.name}”.{' '}
              <button type="button" className="text-button" onClick={onUndoRemove}>
                Undo
              </button>
            </p>
          )}

          <table className="initiative-table dashboard-table" aria-labelledby="list-title">
            <thead>
              <tr>
                <th scope="col">Initiative</th>
                <th scope="col" className="num">
                  Net value
                  <span className="th-sub">{horizon} months, base</span>
                </th>
                <th scope="col" className="num">
                  ROI
                  <span className="th-sub">{horizon} months, base</span>
                </th>
                <th scope="col" className="num">
                  ROI spread
                  <span className="th-sub">High − Low</span>
                </th>
                <th scope="col" className="num">
                  Priority Score
                  <span className="th-sub">A lens</span>
                </th>
                <th scope="col">Complexity</th>
                <th scope="col">Notes</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const r = portfolio.results.get(i.id)!;
                const m = hasFigures(r) ? r.metrics : null;
                const name = nameOf(i);
                return (
                  <tr key={i.id}>
                    <th scope="row" className="row-head">
                      <span className="row-title">
                        <span className="swatch" style={{ background: seriesVar(colors[i.id]) }} aria-hidden="true" />
                        <a className="row-name" href={`#edit-${i.id}`}>
                          {name}
                        </a>
                      </span>
                      <span className="row-moment">
                        {i.consumer_moment ? MOMENT_LABEL[i.consumer_moment] : 'No moment yet'}
                      </span>
                    </th>
                    <td className="num" data-label="Net value">
                      {m ? <Figure value={m.impact.expected - m.totalCost} format={money} /> : <span className="cell-note">—</span>}
                    </td>
                    <td className="num" data-label="ROI">
                      {m?.roiPct ? <Figure value={m.roiPct.expected} format={percent} /> : <span className="cell-note">—</span>}
                    </td>
                    <td className="num" data-label="ROI spread">
                      {m && m.roiSpreadPts !== null ? withMinus(formatPoints(m.roiSpreadPts)) : <span className="cell-note">—</span>}
                    </td>
                    <td className="num" data-label="Priority Score">
                      {m && m.priorityScore !== null ? withMinus(formatScore(m.priorityScore)) : <span className="cell-note">—</span>}
                    </td>
                    <td data-label="Complexity">
                      {r.state.kind === 'empty' ? <span className="cell-note">—</span> : LEVEL_WORD[r.complexity.level]}
                    </td>
                    <td data-label="Notes">
                      <Notes r={r} mustDo={i.must_do} overlaps={overlap.overlappingIds.has(i.id)} />
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="text-button"
                        aria-label={`Delete ${name}`}
                        onClick={() => onDelete(i.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
