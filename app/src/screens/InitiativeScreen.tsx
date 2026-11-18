/**
 * One initiative: inputs on the left, "Your numbers" pinned on the right.
 * The draft lives in App, so App can tell when there are unsaved changes.
 * Every figure is recomputed by the engine from the current inputs.
 */
import {
  calculateInitiative,
  createInitiative,
  type BucketKind,
  type HorizonMonths,
  type Initiative,
  type ValueBucket,
} from '@engine';
import { useMemo, useState } from 'react';
import { InitiativeForm, type GroupId } from '../components/InitiativeForm';
import { PageHead } from '../components/PageHead';
import { ResultsPanel, type FieldTarget } from '../components/ResultsPanel';

const DEFAULT_OPEN: Record<GroupId, boolean> = {
  setup: true,
  volume: true,
  value: true,
  cost: true,
  confidence: true,
  complexity: false,
  strategy: false,
};

const reducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

interface InitiativeScreenProps {
  draft: Initiative;
  isNew: boolean;
  dirty: boolean;
  horizon: HorizonMonths;
  onHorizonChange: (h: HorizonMonths) => void;
  onChange: (next: Initiative) => void;
  onSave: () => void;
  saveStatus: string | null;
}

export function InitiativeScreen({
  draft,
  isNew,
  dirty,
  horizon,
  onHorizonChange,
  onChange,
  onSave,
  saveStatus,
}: InitiativeScreenProps) {
  const [open, setOpen] = useState(DEFAULT_OPEN);
  const [undo, setUndo] = useState<{ previous: Initiative; message: string } | null>(null);

  const result = useMemo(() => calculateInitiative(draft, horizon), [draft, horizon]);

  const update = (patch: Partial<Initiative>) => {
    onChange({ ...draft, ...patch });
    setUndo(null);
  };

  const updateBucket = (kind: BucketKind, patch: Partial<ValueBucket>) => {
    onChange({ ...draft, buckets: { ...draft.buckets, [kind]: { ...draft.buckets[kind], ...patch } } });
    setUndo(null);
  };

  const clearInputs = () => {
    setUndo({ previous: draft, message: 'Inputs cleared.' });
    // Same id, so clearing an existing initiative and saving replaces it in place.
    const blank = createInitiative(draft.portfolio_id, '');
    onChange({ ...blank, id: draft.id, created_at: draft.created_at });
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

  const title = isNew && !draft.name.trim() ? 'New initiative' : draft.name.trim() || 'Untitled initiative';

  return (
    <>
      <PageHead
        title={title}
        subtitle="Turn your UX assumptions into a business case."
        back={<a href="#initiatives">← All initiatives</a>}
        horizon={horizon}
        onHorizonChange={onHorizonChange}
        action={
          <>
            <button type="button" className="button button--primary" onClick={onSave}>
              Save initiative
            </button>
            <p className="save-status" role="status">
              {saveStatus ?? (dirty ? 'Unsaved changes' : null)}
            </p>
          </>
        }
      />

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
                      onChange(undo.previous);
                      setUndo(null);
                    }}
                  >
                    Undo
                  </button>
                </p>
              ) : (
                <button type="button" className="text-button" onClick={clearInputs}>
                  Clear inputs
                </button>
              )}
            </div>
          </div>
          <InitiativeForm
            key={draft.id}
            initiative={draft}
            open={open}
            onToggle={(id) => setOpen((o) => ({ ...o, [id]: !o[id] }))}
            onUpdate={update}
            onUpdateBucket={updateBucket}
          />
        </section>

        <aside className="results" id="results" tabIndex={-1} aria-label="Your numbers">
          <ResultsPanel initiative={draft} result={result} horizon={horizon} onGo={goTo} />
        </aside>
      </main>
    </>
  );
}
