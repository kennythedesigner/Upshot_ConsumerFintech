/**
 * Privacy, from Kennedi's screens, still marked a draft. Filled in since
 * the design: the Supabase region, and a Theme section for the D65
 * preference cookie (new — flagged to Kennedi). Two sections describe
 * parts of the app that are not built yet (Onboarding's save, the delete
 * control); that stays on her open list for launch.
 */
const SECTIONS: Array<{ h: string; body: string[] }> = [
  {
    h: 'Saved',
    body: ['Your business goal, your goal list and an anonymous sign-in ID. No name and no account.'],
  },
  {
    h: 'Not saved',
    body: ['Your initiatives and results. They stay in your browser tab.'],
  },
  {
    h: 'Where',
    body: ['Supabase, Canada (Central).'],
  },
  {
    h: 'How long',
    body: ['Deleted 90 days after you last saved.'],
  },
  {
    h: 'Delete now',
    body: ['Use the “Delete my saved data” control in the app.'],
  },
  {
    h: 'Email',
    body: ['Optional, with an unsubscribe link in every email.'],
  },
  {
    h: 'Theme',
    body: [
      'A small cookie remembers your light-or-dark choice across upshotpm.app and app.upshotpm.app. It stores that one word and nothing else.',
    ],
  },
  {
    h: 'Analytics and contact',
    body: ['Analytics: [fill in].', 'Contact: [contact email].'],
  },
];

export function Privacy() {
  return (
    <>
      <section className="hero hero--page">
        <p className="kicker">Last updated [date]</p>
        <h1 className="display">Privacy</h1>
        <p className="kicker">Draft, to be reviewed</p>
      </section>
      {SECTIONS.map((s) => (
        <section className="section legal-section" key={s.h} aria-label={s.h}>
          <h2 className="heading">{s.h}</h2>
          {s.body.map((line) => (
            <p className="body-line" key={line}>
              {line}
            </p>
          ))}
        </section>
      ))}
    </>
  );
}
