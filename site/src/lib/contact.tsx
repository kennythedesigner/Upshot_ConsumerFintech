import type { ReactNode } from 'react';

/**
 * The one contact address for the site (copy deck B1).
 *
 * It carries real weight on the Privacy page: until the in-app "Delete my
 * saved data" control is built, emailing this address is the only way someone
 * can ask to come off the signup list. So it is a link everywhere it appears,
 * not just text to retype.
 */
export const CONTACT_EMAIL = 'hello@detroitdesignfoundry.com';

/**
 * Renders a line of copy, turning the contact address into a mailto link.
 * Privacy and Terms hold their copy as plain strings, so this keeps the data
 * flat and does the linking at render time.
 */
export function withContactLink(line: string): ReactNode {
  const parts = line.split(CONTACT_EMAIL);
  if (parts.length === 1) return line;

  return parts.map((part, i) => (
    <span key={i}>
      {i > 0 && (
        <a className="text-link" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      )}
      {part}
    </span>
  ));
}
