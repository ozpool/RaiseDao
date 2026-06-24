interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A square segmented control sharing the rail's hairline grid. The active
 *  segment gets a `panel` surface and a 2px paper top bar — not signal; the lone
 *  signal accent on this page is the seam-pulse action (design direction). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div>
      <p className="mb-2 font-sans text-caption uppercase tracking-wide text-mist">{label}</p>
      <div
        className="grid border border-line"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option, index) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`relative py-3 font-sans text-small transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal ${
                index > 0 ? 'border-l border-line' : ''
              } ${active ? 'bg-panel text-paper' : 'text-mist hover:text-paper'}`}
            >
              {active && <span className="absolute inset-x-0 top-0 h-0.5 bg-paper" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
