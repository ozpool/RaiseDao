interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

/** The fill-level caliper. Value is mono (it's data); the visual styling lives in
 *  `.vault-slider` (globals.css). Native range = free keyboard support. */
export function Slider({ label, value, onChange }: SliderProps) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="font-sans text-caption uppercase tracking-wide text-mist">{label}</p>
        <p className="font-mono text-data tabular-nums text-paper">{value.toFixed(2)}</p>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number.parseFloat(event.target.value))}
        className="vault-slider"
        aria-label={label}
        aria-valuetext={`${Math.round(value * 100)}%`}
      />
      <p className="mt-1 text-right font-mono text-caption tabular-nums text-mist">
        {Math.round(value * 100)}%
      </p>
    </div>
  );
}
