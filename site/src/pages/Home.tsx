import { useState, type FormEvent } from 'react';
import { CALCULATOR_URL, CASE_STUDY_URL } from '../components/Chrome';
import { signupConfigured, subscribe } from '../lib/signup';

/**
 * Home, from Kennedi's Figma Make screens. Copy is built exactly as
 * designed, bracketed placeholders included — she is coming back to the
 * open copy list (the "every other tool" claim, the dashboard-ships
 * section, bio, contact email, privacy note).
 */

const STEPS = [
  {
    n: '01',
    title: 'Describe each initiative',
    body: 'Pick the consumer moment it touches, how many people reach that moment each month, and what one outcome is worth.',
  },
  {
    n: '02',
    title: 'Set your confidence',
    body: 'Low, medium or high. Confidence sets how wide the range is, not how big the number is.',
  },
  {
    n: '03',
    title: 'Compare the ranges',
    body: 'Impact and ROI as a low, expected and high figure, with payback, cost of delay and a priority score beside them.',
  },
];

const IS = [
  'A structured way to compare two sets of stated assumptions',
  'Directional — an order of magnitude you can defend in a review',
  'Dollar-denominated, so it sits next to the rest of the roadmap',
  'Used before either initiative is built',
];

const ISNT = [
  'A forecast. The numbers are your assumptions, not a prediction',
  'Revenue attribution. It makes no claim about what a feature earned',
  'A recommendation engine. It never names a winner',
  'A replacement for research. It structures what you already believe',
];

const PATTERNS = [
  'Urgency or countdowns',
  'Pre-selected or opt-out choices',
  'Saying no is harder than saying yes',
  'Cost or terms shown late or in fine print',
  'Guilt or shame wording',
  'Shown at a stressful moment',
];

/**
 * The signup form. Validation is real (the one allowed use of red, D66), and
 * the address goes to Supabase via subscribe_email (D52a, revised).
 *
 * "Already on the list" is indistinguishable from a fresh signup, by design:
 * the database function is silent about it, so this form can't be used to
 * check whether an address is subscribed.
 */
type SignupState = 'idle' | 'invalid' | 'sending' | 'sent' | 'error' | 'unconfigured';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SignupState>('idle');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setState('invalid');
      return;
    }
    if (!signupConfigured) {
      setState('unconfigured');
      return;
    }
    setState('sending');
    const result = await subscribe(trimmed);
    setState(result);
    if (result === 'sent') setEmail('');
  };

  return (
    <form className="signup" onSubmit={submit} noValidate>
      <label className="signup-label" htmlFor="signup-email">
        Email address (optional)
      </label>
      <div className="signup-row">
        <input
          id="signup-email"
          className={state === 'invalid' ? 'control control--invalid' : 'control'}
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          disabled={state === 'sending'}
          aria-invalid={state === 'invalid' || undefined}
          aria-describedby="signup-status signup-note"
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === 'invalid' || state === 'error') setState('idle');
          }}
        />
        <button type="submit" className="button button--primary" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Notify me'}
        </button>
      </div>
      <p className="signup-status" id="signup-status" role="status">
        {state === 'invalid' && (
          <span className="error-text">Enter an email address like name@example.com.</span>
        )}
        {state === 'sent' && 'You’re on the list.'}
        {state === 'error' && 'That didn’t go through. Try again in a moment.'}
        {state === 'unconfigured' && 'Sign-ups aren’t switched on yet.'}
      </p>
      <p className="signup-note" id="signup-note">
        [PRIVACY NOTE — one line]
        <br />
        Optional — does not gate anything on this page.
      </p>
    </form>
  );
}

export function Home() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Upshot — a UX ROI calculator</p>
        <h1 className="display">Should Initiative A or B be prioritized?</h1>
        <p className="lede">
          Compare two initiatives before either is built, in dollars, with honest ranges. Upshot never
          names a winner.
        </p>
        <p>
          <a className="button button--primary" href={CALCULATOR_URL}>
            Open the calculator
          </a>
        </p>
      </section>

      <section className="section" aria-labelledby="how-title">
        <h2 className="heading" id="how-title">
          How it works
        </h2>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n} className="step">
              <span className="step-num" aria-hidden="true">
                {s.n}
              </span>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-body">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" aria-labelledby="shot-title">
        <h2 className="heading" id="shot-title">
          A real comparison
        </h2>
        <p className="section-lede">
          Fee and overdraft transparency, against a premium upgrade prompt. Same horizon, same
          assumptions, side by side.
        </p>
        <figure className="shot">
          <div className="shot-frame">[SCREENSHOT: A vs B comparison]</div>
          <figcaption className="shot-caption">Upshot shows both. It does not tell you which to build.</figcaption>
        </figure>
      </section>

      <section className="section" aria-labelledby="is-title">
        <h2 className="heading" id="is-title">
          What this is, and what it isn’t
        </h2>
        <div className="two-col">
          <div>
            <h3 className="col-title">What it is</h3>
            <ul className="dot-list">
              {IS.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="col-title">What it isn’t</h3>
            <ul className="dot-list">
              {ISNT.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="pressure-title">
        <h2 className="heading" id="pressure-title">
          Clarity or pressure?
        </h2>
        <p className="section-lede">
          Every initiative gets a six-point check for pressure patterns — urgency, pre-selected
          choices, costs shown late, a prompt timed to a stressful moment. The count sits beside the
          dollar estimate, and never changes the math.
        </p>
        <ul className="pattern-list">
          {PATTERNS.map((x) => (
            <li key={x}>
              <span className="pattern-box" aria-hidden="true" />
              {x}
            </li>
          ))}
        </ul>
        <p className="pull">
          Every other tool in this space audits a product after it ships. Upshot asks the question
          while it’s still an estimate.
        </p>
      </section>

      <section className="section" aria-labelledby="builtby-title">
        <h2 className="heading" id="builtby-title">
          Built by
        </h2>
        <p className="section-lede">[BIO PLACEHOLDER — two lines]</p>
        <p>
          <a className="text-link" href={CASE_STUDY_URL}>
            Read the case study →
          </a>
        </p>
      </section>

      <section className="section" aria-labelledby="signup-title">
        <h2 className="heading" id="signup-title">
          Know when the dashboard ships
        </h2>
        <p className="section-lede">
          Portfolio totals, goal subtotals and the impact-vs-complexity map are in progress.
        </p>
        <SignupForm />
      </section>
    </>
  );
}
