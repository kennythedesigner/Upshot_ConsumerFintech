/**
 * The one piece of motion in Upshot: when the horizon slider moves, figures
 * count toward their new values instead of snapping. Typing snaps. A new
 * target mid-count starts from wherever the figure is now, so a fast scrub
 * never queues up stale animations. Reduced-motion users always get a snap.
 */
import { createContext, useContext, useEffect, useRef, useState } from 'react';

/** True while the last change came from the horizon slider. */
export const HorizonMotion = createContext(false);

const DURATION_MS = 320;
const easeOut = (t: number): number => 1 - (1 - t) ** 3;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function useCountedValue(target: number): number {
  const animate = useContext(HorizonMotion);
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const from = shownRef.current;
    if (!animate || prefersReducedMotion() || from === target) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      const v = from + (target - from) * easeOut(t);
      shownRef.current = v;
      setShown(v);
      frame.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, animate]);

  return shown;
}

/** A figure that counts on horizon changes. The final text is always the exact target. */
export function Figure({ value, format }: { value: number; format: (n: number) => string }) {
  const shown = useCountedValue(value);
  return <>{format(shown)}</>;
}
