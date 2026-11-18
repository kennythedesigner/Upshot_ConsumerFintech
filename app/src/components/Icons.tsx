/** Stroke icons, drawn in the current text colour. Decorative: hidden from screen readers. */

export function Chevron({ direction = 'down' }: { direction?: 'down' | 'up' | 'right' }) {
  const rotate = direction === 'up' ? 180 : direction === 'right' ? -90 : 0;
  return (
    <svg
      className="icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
