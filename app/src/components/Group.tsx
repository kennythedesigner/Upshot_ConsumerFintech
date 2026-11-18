/**
 * One form group. Open, it's a serif header over its fields, separated from
 * the next group by space and a hairline. Closed, it becomes a raised row with
 * a one-line summary of what it holds — the one place the system allows a
 * raised surface besides flag cards.
 */
import type { ReactNode } from 'react';
import { Chevron } from './Icons';

interface GroupProps {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  /** Shown only while closed. Empty groups show the title alone. */
  summary?: string;
  children: ReactNode;
}

export function Group({ id, title, open, onToggle, summary, children }: GroupProps) {
  const bodyId = `${id}-body`;
  return (
    <section className={`group${open ? ' is-open' : ' is-closed'}`} aria-labelledby={`${id}-heading`}>
      <h3 className="group-heading" id={`${id}-heading`}>
        <button
          type="button"
          id={`${id}-toggle`}
          className="group-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          <span className="group-title-wrap">
            <span className="group-title">{title}</span>
            {!open && summary && <span className="group-summary">{summary}</span>}
          </span>
          <Chevron direction={open ? 'up' : 'down'} />
        </button>
      </h3>
      <div className="group-body" id={bodyId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
