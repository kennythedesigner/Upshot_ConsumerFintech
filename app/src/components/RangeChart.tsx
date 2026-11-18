/**
 * Low, base and high for several initiatives on one shared axis.
 *
 * Encoding (dataviz skill): a thin floating bar spans low to high in the
 * initiative's colour at reduced strength; a solid dot with a 2px surface ring
 * marks the base case. Zero is drawn whenever it's in view, because a range
 * that crosses it is the point (D10). Text stays in text colours; colour only
 * says which initiative. Hover or focus a row for its three values; the table
 * below carries every value without hovering.
 */
import type { Range } from '@engine';
import { useEffect, useState } from 'react';
import { useCountedValue } from '../lib/motion';
import { useWidth } from '../lib/useWidth';

export interface RangeSeries {
  key: string;
  letter: string;
  name: string;
  color: string;
  range: Range | null;
  /** Shown in place of the bar when there's no range yet. */
  note?: string;
}

interface RangeChartProps {
  id: string;
  title: string;
  sub: string;
  series: RangeSeries[];
  format: (n: number) => string;
}

const ROW = 52;
const AXIS = 30;
const PAD_X = 10;
const BAND = 10;
const DOT_R = 6;

/** Round steps (1, 2, 2.5, 5 × 10ⁿ) so tick labels read as clean numbers. */
export function niceTicks(min: number, max: number, count: number): number[] {
  if (min === max) {
    const pad = Math.abs(min) || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / Math.max(count - 1, 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : v);
  return ticks;
}

/** A row's band and dot count toward new values with the horizon, like every other figure. */
function Band({ s, x, y }: { s: RangeSeries; x: (v: number) => number; y: number }) {
  const r = s.range!;
  const low = useCountedValue(r.low);
  const base = useCountedValue(r.expected);
  const high = useCountedValue(r.high);
  const x0 = x(low);
  const x1 = Math.max(x(high), x0 + 1);
  return (
    <g aria-hidden="true">
      <rect x={x0} y={y - BAND / 2} width={x1 - x0} height={BAND} rx={4} fill={s.color} className="range-band" />
      <circle cx={x(base)} cy={y} r={DOT_R} fill={s.color} className="range-dot" />
    </g>
  );
}

export function RangeChart({ id, title, sub, series, format }: RangeChartProps) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<string | null>(null);

  const ranged = series.filter((s) => s.range);
  const lo = Math.min(0, ...ranged.map((s) => s.range!.low));
  const hi = Math.max(0, ...ranged.map((s) => s.range!.high));
  const tickCount = Math.max(3, Math.min(6, Math.floor(width / 120)));
  const ticks = niceTicks(lo, hi, tickCount);
  const dMin = Math.min(lo, ticks[0] ?? lo);
  const dMax = Math.max(hi, ticks.at(-1) ?? hi);
  const plotW = Math.max(width - PAD_X * 2, 1);
  const x = (v: number) => PAD_X + ((v - dMin) / (dMax - dMin || 1)) * plotW;
  const height = series.length * ROW + AXIS;
  const plotBottom = series.length * ROW;

  // Close the tooltip on Escape.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const tipSeries = series.find((s) => s.key === active && s.range);
  const tipIndex = series.findIndex((s) => s.key === active);

  return (
    <figure className="range-chart" aria-labelledby={`${id}-title`}>
      <figcaption className="range-chart-head">
        <span className="section-title" id={`${id}-title`}>
          {title}
        </span>
        <span className="section-sub">{sub}</span>
      </figcaption>

      <div className="range-chart-plot" ref={wrapRef}>
        {width > 0 && (
          <svg width={width} height={height} className="range-svg" role="presentation">
            {/* Gridlines, then zero on top of them: solid hairlines, recessive.
                Drawn per row below its label line, so no line runs through text. */}
            {series.map((_, n) =>
              ticks.map((t) => (
                <line
                  key={`${n}-${t}`}
                  x1={x(t)}
                  x2={x(t)}
                  y1={n * ROW + 22}
                  y2={(n + 1) * ROW}
                  className={t === 0 ? 'range-zero' : 'range-grid'}
                />
              )),
            )}
            {ticks.map((t, n) => (
              <text
                key={`l${t}`}
                x={x(t)}
                y={plotBottom + 18}
                textAnchor={n === 0 && x(t) < 40 ? 'start' : n === ticks.length - 1 && x(t) > width - 40 ? 'end' : 'middle'}
                className="range-tick"
              >
                {format(t)}
              </text>
            ))}

            {series.map((s, n) => {
              const top = n * ROW;
              const mid = top + 34;
              return (
                <g key={s.key} className={`range-row${active === s.key ? ' is-active' : ''}`}>
                  <text x={PAD_X} y={top + 15} className="range-letter">
                    {s.letter}
                  </text>
                  {s.range ? (
                    <>
                      <text x={width - PAD_X} y={top + 15} textAnchor="end" className="range-base">
                        <tspan className="range-base-label">Base </tspan>
                        {format(s.range.expected)}
                      </text>
                      <Band s={s} x={x} y={mid} />
                    </>
                  ) : (
                    <text x={PAD_X} y={mid + 4} className="range-note">
                      {s.note ?? 'No figures yet'}
                    </text>
                  )}
                  {/* The whole row is the hit target, bigger than the mark. */}
                  {s.range && (
                    <rect
                      x={0}
                      y={top}
                      width={width}
                      height={ROW}
                      className="range-hit"
                      tabIndex={0}
                      role="img"
                      aria-label={`${s.letter}, ${s.name}: low ${format(s.range.low)}, base ${format(s.range.expected)}, high ${format(s.range.high)}`}
                      onPointerEnter={() => setActive(s.key)}
                      onPointerLeave={() => setActive((a) => (a === s.key ? null : a))}
                      onFocus={() => setActive(s.key)}
                      onBlur={() => setActive((a) => (a === s.key ? null : a))}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {tipSeries?.range && (
          <div
            className="range-tip"
            role="presentation"
            style={{
              left: Math.min(Math.max(x(tipSeries.range.expected), 90), Math.max(width - 90, 90)),
              top: tipIndex * ROW + 34 + 14,
            }}
          >
            <p className="range-tip-name">
              <span className="line-key" style={{ background: tipSeries.color }} aria-hidden="true" />
              {tipSeries.letter} · {tipSeries.name}
            </p>
            <dl className="range-tip-values">
              <div>
                <dt>Low</dt>
                <dd>{format(tipSeries.range.low)}</dd>
              </div>
              <div className="is-base">
                <dt>Base</dt>
                <dd>{format(tipSeries.range.expected)}</dd>
              </div>
              <div>
                <dt>High</dt>
                <dd>{format(tipSeries.range.high)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </figure>
  );
}
