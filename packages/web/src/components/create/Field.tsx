'use client';

import type { ReactNode } from 'react';

const BASE =
  'w-full rounded-lg border border-line bg-panel/40 px-3 py-2 font-sans text-small text-paper outline-none transition-colors placeholder:text-mist/50 focus:border-data';

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  textarea?: boolean;
  inputMode?: 'numeric' | 'decimal' | 'text';
  suffix?: string;
}

/** Labelled input matching the editorial dark register — mono caption label,
 *  hairline-bordered field, cyan focus. One component for every wizard field. */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  textarea,
  inputMode,
  suffix,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-caption uppercase tracking-widest text-mist">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${BASE} resize-none`}
        />
      ) : (
        <span className="relative block">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            inputMode={inputMode}
            className={`${BASE} ${suffix ? 'pr-12' : ''}`}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-caption uppercase text-mist">
              {suffix}
            </span>
          )}
        </span>
      )}
      {hint && <span className="mt-1 block font-sans text-caption text-mist">{hint}</span>}
    </label>
  );
}
