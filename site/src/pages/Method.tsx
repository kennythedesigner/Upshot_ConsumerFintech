/**
 * Method ("How the math works"), from Kennedi's screens. The worked-example
 * line is filled in (it was [input sources] in the design) and links to the
 * sources page in the repo. The FAQ answers are drafted by Claude in the
 * system's voice — the screens only showed the questions — and are flagged
 * for Kennedi's read.
 */
const SOURCES_URL =
  'https://github.com/kennythedesigner/Upshot_ConsumerFintech/blob/main/docs/worked-example-sources.md';

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Why ranges instead of one number?',
    a: 'A single number claims a precision the inputs don’t have. The range shows the low, expected and high cases, sized by your own confidence level, so a reader sees how sure you are — not just how big the number is.',
  },
  {
    q: 'Why no winner?',
    a: 'The prioritization call is yours. Upshot puts each initiative in dollars over the same window and shows where every figure comes from; it is directional, not predictive, and a verdict would pretend the tool knows things it doesn’t.',
  },
  {
    q: 'What counts as a pressure pattern?',
    a: 'Six things: urgency or countdowns, pre-selected or opt-out choices, saying no being harder than saying yes, cost or terms shown late or in fine print, guilt or shame wording, and a prompt shown at a stressful moment. The test behind them: if the customer fully understood what’s happening, would they still choose it? Ticking patterns never changes the math.',
  },
  {
    q: 'Is my data saved?',
    a: 'Your initiatives and their results stay in your browser tab and clear when you close it. The only things saved are your business goal and goal list, under an anonymous ID, deleted 90 days after you last saved. The Privacy page has the details.',
  },
];

export function Method() {
  return (
    <>
      <section className="hero hero--page">
        <h1 className="display">How the math works</h1>
      </section>

      <section className="section section--first" aria-label="The formula">
        <div className="formula-card">
          <p className="formula">
            Monthly impact = consumers a month × (lift now × value now + lift later × value later +
            lift saved × value saved).
          </p>
          <p className="formula-note">Lifts are in points (0–100); ROI is in %.</p>
        </div>
      </section>

      <section className="section" aria-labelledby="spreads-title">
        <h2 className="heading" id="spreads-title">
          Confidence spreads
        </h2>
        <p className="assumption-note">Upshot’s assumption</p>
        <table className="spread-table">
          <thead>
            <tr>
              <th scope="col">Confidence</th>
              <th scope="col">Spread</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Low</td>
              <td>±75%</td>
            </tr>
            <tr>
              <td>Medium</td>
              <td>±50%</td>
            </tr>
            <tr>
              <td>High</td>
              <td>±25%</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="section" aria-labelledby="assumes-title">
        <h2 className="heading" id="assumes-title">
          What the estimate assumes
        </h2>
        <p className="body-line">Accrual is linear, with no compounding.</p>
        <p className="body-line">All buckets move to Low or High together.</p>
        <p className="body-line">Portfolio totals add base cases only. Ranges aren’t summed.</p>
      </section>

      <section className="section" aria-labelledby="worked-title">
        <h2 className="heading" id="worked-title">
          Worked example
        </h2>
        <p className="body-line">
          The worked example’s inputs come from public figures — Monzo’s FY2026 subscriber growth,
          Revolut and SoFi plan prices, Chime’s revenue per member, and U.S. Bureau of Labor
          Statistics wage data.{' '}
          <a className="text-link" href={SOURCES_URL}>
            See every input and its source.
          </a>
        </p>
      </section>

      <section className="section" aria-labelledby="faq-title">
        <h2 className="heading" id="faq-title">
          Frequently asked questions
        </h2>
        <div className="faq">
          {FAQ.map((item) => (
            <details className="faq-item" key={item.q}>
              <summary className="faq-q">
                {item.q}
                <span className="faq-mark" aria-hidden="true" />
              </summary>
              <p className="faq-a">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
