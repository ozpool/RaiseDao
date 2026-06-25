'use client';

interface StageNodeProps {
  label: string;
  isActive: boolean;
  /** True for the last node — suppresses the connector line below it. */
  isLast: boolean;
}

/** A single node in the vertical pipeline. The outer flex row is `items-stretch`
 *  by default, which lets the dot column grow to match the label's height
 *  (including its `pb-8` spacing). The connector line then `flex-grow`s to fill
 *  whatever height the label occupies — no absolute positioning needed. */
export function StageNode({ label, isActive, isLast }: StageNodeProps) {
  return (
    <div className="flex gap-3">
      {/* Dot + vertical connector — flex-col so the line can grow downward */}
      <div className="flex flex-col items-center">
        {/* Dot: lit cyan with glow when active, hairline border when not */}
        <span
          aria-hidden
          className={[
            'mt-0.5 block h-2.5 w-2.5 shrink-0 rounded-full',
            'transition-[background-color,box-shadow] duration-300',
            isActive
              ? 'bg-data shadow-[0_0_10px_3px_var(--color-data)]'
              : 'border border-line bg-void',
          ].join(' ')}
        />
        {/* Connector: grows to fill the label's pb-8 spacing gap */}
        {!isLast && <span aria-hidden className="mt-2 block w-px flex-grow bg-line" />}
      </div>

      {/* Label — pb-8 creates the vertical gap between nodes (connector fills it) */}
      <p
        className={[
          'font-mono text-caption uppercase tracking-widest',
          'transition-colors duration-300',
          isLast ? 'pb-0' : 'pb-8',
          isActive ? 'text-data' : 'text-mist/40',
        ].join(' ')}
      >
        {label}
      </p>
    </div>
  );
}
