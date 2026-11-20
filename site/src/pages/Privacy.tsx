/**
 * Privacy. Copy deck rev 2, applied 2026-11-20.
 *
 * Kennedi chose: describe what is true TODAY, and rewrite when Onboarding
 * ships. So the calculator stores nothing on a server — but a signup address
 * does, now that the form is wired (D52a), and these sections say both.
 *
 * Removal is by email until the in-app delete control is built, which makes
 * the contact address a launch blocker, not a nicety. It is still a
 * placeholder below.
 */
import { withContactLink } from '../lib/contact';

const SECTIONS: Array<{ h: string; body: string[] }> = [
  {
    h: 'Saved',
    body: [
      'Nothing from the calculator — Upshot has no accounts, and doesn’t keep your work between visits. The one thing it stores is your email address, if you choose to give it. See Email below.',
    ],
  },
  {
    h: 'Not saved',
    body: ['Your initiatives and results. They stay in your browser tab and clear when you close it.'],
  },
  {
    h: 'Where',
    body: [
      'Supabase, in Canada (Central). That’s where an email address goes if you give one. Nothing from the calculator is stored there today.',
    ],
  },
  {
    h: 'How long',
    body: ['Your email address stays until you ask to be removed. Nothing from the calculator is kept at all.'],
  },
  {
    h: 'Delete now',
    body: ['Email me and I’ll remove your address: hello@detroitdesignfoundry.com. Clearing your browser clears everything else Upshot holds.'],
  },
  {
    h: 'Email',
    body: [
      'Optional, and it gates nothing. Stored on its own, with no name and nothing linking it to what you did in the calculator. Used only for occasional notes about Upshot, each with an unsubscribe link. Ask to be removed at any time: hello@detroitdesignfoundry.com.',
    ],
  },
  {
    h: 'Theme',
    body: [
      'A small cookie remembers your light-or-dark choice across upshotpm.app and app.upshotpm.app. It stores that one word and nothing else.',
    ],
  },
  {
    h: 'Analytics and contact',
    body: ['Analytics: none. Upshot doesn’t measure your visit, so there is no cookie banner.', 'Contact: hello@detroitdesignfoundry.com.'],
  },
];

export function Privacy() {
  return (
    <>
      <section className="hero hero--page">
        <p className="kicker">Last updated December 1, 2026</p>
        <h1 className="display">Privacy</h1>
        <p className="kicker">Draft, to be reviewed</p>
      </section>
      {SECTIONS.map((s) => (
        <section className="section legal-section" key={s.h} aria-label={s.h}>
          <h2 className="heading">{s.h}</h2>
          {s.body.map((line) => (
            <p className="body-line" key={line}>
              {withContactLink(line)}
            </p>
          ))}
        </section>
      ))}
    </>
  );
}
