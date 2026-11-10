# Upshot — calculation engine

The math behind **Upshot - a UX ROI calculator** ([uxroicalculator.app](https://uxroicalculator.app)).
It helps a consumer-fintech PM compare two initiatives before either is built, in dollars, with honest ranges. It never names a winner.

This repo holds the **calculation engine**: plain TypeScript functions with no screens. It follows decision log rev 23.

- **Hosting (D53a):** the calculator is a Framer code component on uxroicalculator.app. There is no separate app or subdomain.
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
| 11 | How many goals in the list (D33 says "short") | 10 at most | migration, `clean.ts` |
| 12 | Text length limits | Business goal 550 characters, goal name 80, portfolio name 100 | migration, `clean.ts` |
| 13 | Duplicate goal names | Rejected, ignoring case ("Trust" and "trust") | `clean.ts` |
| 14 | Line breaks in the business goal | Collapsed to spaces (it's one line in the dashboard header) | `clean.ts` |
| 15 | Checklist 3 says escape "on write" | Cleaned and length-checked on write, escaped on render. Escaping on write would show "&amp;" to the PM | `clean.ts` |
| 16 | Portfolio name, which no screen asks for yet | Saved as "My portfolio" by default | migration |

## Supabase setup (one time)

1. Create a Supabase project.
2. **Authentication → Sign In / Providers:** turn on **Anonymous sign-ins**.
3. **Authentication → Attack Protection:** turn on CAPTCHA (Cloudflare Turnstile). Supabase strongly recommends this for anonymous sign-ins, since bots can otherwise create users in bulk.
4. **SQL editor:** run `supabase/migrations/20261110000000_portfolio_metadata.sql`.
5. In the Framer component, use the project URL and the **anon (public) key only**. Never paste the service-role key anywhere in Framer; it bypasses every security rule.

Security rules in the migration:
- Signed-out requests get nothing.
- A visitor can only read, change or delete their own portfolio and goals.
- One portfolio per visitor, so re-submitting Onboarding updates it rather than duplicating it.
- Onboarding saves in one transaction: the whole goal list or nothing.
- Length limits live in the database too, not just the screen.

Rendering rule: show saved text as plain React text. Never use `dangerouslySetInnerHTML` for it.

## Not built yet

- Framer code component (waits on the Figma screens)
- E2E flow tests (checklist section 2)
