/**
 * Form controls. Every control is a real <input>, <select> or <button> with a
 * label, so the form works by keyboard and screen reader. Errors are worded,
 * never coloured: an invalid field gets a heavier border and a sentence.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { formatForInput, parseNumberInput, type NumberKind } from '../lib/numbers';
import { Chevron } from './Icons';

const describedBy = (...ids: Array<string | false | null | undefined>): string | undefined => {
  const list = ids.filter(Boolean).join(' ');
  return list || undefined;
};

// ── Number field ────────────────────────────────────────────────────────────

interface NumberFieldProps {
  id: string;
  /** Visible label. Omit and pass labelledBy for a label drawn elsewhere. */
  label?: string;
  labelledBy?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  kind: NumberKind;
  /** Return a sentence when a parsed value is out of range. */
  validate?: (value: number) => string | null;
  /** Negative money needs a full keyboard on phones; decimal pads have no minus. */
  allowNegative?: boolean;
  suffix?: string;
  placeholder?: string;
  helper?: ReactNode;
}

export function NumberField({
  id,
  label,
  labelledBy,
  value,
  onChange,
  kind,
  validate,
  allowNegative = false,
  suffix,
  placeholder,
  helper,
}: NumberFieldProps) {
  const [text, setText] = useState(() => (value === null ? '' : formatForInput(value, kind)));
  const focused = useRef(false);

  // Values set from outside (the worked example, Clear, Undo) replace the text,
  // but never while someone is typing in this field.
  useEffect(() => {
    if (!focused.current) setText(value === null ? '' : formatForInput(value, kind));
  }, [value, kind]);

  const parsed = parseNumberInput(text);
  const error = !parsed.ok
    ? 'Enter a number.'
    : parsed.value !== null && validate
      ? validate(parsed.value)
      : null;

  const helperId = helper ? `${id}-helper` : null;
  const errorId = error ? `${id}-error` : null;

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className={`control-wrap${suffix ? ' has-suffix' : ''}`}>
        <input
          id={id}
          className="control"
          type="text"
          inputMode={allowNegative ? undefined : kind === 'count' || kind === 'months' ? 'numeric' : 'decimal'}
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          aria-labelledby={labelledBy}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(errorId, helperId)}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            const p = parseNumberInput(text);
            if (p.ok && p.value !== null && !(validate && validate(p.value))) {
              setText(formatForInput(p.value, kind));
            }
          }}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            const p = parseNumberInput(raw);
            if (!p.ok || (p.value !== null && validate && validate(p.value))) {
              onChange(null);
              return;
            }
            onChange(p.value);
          }}
        />
        {suffix && (
          <span className="control-suffix" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="field-error" id={errorId ?? undefined}>
          {error}
        </p>
      )}
      {helper && (
        <p className="field-helper" id={helperId ?? undefined}>
          {helper}
        </p>
      )}
    </div>
  );
}

// ── Text field ──────────────────────────────────────────────────────────────

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  helper?: ReactNode;
}

export function TextField({ id, label, value, onChange, placeholder, maxLength, helper }: TextFieldProps) {
  const helperId = helper ? `${id}-helper` : undefined;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="control"
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-describedby={helperId}
        onChange={(e) => onChange(e.target.value)}
      />
      {helper && (
        <p className="field-helper" id={helperId}>
          {helper}
        </p>
      )}
    </div>
  );
}

// ── Select ──────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options?: SelectOption[];
  groups?: Array<{ label: string; options: SelectOption[] }>;
  disabled?: boolean;
  helper?: ReactNode;
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  placeholder,
  options,
  groups,
  disabled,
  helper,
}: SelectFieldProps) {
  const helperId = helper ? `${id}-helper` : undefined;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="select-wrap">
        <select
          id={id}
          className="control"
          value={value}
          disabled={disabled}
          aria-describedby={helperId}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          {groups?.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="select-chevron">
          <Chevron />
        </span>
      </div>
      {helper && (
        <p className="field-helper" id={helperId}>
          {helper}
        </p>
      )}
    </div>
  );
}

// ── Segmented control (native radios, so arrow keys work) ───────────────────

interface SegmentedProps<T extends string> {
  /** Used for each radio's id: `${idBase}-${value}`. */
  idBase: string;
  legend: string;
  value: T | null;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  helper?: ReactNode;
}

export function Segmented<T extends string>({ idBase, legend, value, options, onChange, helper }: SegmentedProps<T>) {
  const name = useId();
  const helperId = helper ? `${idBase}-helper` : undefined;
  return (
    <fieldset className="field segmented-field" aria-describedby={helperId}>
      <legend className="field-label">{legend}</legend>
      <div className="segmented">
        {options.map((o) => (
          <label key={o.value} className="segment" htmlFor={`${idBase}-${o.value}`}>
            <input
              id={`${idBase}-${o.value}`}
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {helper && (
        <p className="field-helper" id={helperId}>
          {helper}
        </p>
      )}
    </fieldset>
  );
}

// ── Switch ──────────────────────────────────────────────────────────────────

interface SwitchProps {
  id: string;
  label: string;
  /** Extra words for screen readers, e.g. which row this switch belongs to. */
  srContext?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({ id, label, srContext, checked, onChange }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      className="switch"
      onClick={() => onChange(!checked)}
    >
      <span className="switch-track" aria-hidden="true">
        <span className="switch-knob" />
      </span>
      <span className="switch-label">
        {label}
        {srContext && <span className="visually-hidden"> {srContext}</span>}
      </span>
    </button>
  );
}

// ── Checkbox group ──────────────────────────────────────────────────────────

interface CheckboxGroupProps<T extends string> {
  idBase: string;
  legend: string;
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onChange: (selected: T[]) => void;
  helper?: ReactNode;
  footer?: ReactNode;
}

export function CheckboxGroup<T extends string>({
  idBase,
  legend,
  options,
  selected,
  onChange,
  helper,
  footer,
}: CheckboxGroupProps<T>) {
  const helperId = helper ? `${idBase}-helper` : undefined;
  return (
    <fieldset className="field checkbox-field" aria-describedby={helperId}>
      <legend className="field-label">{legend}</legend>
      {helper && (
        <p className="field-helper field-helper--lead" id={helperId}>
          {helper}
        </p>
      )}
      <div className="checkbox-list">
        {options.map((o, index) => {
          const checked = selected.includes(o.value);
          return (
            <label key={o.value} className="checkbox" htmlFor={`${idBase}-${index}`}>
              <input
                id={`${idBase}-${index}`}
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked
                      ? selected.filter((v) => v !== o.value)
                      : // Keep the list's own order, whatever order things were ticked in.
                        options.map((x) => x.value).filter((v) => v === o.value || selected.includes(v)),
                  )
                }
              />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
      {footer && <p className="field-helper">{footer}</p>}
    </fieldset>
  );
}
