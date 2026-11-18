# Upshot — calculation engine

The math behind **Upshot - a UX ROI calculator** ([upshotpm.app](https://upshotpm.app)).
It helps a consumer-fintech PM compare two initiatives before either is built, in dollars, with honest ranges. It never names a winner.

This repo holds the **calculation engine** and the **Supabase backend** for Onboarding. It follows decision log rev 24.

- **Hosting (D53a):** the calculator is a Framer code component on upshotpm.app (D47). There is no separate app or subdomain.
- **Delivery:** `npm run build` makes two ES modules the Framer code component imports: `dist/upshot-engine.js` (the math) and `dist/upshot-data.js` (Onboarding save/load).
- **Database (D53b):** Supabase saves portfolio metadata only (the business goal and the goal/OKR list). Initiatives stay in the session (D57 deferred).
- **Visitors (D58):** each visitor is a Supabase anonymous user, so row-level security can trust who owns a row. Supabase keeps its sign-in token in the browser; no portfolio data is kept there (D52c).

## Commands

```bash
npm install      # once
npm test         # engine, data layer, and RLS tests (runs the real migration in PGlite)
npm run check    # type-check + tests + build (what CI runs)
```

## The calculator app (`app/`)

The screens, in plain React, styled with the Upshot design system. The app imports the engine's
source from `src/engine`, so the screens and `dist/upshot-engine.js` share one copy of the math.
Nothing on screen is hardcoded: every figure is recalculated from the inputs.

Built so far:

- **Dashboard** (`#dashboard`, home; `#initiatives` still works): portfolio totals at the shared
  horizon (expected impact, confidence-weighted impact, total cost, portfolio ROI; base cases only,
  ranges aren't summed, D45), the must-do share, which initiatives are left out for missing inputs,
  the double-count warning naming overlapping pairs (D44), the impact-vs-complexity map (D26;
  must-do drawn as a diamond), and every initiative with net value, ROI, ROI spread, Priority Score
  and complexity. Sorting is a lens, not a ranking; the default is the order added. Delete with
  undo; empty state. Goal subtotals are a later update.
- **Initiative screen** (`#new`, `#edit-<id>`): all seven input groups, the "Your numbers" panel
  (net value and ROI ranges, the base-case ledger, assumptions), flags, and the empty / incomplete /
  not-live states. Leaving with unsaved changes asks first.
- **Compare** (`#compare`): any two initiatives side by side (D02). Range charts put both
  initiatives' net value and ROI (low, base, high) on one axis; the table below covers setup, each
  value bucket, net value, ROI, ROI spread, total cost, payback, cost of delay, Priority Score,
  confidence, delivery complexity, pressure patterns, must-do and importance, with flags beside the
  row they're about. It notes overlapping moments (D36). No row or column is marked as the winner.
- One horizon slider shared by every screen (D20). A first visit seeds the worked example, A and B
  (D06). Each initiative keeps one colour on every screen. Everything stays in this browser tab's
  session (D57).

Next: review, then the marketing site.

```bash
cd app
npm install      # once
npm run dev      # local preview at http://localhost:5173
npm run check    # type-check + tests + build (CI runs this too)
```

Fonts (Newsreader, Public Sans) are bundled with the app, not loaded from Google Fonts, so a visit
makes no third-party requests.

## Layout

```
src/engine/
  types.ts        # data shapes = Backend Schema tables and lists
  settings.ts     # every tool assumption: confidence factors/spreads, D43 thresholds
  labels.ts       # on-screen wording for each code
  factory.ts      # new records with Schema defaults
  calculate.ts    # one initiative: ranges, ROI, Priority Score, payback, flags, states
  overlap.ts      # same / next-door consumer moments (D36, D42)
  portfolio.ts    # dashboard totals, goal subtotals, must-do share, map points (D45)
  format.ts       # display rounding (D51)
  messages.ts     # draft copy for states and flags (wording to finalize in the PRD)
  examples.ts     # TRD base test inputs
src/data/
  clean.ts        # cleans and checks Onboarding text before saving (checklist 3)
  portfolioMeta.ts  # anonymous session, load/save Onboarding, plain-language errors
app/              # the calculator screens (React); imports src/engine
supabase/
  migrations/     # tables, RLS policies, save_onboarding, retention functions
  jobs/           # run-once operational SQL (the retention cron job)
  __tests__/      # proves visitor B can't read or change visitor A's rows
```

Rule: **save inputs, never outputs.** Every number on screen is recomputed by the engine.

## Decided limits (D59, confirmed 2026-11-09)

| Rule | Value | Where |
|---|---|---|
| Goals in the goal/OKR list | 10 at most | migration, `clean.ts` |
| Business goal length | 550 characters | migration, `clean.ts` |
| Goal name length | 80 characters | migration, `clean.ts` |
| Portfolio name length | 100 characters | migration, `clean.ts` |
| Duplicate goal names | Rejected, ignoring case ("Trust" and "trust") | `clean.ts` |
| Line breaks in the business goal | Saved as one line | `clean.ts` |

## Decided engine edge cases (D60, confirmed 2026-11-09)

| # | Situation | What the code does | Where |
|---|---|---|---|
| 1 | Confidence spread pushes a lift past 100 pts (e.g. 80 pts at Low confidence → 140) | Caps the range end at 100 pts | `calculate.ts` `clampLift` |
| 2 | A bucket has a lift but no dollars, or dollars but no lift | Incomplete state, naming the missing half | `findMissing` |
| 3 | "Edit range" switched on but left blank | Falls back to the confidence spread; no "Custom range" tag | `calculateBucket` |
| 4 | High confidence with evidence type left blank | Fires the evidence-mismatch warning (same as "None") | `calculateInitiative` |
| 5 | Which flags show before results | Evidence mismatch, pressure note and "can't check overlap" show in every state; D43 sanity flags only with results | `calculateInitiative` |
| 6 | Not-live initiative in the portfolio | Counted: $0 impact, build cost added to total cost | `portfolio.ts` |
| 7 | Incomplete initiative in the portfolio | Listed, not summed | `portfolio.ts` |
| 8 | "How much of the total is must-do" (D45) | Reports count, expected impact and total cost | `portfolio.ts` |
| 9 | Overlap warning "N initiatives overlap" | N = initiatives in any overlapping pair | `overlap.ts` |
| 10 | Initiatives with no goal tag | Grouped as a "No goal" subtotal | `portfolio.ts` |

## Decided text handling (D61, confirmed 2026-11-09)

| # | Situation | What the code does | Where |
|---|---|---|---|
| 11 | Checklist 3 says escape "on write" | Cleaned and length-checked on write, escaped on render. Escaping on write would show "&amp;amp;" to the PM | `clean.ts` |
| 12 | Portfolio name, which no screen asks for yet | Saved as "My portfolio" by default | migration |

## Decided data retention (D62, confirmed 2026-11-14)

A visitor's rows are reachable only through the Supabase session token in their
browser (D58). Clear the browser and those rows are unreachable by the visitor
and by us, so a deletion request can never find them. The button covers people
who still have their session; the sweep covers everyone else.

| # | Rule | Value | Where |
|---|---|---|---|
| 13 | Onboarding metadata still persists | Kept. D57 will persist initiatives too, so the table is not throwaway | — |
| 14 | Retention window | 90 days since the portfolio was last saved, or since sign-in if nothing was saved | `delete_stale_visitors()` |
| 15 | Visitors who never saved | Swept on the same window, by `auth.users.created_at` | `delete_stale_visitors()` |
| 16 | On-demand deletion | `delete_my_data()`, called by the "Delete my saved data" control | `delete_my_data()` |
| 17 | The `auth.users` row | Removed by the sweep, not by the visitor — a client cannot delete an auth user | `delete_stale_visitors()` |
| 18 | Sweep schedule | Daily at 03:00 UTC, pg_cron job `upshot-delete-stale-visitors` | `supabase/jobs/` |
| 19 | Undo on deletion | None. The row is gone, so the undo-toast pattern does not apply; a confirm does | UI |

## Not built yet

- Goal / OKR subtotals on the dashboard
- Where the app is hosted. D53a assumed a Framer code component; `app/` is a standalone React
  app that can be deployed on its own or embedded
- E2E flow tests (checklist section 2)
- The "Delete my saved data" control (the function behind it is live)
- Privacy policy (inputs now settled: what is stored, 90 days, in-product delete,
  Supabase as processor)
