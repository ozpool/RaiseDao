import type { VaultState } from '@/components/vault';

interface ReadoutsProps {
  fill: number;
  state: VaultState;
  fps: number;
  mock: boolean;
}

function Cell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-sans text-caption uppercase tracking-wide text-mist">{label}</span>
      <span className={`font-mono text-data-lg tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

/** Mono readouts below the stage. Mocked values render in `mist` with a leading
 *  `~`, so a placeholder figure is never mistaken for a live one (UI.md §9). FPS
 *  drops to `mist` under 50 — the honest perf signal during the throttle test.
 *  Only fill/state sit in the live region; FPS changes twice a second and would
 *  otherwise drown the data announcements. */
export function Readouts({ fill, state, fps, mock }: ReadoutsProps) {
  const valueColor = mock ? 'text-mist' : 'text-paper';
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:flex sm:gap-8">
      <div className="contents" aria-live="polite" aria-atomic="false">
        <Cell
          label="Fill"
          value={`${mock ? '~' : ''}${Math.round(fill * 100)}%`}
          color={valueColor}
        />
        <Cell label="State" value={state} color={valueColor} />
      </div>
      <Cell label="FPS" value={String(fps)} color={fps < 50 ? 'text-mist' : 'text-paper'} />
    </div>
  );
}
