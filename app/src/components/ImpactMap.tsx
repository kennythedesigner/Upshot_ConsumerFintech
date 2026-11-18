/**
 * The impact-vs-complexity map (D26). Up is more expected impact over the
 * horizon; right is harder to deliver. Complexity sits outside the math, so
 * this is a view of a trade-off, never a ranking: no quadrant names, no
 * "quick wins", nothing coloured good or bad.
 *
 * Encoding (dataviz skill): one dot per initiative in its own colour, with a
 * 2px surface ring; must-do initiatives are a diamond, so the flag is a shape,
 * never a colour (D34). Zero is always drawn — impact can be negative (D10).
 * Up to four points carry direct labels; past that the legend and tooltips do.
 */
import { niceTicks } from './RangeChart';
import type { ComplexityLevel } from '@engine';
import { useEffect, useState } from 'react';
import { useCountedValue } from '../lib/motion';
import { useWidth } from '../lib/useWidth';

export interface MapDatum {
  id: string;
  name: string;
  color: string;
  impact: number;
  complexity: ComplexityLevel;
  mustDo: boolean;
}

const LEVELS: ComplexityLevel[] = ['low', 'medium', 'high'];
const LEVEL_WORD: Record<ComplexityLevel, string> = { low: 'Low', medium: 'Medium', high: 'High' };

const HEIGHT = 320;
const TOP = 16;
const BOTTOM = 52;
const LEFT = 92;
const RIGHT = 16;
const DOT_R = 7;
const LABEL_LIMIT = 4;

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function Mark({ d, cx, y }: { d: MapDatum; cx: number; y: (v: number) => number }) {
  const cy = y(useCountedValue(d.impact));
  if (d.mustDo) {
    const r = DOT_R + 1.5;
    return (
      <path
        d={`M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z`}
        fill={d.color}
        className="map-mark"
        aria-hidden="true"
      />
    );
  }
  return <circle cx={cx} cy={cy} r={DOT_R} fill={d.color} className="map-mark" aria-hidden="true" />;
}

interface ImpactMapProps {
  data: MapDatum[];
  horizon: number;
  format: (n: number) => string;
}

export function ImpactMap({ data, horizon, format }: ImpactMapProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const narrow = width < 520;
  const left = narrow ? 76 : LEFT;
  const plotW = Math.max(width - left - RIGHT, 1);
  const plotH = HEIGHT - TOP - BOTTOM;

  const lo = Math.min(0, ...data.map((d) => d.impact));
  const hi = Math.max(0, ...data.map((d) => d.impact));
  const ticks = niceTicks(lo, hi, 5);
  // Always close the plot with a gridline above the highest point, so no mark floats off the top.
  const step = (ticks[1] ?? 0) - (ticks[0] ?? 0);
  if (step > 0 && (ticks.at(-1) ?? 0) < hi) ticks.push((ticks.at(-1) ?? 0) + step);
  if (step > 0 && (ticks[0] ?? 0) > lo) ticks.unshift((ticks[0] ?? 0) - step);
  const dMin = Math.min(lo, ticks[0] ?? lo);
  const dMax = Math.max(hi, ticks.at(-1) ?? hi);
  const y = (v: number) => TOP + plotH - ((v - dMin) / (dMax - dMin || 1)) * plotH;

  const bandW = plotW / LEVELS.length;
  const bandX = (level: ComplexityLevel) => left + LEVELS.indexOf(level) * bandW;

  // Spread initiatives that share a complexity level across their band, in list order.
  const xOf = new Map<string, number>();
  for (const level of LEVELS) {
    const inBand = data.filter((d) => d.complexity === level);
    const step = Math.min(34, (bandW * 0.7) / Math.max(inBand.length, 1));
    inBand.forEach((d, k) => xOf.set(d.id, bandX(level) + bandW / 2 + (k - (inBand.length - 1) / 2) * step));
  }

  const labelled = data.length <= LABEL_LIMIT;
  const tip = data.find((d) => d.id === active);
  const labelChars = narrow ? 14 : 26;

  return (
    <figure className="impact-map" aria-labelledby="map-title">
      <figcaption className="range-chart-head">
        <h2 className="section-heading" id="map-title">
          Impact and delivery complexity
        </h2>
        <span className="section-sub">
          Up is more {horizon}-month expected impact; right is harder to deliver. A view of the trade-off, not a
          ranking.
        </span>
      </figcaption>

      <div className="range-chart-plot" ref={ref}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} className="range-svg" role="presentation">
            {/* Complexity bands: hairline dividers, labels underneath. */}
            {LEVELS.map((level, n) => (
              <g key={level}>
                {n > 0 && (
                  <line x1={bandX(level)} x2={bandX(level)} y1={TOP} y2={TOP + plotH} className="range-grid" />
                )}
                <text x={bandX(level) + bandW / 2} y={TOP + plotH + 20} textAnchor="middle" className="map-band">
                  {LEVEL_WORD[level]}
                </text>
              </g>
            ))}
            <text x={left + plotW / 2} y={HEIGHT - 6} textAnchor="middle" className="range-tick">
              Delivery complexity (outside the math)
            </text>

            {ticks.map((t) => (
              <g key={t}>
                <line x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} className={t === 0 ? 'range-zero' : 'range-grid'} />
                <text x={left - 8} y={y(t) + 4} textAnchor="end" className="range-tick">
                  {format(t)}
                </text>
              </g>
            ))}

            {data.map((d) => {
              const cx = xOf.get(d.id) ?? left;
              const cy = y(d.impact);
              const onRight = cx + 14 + labelChars * 6.6 < left + plotW;
              return (
                <g key={d.id} className={`map-point${active === d.id ? ' is-active' : ''}`}>
                  <Mark d={d} cx={cx} y={y} />
                  {labelled && (
                    <text
                      x={onRight ? cx + 13 : cx - 13}
                      y={cy + 4}
                      textAnchor={onRight ? 'start' : 'end'}
                      className="map-label"
                    >
                      {truncate(d.name, labelChars)}
                    </text>
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={16}
                    className="range-hit"
                    tabIndex={0}
                    role="img"
                    aria-label={`${d.name}: ${format(d.impact)} expected over ${horizon} months, ${LEVEL_WORD[d.complexity]} delivery complexity${d.mustDo ? ', must-do' : ''}`}
                    onPointerEnter={() => setActive(d.id)}
                    onPointerLeave={() => setActive((a) => (a === d.id ? null : a))}
                    onFocus={() => setActive(d.id)}
                    onBlur={() => setActive((a) => (a === d.id ? null : a))}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {tip && (
          <div
            className="range-tip"
            role="presentation"
            style={{
              left: Math.min(Math.max(xOf.get(tip.id) ?? 0, 100), Math.max(width - 100, 100)),
              top: y(tip.impact) + 18,
            }}
          >
            <p className="range-tip-name">
              <span className="line-key" style={{ background: tip.color }} aria-hidden="true" />
              {tip.name}
            </p>
            <dl className="range-tip-values">
              <div className="is-base">
                <dt>Expected impact</dt>
                <dd>{format(tip.impact)}</dd>
              </div>
              <div>
                <dt>Delivery complexity</dt>
                <dd>{LEVEL_WORD[tip.complexity]}</dd>
              </div>
              {tip.mustDo && (
                <div>
                  <dt>Must-do</dt>
                  <dd>Yes</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </figure>
  );
}
