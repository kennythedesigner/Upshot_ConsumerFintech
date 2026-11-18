/**
 * Home: every initiative in this session, with its base case at the shared
 * horizon. Rows stay in the order they were added — the list never ranks
 * (D02). The dashboard's totals and map build on this screen later.
 */
import {
  MOMENT_LABEL,
  STATE_COPY,
  calculatePortfolio,
  type HorizonMonths,
  type InitiativeResult,
  type PortfolioDocument,
} from '@engine';
import { useMemo } from 'react';
import { PageHead } from '../components/PageHead';
import { money, percent } from '../lib/numbers';
import { seriesVar, type ColorMap } from '../lib/series';

interface InitiativesScreenProps {
  doc: PortfolioDocument;
  exampleIds: string[];
  colors: ColorMap;
  horizon: HorizonMonths;
  onHorizonChange: (h: HorizonMonths) => void;
  onDelete: (id: string) => void;
  onLoadExample: () => void;
  /** e.g. "Deleted “Premium-upgrade prompt”." with an Undo. */
  removed: { name: string } | null;
  onUndoRemove: () => void;
}

function NetCell({ r }: { r: InitiativeResult }) {
  const m = r.metrics;
  if (r.state.kind === 'results' && m) return <>{money(m.impact.expected - m.totalCost)}</>;
  if (r.state.kind === 'not_live') return <span className="cell-note">Not live in this window</span>;
  return <span className="cell-note">—</span>;
}

function RoiCell({ r }: { r: InitiativeResult }) {
  const roi = r.metrics?.roiPct;
  if (r.state.kind === 'results' && roi) return <>{percent(roi.expected)}</>;
  return <span className="cell-note">—</span>;
}

function Notes({ r, mustDo }: { r: InitiativeResult; mustDo: boolean }) {
  const notes: string[] = [];
  if (r.state.kind === 'incomplete') {
    const n = r.state.missing.length;
    notes.push(`Needs ${n} more input${n === 1 ? '' : 's'}`);
  }
  if (r.state.kind === 'empty') notes.push('Nothing entered yet');
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

export function InitiativesScreen({
  doc,
  exampleIds,
  colors,
  horizon,
  onHorizonChange,
  onDelete,
  onLoadExample,
  removed,
  onUndoRemove,
}: InitiativesScreenProps) {
  const portfolio = useMemo(() => calculatePortfolio(doc), [doc]);
  const showsExample = doc.initiatives.some((i) => exampleIds.includes(i.id));
  const count = doc.initiatives.length;

  return (
    <>
      <PageHead
        title="Initiatives"
        subtitle="Everything in this session. Open one to edit it."
        horizon={horizon}
        onHorizonChange={onHorizonChange}
        action={
          <a className="button button--primary" href="#new">
            New initiative
          </a>
        }
      />

      <main className="list-page">
        <div className="list-head">
          <h2 className="eyebrow-title" id="list-title">
            {count === 1 ? '1 initiative' : `${count} initiatives`}
          </h2>
          {removed && (
            <p className="toolbar-status" role="status">
              Deleted “{removed.name}”.{' '}
              <button type="button" className="text-button" onClick={onUndoRemove}>
                Undo
              </button>
            </p>
          )}
        </div>

        {showsExample && (
          <p className="example-note">
            The first two are the worked example: a neobank weighing a fee and overdraft transparency redesign against
            a premium-upgrade prompt. Edit them, delete them, or add your own.
          </p>
        )}

        {count === 0 ? (
          <section className="list-empty">
            <p className="state-lead">{STATE_COPY.emptyPortfolio}</p>
            <p className="panel-text">
              Or load the worked example to see two initiatives side by side, already filled in.
            </p>
            <div className="list-empty-actions">
              <a className="button button--primary" href="#new">
                New initiative
              </a>
              <button type="button" className="button button--secondary" onClick={onLoadExample}>
                Load the worked example
              </button>
            </div>
          </section>
        ) : (
          <table className="initiative-table" aria-labelledby="list-title">
            <thead>
              <tr>
                <th scope="col">Initiative</th>
                <th scope="col" className="num">
                  {horizon}-month net value
                  <span className="th-sub">Base case</span>
                </th>
                <th scope="col" className="num">
                  {horizon}-month ROI
                  <span className="th-sub">Base case</span>
                </th>
                <th scope="col">Notes</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {doc.initiatives.map((i) => {
                const r = portfolio.results.get(i.id);
                if (!r) return null;
                const name = i.name.trim() || 'Untitled initiative';
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
                    <td className="num" data-label={`${horizon}-month net value`}>
                      <NetCell r={r} />
                    </td>
                    <td className="num" data-label={`${horizon}-month ROI`}>
                      <RoiCell r={r} />
                    </td>
                    <td data-label="Notes">
                      <Notes r={r} mustDo={i.must_do} />
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
        )}
      </main>
    </>
  );
}
