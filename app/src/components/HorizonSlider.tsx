/**
 * The shared time horizon (D20, D23): six stops, 3 to 24 months, evenly
 * spaced even though the months aren't. A native range input underneath,
 * so arrow keys, Home and End all work.
 */
import { HORIZON_STOPS, isShortWindow, STATE_COPY, type HorizonMonths } from '@engine';

interface HorizonSliderProps {
  value: HorizonMonths;
  onChange: (value: HorizonMonths) => void;
}

export function HorizonSlider({ value, onChange }: HorizonSliderProps) {
  const index = HORIZON_STOPS.indexOf(value);
  const shortWindow = isShortWindow(value);
  return (
    <div className="horizon">
      <div className="horizon-head">
        <label className="field-label" htmlFor="horizon">
          Time horizon
        </label>
        <span className="horizon-value" aria-hidden="true">
          {value} months
        </span>
      </div>
      <div className="horizon-track-wrap">
        <div className="horizon-ticks" aria-hidden="true">
          {HORIZON_STOPS.map((stop) => (
            <span key={stop} className={`horizon-tick${stop === value ? ' is-current' : ''}`}>
              <span className="horizon-dot" />
              <span className="horizon-tick-label">{stop}</span>
            </span>
          ))}
        </div>
        <input
          id="horizon"
          className="horizon-input"
          type="range"
          min={0}
          max={HORIZON_STOPS.length - 1}
          step={1}
          value={index}
          aria-valuetext={`${value} months`}
          aria-describedby="horizon-helper"
          onChange={(e) => {
            const next = HORIZON_STOPS[Number(e.target.value)];
            if (next !== undefined) onChange(next);
          }}
        />
      </div>
      <p className="field-helper" id="horizon-helper">
        All figures below use this window.
        {shortWindow && <> {STATE_COPY.shortWindow}</>}
      </p>
    </div>
  );
}
