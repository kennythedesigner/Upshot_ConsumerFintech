/**
 * The app shell: which screen is showing, the session's initiatives, the
 * shared horizon (D20), and the guard that stops unsaved edits being lost.
 *
 * Everything persists to this tab's sessionStorage (D57). Screens are plain
 * #names (see lib/router.ts), so back, forward and bookmarks work.
 */
import {
  DEFAULT_HORIZON,
  HORIZON_STOPS,
  createInitiative,
  createPortfolio,
  type HorizonMonths,
  type Initiative,
} from '@engine';
import { useEffect, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { workedPair } from './lib/example';
import { HorizonMotion } from './lib/motion';
import { HOME, parseHash, sameRoute, toHash, type Route } from './lib/router';
import {
  loadSession,
  normalize,
  removeInitiative,
  restoreInitiative,
  saveSession,
  upsertInitiative,
  type Session,
  type SortKey,
} from './lib/session';
import { CompareScreen } from './screens/CompareScreen';
import { InitiativeScreen } from './screens/InitiativeScreen';
import { DashboardScreen } from './screens/DashboardScreen';

/** Compare drafts by content; the save timestamp alone isn't a change. */
const fingerprint = (i: Initiative): string => JSON.stringify({ ...i, updated_at: '' });

const isEditor = (r: Route): boolean => r.screen === 'new' || r.screen === 'edit';

function isHorizon(n: unknown): n is HorizonMonths {
  return (HORIZON_STOPS as readonly unknown[]).includes(n);
}

/** First visit: seed the worked example, A and B (D06), so every screen has something real on it. */
function seeded(): Session {
  const doc = createPortfolio();
  const [a, b] = workedPair(doc.portfolio.id);
  return normalize({
    doc: { ...doc, initiatives: [a, b] },
    exampleIds: [a.id, b.id],
    colors: {},
    compare: { a: a.id, b: b.id },
    sort: 'added',
  });
}

interface Opened {
  route: Route;
  draft: Initiative | null;
  missing: boolean;
}

/** What a route shows, given the session. An unknown id falls back to the list. */
function open(route: Route, session: Session): Opened {
  if (route.screen === 'new') {
    return { route, draft: createInitiative(session.doc.portfolio.id, ''), missing: false };
  }
  if (route.screen === 'edit') {
    const found = session.doc.initiatives.find((i) => i.id === route.id);
    if (found) return { route, draft: structuredClone(found), missing: false };
    return { route: HOME, draft: null, missing: true };
  }
  return { route, draft: null, missing: false };
}

function boot() {
  const session = loadSession() ?? seeded();
  if (!isHorizon(session.doc.portfolio.horizon_months)) {
    session.doc.portfolio.horizon_months = DEFAULT_HORIZON as HorizonMonths;
  }
  const opened = open(parseHash(window.location.hash), session);
  return { session, opened };
}

export default function App() {
  const [initial] = useState(boot);
  const [session, setRawSession] = useState(initial.session);
  /** Every change to the list goes through normalize, so colours and the compared pair stay valid. */
  const setSession = (fn: (s: Session) => Session) => setRawSession((s) => normalize(fn(s)));
  const [route, setRoute] = useState(initial.opened.route);
  const [draft, setDraft] = useState<Initiative | null>(initial.opened.draft);
  const [baseline, setBaseline] = useState(initial.opened.draft ? fingerprint(initial.opened.draft) : '');
  const [notice, setNotice] = useState<string | null>(
    initial.opened.missing ? "That initiative isn't in this session any more." : null,
  );
  const [pending, setPending] = useState<Route | null>(null);
  const [removed, setRemoved] = useState<{ initiative: Initiative; index: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  // Figures count toward new values only when the horizon moved (design system, Motion).
  const [horizonMoved, setHorizonMoved] = useState(false);

  const horizon = session.doc.portfolio.horizon_months;
  const dirty = draft !== null && fingerprint(draft) !== baseline;

  // Keep the tab's copy current.
  useEffect(() => {
    setStorageOk(saveSession(session));
  }, [session]);

  /** Show a route. Moves the address bar only when asked; a link click has already moved it. */
  const show = (to: Route, push: boolean) => {
    const opened = open(to, session);
    setRoute(opened.route);
    setDraft(opened.draft);
    setBaseline(opened.draft ? fingerprint(opened.draft) : '');
    setNotice(opened.missing ? "That initiative isn't in this session any more." : null);
    setPending(null);
    setSaveStatus(null);
    setHorizonMoved(false);
    if (opened.route.screen !== 'dashboard') setRemoved(null);
    const hash = toHash(opened.route);
    if (push && window.location.hash !== hash) window.history.pushState(null, '', hash);
    else if (opened.missing) window.history.replaceState(null, '', hash);
    window.scrollTo({ top: 0 });
  };

  // Links, back and forward all arrive here. Leaving an editor with unsaved
  // changes puts the editor back in the address bar and asks first.
  const latest = useRef({ route, dirty, show });
  latest.current = { route, dirty, show };
  useEffect(() => {
    const onHash = () => {
      const { route: current, dirty: unsaved, show: go } = latest.current;
      const next = parseHash(window.location.hash);
      if (sameRoute(next, current)) return;
      if (isEditor(current) && unsaved) {
        window.history.replaceState(null, '', toHash(current));
        setPending(next);
        return;
      }
      go(next, false);
    };
    // A link click is caught before it moves the address bar, so asking first
    // leaves history clean. Back and forward can only be caught after (above).
    const onClick = (e: MouseEvent) => {
      const { route: current, dirty: unsaved } = latest.current;
      if (!isEditor(current) || !unsaved || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href') ?? '';
      if (href === '#results') return;
      const next = parseHash(href);
      if (sameRoute(next, current)) return;
      e.preventDefault();
      setPending(next);
    };
    window.addEventListener('hashchange', onHash);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  // Closing or reloading the tab with unsaved changes gets the browser's own warning.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const changeHorizon = (h: HorizonMonths) => {
    setSession((s) => ({ ...s, doc: { ...s.doc, portfolio: { ...s.doc.portfolio, horizon_months: h } } }));
    setHorizonMoved(true);
  };

  const changeDraft = (next: Initiative) => {
    setDraft(next);
    setHorizonMoved(false);
    setSaveStatus(null);
  };

  const save = () => {
    if (!draft) return;
    const stamp = new Date().toISOString();
    const stamped: Initiative = { ...draft, updated_at: stamp };
    setSession((s) => ({ ...s, doc: upsertInitiative(s.doc, stamped) }));
    setDraft(stamped);
    setBaseline(fingerprint(stamped));
    if (route.screen === 'new') {
      const editing: Route = { screen: 'edit', id: stamped.id };
      window.history.replaceState(null, '', toHash(editing));
      setRoute(editing);
    }
    setSaveStatus('Saved for this session');
  };

  const remove = (id: string) => {
    const index = session.doc.initiatives.findIndex((i) => i.id === id);
    const initiative = session.doc.initiatives[index];
    if (!initiative) return;
    setSession((s) => ({ ...s, doc: removeInitiative(s.doc, id) }));
    setRemoved({ initiative, index });
  };

  const undoRemove = () => {
    if (!removed) return;
    setSession((s) => ({ ...s, doc: restoreInitiative(s.doc, removed.initiative, removed.index) }));
    setRemoved(null);
  };

  const loadExample = () => {
    const [a, b] = workedPair(session.doc.portfolio.id);
    setSession((s) => ({
      ...s,
      doc: { ...s.doc, initiatives: [...s.doc.initiatives, a, b] },
      exampleIds: [...s.exampleIds, a.id, b.id],
      compare: { a: a.id, b: b.id },
    }));
    setRemoved(null);
  };

  const pick = (slot: 'a' | 'b', id: string) =>
    setSession((s) => {
      const other = slot === 'a' ? s.compare.b : s.compare.a;
      // Picking the initiative already in the other slot swaps them.
      if (id === other) return { ...s, compare: { a: s.compare.b, b: s.compare.a } };
      return { ...s, compare: { ...s.compare, [slot]: id } };
    });

  const changeSort = (sort: SortKey) => setSession((s) => ({ ...s, sort }));

  /** From the overlap warning: put the pair in Compare and go there. */
  const compareFrom = (a: string, b: string) => {
    setSession((s) => ({ ...s, compare: { a, b } }));
    show({ screen: 'compare' }, true);
  };

  const swap = () => setSession((s) => ({ ...s, compare: { a: s.compare.b, b: s.compare.a } }));

  // The tab title follows the screen.
  useEffect(() => {
    const title =
      route.screen === 'dashboard'
        ? 'Dashboard'
        : route.screen === 'compare'
          ? 'Compare'
          : route.screen === 'new' && !draft?.name.trim()
            ? 'New initiative'
            : draft?.name.trim() || 'Untitled initiative';
    document.title = `${title} · Upshot`;
  }, [route, draft?.name]);

  // The unsaved-changes prompt takes focus when it appears, so keyboard and
  // screen-reader users meet it straight away.
  const leaveRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (pending) leaveRef.current?.focus();
  }, [pending]);

  const draftName = draft?.name.trim() || 'this initiative';

  return (
    <HorizonMotion.Provider value={horizonMoved}>
      {isEditor(route) && (
        <a
          className="skip-link"
          href="#results"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('results')?.focus();
          }}
        >
          Skip to your numbers
        </a>
      )}

      <TopBar current={route.screen === 'dashboard' ? 'dashboard' : route.screen === 'compare' ? 'compare' : null} />

      {pending && (
        <section className="leave-banner" aria-labelledby="leave-title">
          <h2 className="leave-title" id="leave-title" tabIndex={-1} ref={leaveRef}>
            You have unsaved changes to {draftName}.
          </h2>
          <div className="leave-actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                const to = pending;
                save();
                show(to, true);
              }}
            >
              Save and leave
            </button>
            <button type="button" className="button button--secondary" onClick={() => show(pending, true)}>
              Leave without saving
            </button>
            <button type="button" className="text-button" onClick={() => setPending(null)}>
              Keep editing
            </button>
          </div>
        </section>
      )}

      {(notice || !storageOk) && (
        <p className="app-notice" role="status">
          {notice}
          {!storageOk && " This browser isn't keeping your work, so it will be gone when you close the tab."}
        </p>
      )}

      {route.screen === 'compare' ? (
        <CompareScreen
          initiatives={session.doc.initiatives}
          colors={session.colors}
          pair={session.compare}
          horizon={horizon}
          onHorizonChange={changeHorizon}
          onPick={pick}
          onSwap={swap}
        />
      ) : route.screen === 'dashboard' || !draft ? (
        <DashboardScreen
          doc={session.doc}
          exampleIds={session.exampleIds}
          colors={session.colors}
          sort={session.sort}
          onSortChange={changeSort}
          onCompare={compareFrom}
          horizon={horizon}
          onHorizonChange={changeHorizon}
          onDelete={remove}
          onLoadExample={loadExample}
          removed={removed ? { name: removed.initiative.name.trim() || 'Untitled initiative' } : null}
          onUndoRemove={undoRemove}
        />
      ) : (
        <InitiativeScreen
          draft={draft}
          isNew={route.screen === 'new'}
          dirty={dirty}
          horizon={horizon}
          onHorizonChange={changeHorizon}
          onChange={changeDraft}
          onSave={save}
          saveStatus={saveStatus}
        />
      )}
    </HorizonMotion.Provider>
  );
}
