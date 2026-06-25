'use client';

import { milestoneTotal, type WizardData, type WizardMilestone } from '../wizard-types';

interface StepProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

export function MilestonesStep({ data, update }: StepProps) {
  const { milestones } = data;
  const total = milestoneTotal(milestones);

  const setOne = (i: number, patch: Partial<WizardMilestone>) =>
    update({ milestones: milestones.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });
  const add = () => update({ milestones: [...milestones, { title: '', pct: 0 }] });
  const remove = (i: number) => update({ milestones: milestones.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <p className="font-sans text-small text-mist">
        Each milestone releases a share of the raise when investors vote it through. Shares must
        total 100%.
      </p>

      <ol className="space-y-3">
        {milestones.map((m, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="w-6 shrink-0 font-mono text-caption text-mist">
              {String(i + 1).padStart(2, '0')}
            </span>
            <input
              value={m.title}
              onChange={(e) => setOne(i, { title: e.target.value })}
              placeholder="Deliverable"
              className="min-w-0 flex-1 rounded-lg border border-line bg-panel/40 px-3 py-2 font-sans text-small text-paper outline-none transition-colors placeholder:text-mist/50 focus:border-data"
            />
            <span className="relative w-24 shrink-0">
              <input
                value={Number.isFinite(m.pct) ? String(m.pct) : ''}
                onChange={(e) =>
                  setOne(i, { pct: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })
                }
                inputMode="numeric"
                className="w-full rounded-lg border border-line bg-panel/40 px-3 py-2 pr-7 font-mono text-small text-paper outline-none transition-colors focus:border-data"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-caption text-mist">
                %
              </span>
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={milestones.length <= 1}
              title="Remove milestone"
              className="shrink-0 font-mono text-caption uppercase text-mist transition-colors hover:text-paper disabled:opacity-30"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={add}
          className="font-mono text-caption uppercase tracking-widest text-data transition-opacity hover:opacity-80"
        >
          + Add milestone
        </button>
        <span
          className={`font-mono text-caption uppercase tracking-widest ${
            total === 100 ? 'text-data' : 'text-mist'
          }`}
        >
          {total}% / 100%
        </span>
      </div>
    </div>
  );
}
