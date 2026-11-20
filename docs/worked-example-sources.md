# Worked example: where the inputs come from

The worked example (D05, D06) is a fictional neobank weighing two initiatives:

- **A.** Fee and overdraft transparency redesign
- **B.** Premium-upgrade prompt in the app

The bank is made up, so its size (consumers a month) and its timelines are stated assumptions. Every other input comes from a public figure, or is worked out from one, as marked below. The same notes sit beside each input in `app/src/lib/example.ts`.

How the engine reads an input: each month, consumers × lift (points out of 100) × dollars per affected consumer = that month's impact for the bucket (D09, D13).

## B. Premium-upgrade prompt (sourced 2026-11-19, D63)

| Input | Value | Type | Basis |
|---|---|---|---|
| Consumers a month | 120,000 | Assumption | Free-plan members who see the prompt. The bank is fictional. |
| Revenue now: lift | 0.3 pts | Worked out | Monzo went from 1m+ to 1.6m+ subscribers in FY2026 on 10.4m monthly active users: about 0.57% of free users upgrading a month, every channel combined, net of cancellations. One prompt is one channel, so about half. |
| Revenue now: $ | $30 | Sourced | Three months of a US plan: Revolut Premium $9.99/month, SoFi Plus $10/month. |
| Retention: lift | 0.03 pts | Assumption | **Weakest input.** Digital-bank churn is reported at roughly 12–25% a year (low-quality sources). No public source says how much a paid plan cuts churn; this assumes it halves it for the 0.3 points who upgrade. |
| Retention: $ | $257 | Sourced | A year of revenue from a kept member: Chime's average revenue per active member, Q4 2025. |
| Cost saved | blank | — | Not used. |
| Build cost | $90,000 | Worked out | BLS median software developer wage $135,980 (May 2025). Wages are 70% of employer cost (ECEC, June 2026), so about $16,200 a developer-month. $90,000 is about 5½ developer-months. |
| Run cost | $1,600/month | Worked out | About 10% of one developer-month, for upkeep. |
| Months until live | 1 | Assumption | |
| Confidence / evidence | Low / Benchmark | — | Benchmarks only, no data from this bank. |

Cross-check: across subscription apps, freemium apps convert a median 2.2% of downloads to paid (RevenueCat, State of Subscription Apps 2025). B's old 1.5 points would have meant one prompt doing most of that alone.

Result at 12 months: net value $113,000, ROI 105% (−49% to 259%), payback 5.9 months.

## A. Fee and overdraft transparency redesign (sourced 2026-11-20, D64)

A clearer fee and overdraft screen. It gives up fee revenue (fewer overdrafts), keeps some customers who would have left over fees, and cuts support contacts. The fee the bank charges is the single most load-bearing input, and it is a stated assumption — the bank is fictional.

| Input | Value | Type | Basis |
|---|---|---|---|
| Consumers a month | 180,000 | Assumption | People who hit the fees-and-overdraft moment. |
| Revenue now: lift | 8 pts | Worked out | Overdraft alerts cut charges **4–19%** in a UK field study (Journal of Finance, 2024); 8 points is mid-range. |
| Revenue now: $ | −$27 | Sourced | Fee revenue **given up**: the average US overdraft fee is ~$26.77 (Bankrate, 2025). Negative bucket (D10). |
| Retention: lift | 0.8 pts | Worked out | Customers charged a fee are **>2× as likely to switch** banks (J.D. Power); clearer fees keep a few. |
| Retention: $ | $257 | Sourced | A year of revenue from a kept member: Chime ARPAM, Q4 2025. |
| Cost saved: lift | 4 pts | Assumption | Fewer overdraft surprises → fewer support contacts. |
| Cost saved: $ | $13.50 | Sourced | Median cost of an assisted support contact (Gartner). |
| Build cost | $240,000 | Worked out | ~15 developer-months at ~$16,200 each (BLS wage / 70% ECEC wage share), for a compliance-touching redesign across several teams. |
| Confidence / evidence | Medium / Benchmark | — | Other banks' benchmarks, not this bank's data. |

Result at 12 months: net **$701,800**, ROI **292%**, but a very wide range (**−1,848% to +2,433%**). The width is the point: A's value is a small gap between a large fee loss and large retention gains, so in the worst case it loses many times its build cost, and in the best case it pays back handsomely. That is the honest shape of a transparency bet, and it is why Upshot shows a range and never names a winner (D02).

Against B's tidy +105%, A has the higher headline numbers and the far wider range — a real A-vs-B tension rather than a clear answer.

### The fee is a knob

A's result swings hard on two assumptions: the fee charged and how effective the alerts are. At the industry-average $27 fee, A ranges from mildly negative to strongly positive depending on the alert-effectiveness assumption (4–19%); 8 points lands it positive. A lower fee ($10, as Bank of America now charges) makes A strongly positive; a higher one ($35) can make it fail to pay back. These are the inputs to change first if the example should tell a different story.

## Sources

- Monzo, [Year in review 2026](https://monzo.com/annual-report/2026) — 1.6m+ subscribers, 10.4m monthly active users
- nocash.ro, [Monzo FY2026 results](https://nocash.ro/?p=79579) — subscribers 1.6m+ (FY2025: 1m+)
- Revolut, [Revolut fees in the US explained](https://www.revolut.com/en-US/blog/post/revolut-fees-us/) — Premium $9.99/month
- SoFi, [What is a SoFi Plus membership](https://www.sofi.com/sofi-plus-membership/) — $10/month
- Zacks, [Chime Q4 2025 key metrics](https://www.zacks.com/stock/news/2875760/compared-to-estimates-chime-financial-inc-chym-q4-earnings-a-look-at-key-metrics) — ARPAM $257
- Checkbook / Bankrate, [Overdraft fees remain costly](https://www.checkbook.org/washington-area/consumers-notebook/articles/Overdraft-Fees-Remain-Costly-Here-s-How-to-Avoid-Them-7991) — average overdraft fee $26.77 (2025)
- EurekAlert / Journal of Finance, [Automatic overdraft-alert enrollment](https://www.eurekalert.org/news-releases/1070375) — SMS alerts cut overdraft and unpaid-item charges 4–19%
- Banking Dive, [Fees make customers twice as likely to switch banks](https://www.bankingdive.com/news/fees-make-customers-twice-as-likely-to-switch-banks-study-finds/618107/) — J.D. Power
- Gartner, [Customer service cost per contact](https://www.gartner.com/en/documents/5164231) — median assisted contact $13.50
- U.S. Bureau of Labor Statistics, [Software developers](https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm) — median wage $135,980, May 2025
- U.S. Bureau of Labor Statistics, [Employer costs for employee compensation, June 2026](https://www.bls.gov/news.release/ecec.nr0.htm) — wages 70.0% of employer costs
- Airbridge, [Hard paywall vs freemium in 2026](https://www.airbridge.io/en/blog/hard-paywall-vs-freemium-2026) — RevenueCat SOSA 2025, freemium median 2.2%
- Oradian, [Retaining digital customers as a neobank](https://oradian.com/insights/public/from-onboarding-to-advocacy-retaining-digital-customers-as-a-neobank/) — ~12% annual churn (low-quality source)
- Novus, [Digital banking loyalty strategies](https://www.novus-loyalty.com/blog/?p=3768) — 15–25% annual churn, citing Statista (low-quality source)
