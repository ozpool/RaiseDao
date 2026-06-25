'use client';

import { milestoneTotal, validateStep, type WizardData } from '../wizard-types';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line py-2.5">
      <dt className="font-mono text-caption uppercase tracking-widest text-mist">{label}</dt>
      <dd className="text-right font-sans text-small text-paper">{value || '—'}</dd>
    </div>
  );
}

export function ReviewStep({ data }: { data: WizardData }) {
  const ready = [0, 1, 2].every((s) => validateStep(s, data));
  return (
    <div className="space-y-6">
      <dl>
        <Row label="Title" value={data.title} />
        <Row label="Raise target" value={data.raiseTarget ? `${data.raiseTarget} USDC` : ''} />
        <Row
          label="Funding window"
          value={data.fundingDurationDays ? `${data.fundingDurationDays} days` : ''}
        />
        <Row
          label="Token"
          value={data.tokenName ? `${data.tokenName} (${data.tokenSymbol})` : ''}
        />
        <Row label="Supply" value={data.tokenSupply} />
      </dl>

      <div>
        <p className="mb-2 font-mono text-caption uppercase tracking-widest text-mist">
          Milestones · {milestoneTotal(data.milestones)}%
        </p>
        <ol className="space-y-1.5">
          {data.milestones.map((m, i) => (
            <li key={i} className="flex justify-between gap-4 font-sans text-small text-paper">
              <span>
                <span className="mr-2 font-mono text-caption text-mist">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {m.title || <span className="text-mist">Untitled</span>}
              </span>
              <span className="font-mono text-mist">{m.pct}%</span>
            </li>
          ))}
        </ol>
      </div>

      {!ready && (
        <p className="font-sans text-caption text-mist">
          <span className="text-signal">Incomplete —</span> go back and complete each step before
          saving.
        </p>
      )}
    </div>
  );
}
