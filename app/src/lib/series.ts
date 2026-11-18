/**
 * Each initiative keeps one colour for as long as it exists, on every screen,
 * whatever order it's listed or picked in (dataviz: colour follows the entity,
 * never its rank). Four colours (series-1 to 4); a fifth initiative onwards is
 * "Other". Colour only ever means "which initiative" — never good or bad.
 */
import type { PortfolioDocument } from '@engine';

export const SERIES_COUNT = 4;
/** Index used for initiatives past the fourth. */
export const OTHER = SERIES_COUNT;

export type ColorMap = Record<string, number>;

/** Keep existing colours, give new initiatives the lowest free one, drop colours of deleted ones. */
export function assignColors(doc: PortfolioDocument, colors: ColorMap): ColorMap {
  const present = new Set(doc.initiatives.map((i) => i.id));
  const next: ColorMap = {};
  for (const [id, index] of Object.entries(colors)) {
    if (present.has(id) && Number.isInteger(index) && index >= 0 && index <= OTHER) next[id] = index;
  }
  for (const i of doc.initiatives) {
    if (next[i.id] !== undefined && next[i.id] !== OTHER) continue;
    const used = new Set(Object.values(next));
    let free = OTHER;
    for (let n = 0; n < SERIES_COUNT; n++) {
      if (!used.has(n)) {
        free = n;
        break;
      }
    }
    // An "Other" initiative moves up into a colour once one frees up.
    if (next[i.id] === OTHER && free === OTHER) continue;
    next[i.id] = free;
  }
  return next;
}

export const seriesVar = (index: number | undefined): string =>
  index === undefined || index >= SERIES_COUNT ? 'var(--series-other)' : `var(--series-${index + 1})`;
