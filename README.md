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
supabase/
  migrations/     # tables, RLS policies, save_onboarding function
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

## Judgment calls still to confirm (D60a, D61)

| # | Situation | What the code does | Where |
|---|---|---|---|
| 9 | Overlap warning "N initiatives overlap" | N = initiatives in any overlapping pair | `overlap.ts` |
| 10 | Initiatives with no goal tag | Grouped as a "No goal" subtotal | `portfolio.ts` |
| 11 | Checklist 3 says escape "on write" | Cleaned and length-checked on write, escaped on render. Escaping on write would show "&amp;amp;" to the PM | `clean.ts` |
| 12 | Portfolio name, which no screen asks for yet | Saved as "My portfolio" by default | migration |

## Not built yet

- Framer code component (waits on the Figma screens)
- E2E flow tests (checklist section 2)
