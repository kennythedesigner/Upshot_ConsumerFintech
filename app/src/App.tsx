/**
 * The initiative screen: inputs on the left, "Your numbers" pinned on the right.
 * Every figure is recomputed by the engine from the current inputs; nothing on
 * screen is typed in by hand (README: "save inputs, never outputs").
 */
import {
  DEFAULT_HORIZON,
  HORIZON_STOPS,
  calculateInitiative,
  createInitiative,
  createPortfolio,
  type BucketKind,
  type HorizonMonths,
  type Initiative,
  type PortfolioDocument,
  type ValueBucket,
} from '@engine';
import { useMemo, useState } from 'react';
import { HorizonSlider } from './components/HorizonSlider';
import { InitiativeForm, type GroupId } from './components/InitiativeForm';
import { ResultsPanel, type FieldTarget } from './components/ResultsPanel';
import { workedExample } from './lib/example';
import { HorizonMotion } from './lib/motion';
import { latestInitiative, loadSession, saveSession, upsertInitiative } from './lib/session';

const DEFAULT_OPEN: Record<GroupId, boolean> = {
  setup: true,
  volume: true,
  value: true,
  cost: true,
  confidence: true,
  complexity: false,
  strategy: false,
};

function isHorizon(n: unknown): n is HorizonMonths {
  return (HORIZON_STOPS as readonly unknown[]).includes(n);
}

interface Start {
  doc: PortfolioDocument;
  initiative: Initiative;
  horizon: HorizonMonths;
}

function start(): Start {
  const saved = loadSession();
  const doc = saved ?? createPortfolio();
  const last = saved ? latestInitiative(saved) : null;
  return {
    doc,
    initiative: last ? structuredClone(last) : createInitiative(doc.portfolio.id, ''),
    horizon: isHorizon(doc.portfolio.horizon_months) ? doc.portfolio.horizon_months : (DEFAULT_HORIZON as HorizonMonths),
  };
}

const reducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export default function App() {
  const [initial] = useState(start);
  const [doc, setDoc] = useState(initial.doc);
  const [initiative, setInitiative] = useState(initial.initiative);
  const [horizon, setHorizon] = useState(initial.horizon);
  const [open, setOpen] = useState(DEFAULT_OPEN);
  // Figures count toward new values only when the horizon moved (README, Motion).
  const [horizonMoved, setHorizonMoved] = useState(false);
  const [undo, setUndo] = useState<{ previous: Initiative; message: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const result = useMemo(() => calculateInitiative(initiative, horizon), [initiative, horizon]);

  const edited = () => {
    setHorizonMoved(false);
    setUndo(null);
    setSaveStatus(null);
  };

  const update = (patch: Partial<Initiative>) => {
    setInitiative((prev) => ({ ...prev, ...patch }));
    edited();
  };

  const updateBucket = (kind: BucketKind, patch: Partial<ValueBucket>) => {
    setInitiative((prev) => ({
      ...prev,
      buckets: { ...prev.buckets, [kind]: { ...prev.buckets[kind], ...patch } },
    }));
    edited();
  };

  const replaceInitiative = (next: Initiative, message: string) => {
    setUndo({ previous: initiative, message });
    setInitiative(next);
    setHorizonMoved(false);
    setSaveStatus(null);
  };

  const loadExample = () => replaceInitiative(workedExample(doc.portfolio.id), 'Worked example loaded.');
  const clearInputs = () => replaceInitiative(createInitiative(doc.portfolio.id, ''), 'Inputs cleared.');

  const changeHorizon = (h: HorizonMonths) => {
    setHorizon(h);
    setHorizonMoved(true);
    setSaveStatus(null);
  };

  const save = () => {
    const stamp = new Date().toISOString();
    const stamped: Initiative = { ...initiative, updated_at: stamp };
    const next = upsertInitiative(
      { ...doc, portfolio: { ...doc.portfolio, horizon_months: horizon, updated_at: stamp } },
      stamped,
    );
    const ok = saveSession(next);
    setDoc(next);
    setInitiative(stamped);
    setSaveStatus(ok ? 'Saved for this session' : "Couldn't save in this browser. Your inputs are still here.");
  };

  /** Open the group, then move focus to the field, so flags and missing items are one click from a fix. */
  const goTo = ({ group, field }: FieldTarget) => {
    setOpen((o) => ({ ...o, [group]: true }));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.getElementById(field);
        if (!el) return;
        el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
        el.focus({ preventScroll: true });
      }),
    );
  };

  return (
    <HorizonMotion.Provider value={horizonMoved}>
      <a className="skip-link" href="#results">
        Skip to your numbers
      </a>

      <header className="topbar">
        <div className="brand">
          <span className="wordmark" aria-label="Upshot">
            upshot
          </span>
          <span className="brand-sep" aria-hidden="true" />
          <span className="brand-desc">UX ROI calculator</span>
        </div>
      </header>

      <div className="page-head">
        <div className="title-block">
          <h1 className="page-title">New initiative</h1>
          <p className="page-subtitle">Turn your UX assumptions into a business case.</p>
        </div>
        <HorizonSlider value={horizon} onChange={changeHorizon} />
        <div className="save-block">
          <button type="button" className="button button--primary" onClick={save}>
            Save initiative
          </button>
          <p className="save-status" role="status">
            {saveStatus}
          </p>
        </div>
      </div>

      <main className="workspace">
        <section className="assumptions" aria-labelledby="assumptions-title">
          <div className="assumptions-head">
            <h2 className="eyebrow-title" id="assumptions-title">
              Initiative assumptions
            </h2>
            <div className="toolbar">
              {undo ? (
                <p className="toolbar-status" role="status">
                  {undo.message}{' '}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setInitiative(undo.previous);
                      setUndo(null);
                    }}
                  >
                    Undo
                  </button>
                </p>
              ) : (
                <>
                  <button type="button" className="text-button" onClick={loadExample}>
                    Load the worked example
                  </button>
                  <button type="button" className="text-button" onClick={clearInputs}>
                    Clear inputs
                  </button>
                </>
              )}
            </div>
          </div>
          <InitiativeForm
            key={initiative.id}
            initiative={initiative}
            open={open}
            onToggle={(id) => setOpen((o) => ({ ...o, [id]: !o[id] }))}
            onUpdate={update}
            onUpdateBucket={updateBucket}
          />
        </section>

        <aside className="results" id="results" tabIndex={-1} aria-label="Your numbers">
          <ResultsPanel
            initiative={initiative}
            result={result}
            horizon={horizon}
            onGo={goTo}
            onLoadExample={loadExample}
          />
        </aside>
      </main>
    </HorizonMotion.Provider>
  );
}
