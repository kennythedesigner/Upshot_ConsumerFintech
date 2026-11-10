# Upshot — calculation engine

The math behind **Upshot - a UX ROI calculator** ([uxroicalculator.app](https://uxroicalculator.app)).
It helps a consumer-fintech PM compare two initiatives before either is built, in dollars, with honest ranges. It never names a winner.

This repo holds the **calculation engine**: plain TypeScript functions with no screens. It follows decision log rev 23.

- **Hosting (D53a):** the calculator is a Framer code component on uxroicalculator.app. There is no separate app or subdomain.
- **Engine delivery:** `npm run build` makes one ES module, `dist/upshot-engine.js`, that the Framer code component imports.
- **Database (D53b):** Supabase saves portfolio metadata only (the business goal and the goal/OKR list). Initiatives stay in the session (D57 deferred). Nothing is kept in browser storage (D52c).

## Commands

```bash
npm install      # once
npm test         # TRD test cases 1–9 plus extra cases
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
  __tests__/
```

Rule: **save inputs, never outputs.** Every number on screen is recomputed by the engine.

## Judgment calls made in code (not covered by the decision log)

Each is a one-line change. Flagged for a yes/no.

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

## Not built yet

- Framer code component (waits on the Figma screens)
- Supabase table and RLS policy for portfolio metadata (waits on the scoping decision; see the TRD and Backend Schema update pass)
- E2E flow tests (checklist section 2)
