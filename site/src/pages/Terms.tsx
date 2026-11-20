/**
 * Terms, from Kennedi's screens, still marked a draft. The sections
 * currently restate their headings — real sentences, and a qualified
 * reader, are on her open list before launch. One addition since the
 * design: a "Last updated" line, to match Privacy.
 */
const SECTIONS: Array<{ h: string; body: string }> = [
  { h: 'Educational and portfolio tool', body: 'Upshot is an educational and portfolio tool.' },
  { h: 'Directional figures', body: 'Figures are directional, not financial advice.' },
  { h: 'Provided as-is', body: 'Upshot is provided as-is, without warranties.' },
  { h: 'Contact', body: '[contact email]' },
];

export function Terms() {
  return (
    <>
      <section className="hero hero--page">
        <p className="kicker">Last updated [date]</p>
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
