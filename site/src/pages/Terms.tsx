/**
 * Terms. Copy deck rev 2, applied 2026-11-20.
 *
 * The four sections used to restate their own headings; these are real
 * sentences now. They are plain-English drafts written by Claude, who is not
 * a lawyer — the page stays marked a draft until someone qualified reads it,
 * and the liability sentence is the one most worth a second opinion.
 */
const SECTIONS: Array<{ h: string; body: string }> = [
  {
    h: 'Educational and portfolio tool',
    body:
      'Upshot is a personal portfolio project by Kennedi Cosma, built to show how prioritization decisions can be framed in dollars. It is not a commercial product, and there is no company behind it.',
  },
  {
    h: 'Directional figures',
    body:
      'Every figure Upshot shows is calculated from assumptions you enter. The results are directional estimates, not predictions, and not financial, investment, legal or accounting advice. Don’t rely on them as the only basis for a business decision.',
  },
  {
    h: 'Provided as-is',
    body:
      'Upshot is provided as-is, with no warranty of any kind. It may change or go offline at any time without notice. To the extent the law allows, Kennedi Cosma is not liable for any loss arising from your use of it.',
  },
  { h: 'Contact', body: 'Questions about these terms: [contact email].' },
];

export function Terms() {
  return (
    <>
      <section className="hero hero--page">
        <p className="kicker">Last updated December 1, 2026</p>
        <h1 className="display">Terms</h1>
        <p className="kicker">Draft, to be reviewed</p>
      </section>
      {SECTIONS.map((s) => (
        <section className="section legal-section" key={s.h} aria-label={s.h}>
          <h2 className="heading">{s.h}</h2>
          <p className="body-line">{s.body}</p>
        </section>
      ))}
    </>
  );
}
