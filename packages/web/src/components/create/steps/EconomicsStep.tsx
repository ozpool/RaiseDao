'use client';

import { Field } from '../Field';
import type { WizardData } from '../wizard-types';

interface StepProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

export function EconomicsStep({ data, update }: StepProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Raise target"
          value={data.raiseTarget}
          onChange={(v) => update({ raiseTarget: v })}
          placeholder="50000"
          inputMode="decimal"
          suffix="USDC"
        />
        <Field
          label="Funding window"
          value={data.fundingDurationDays}
          onChange={(v) => update({ fundingDurationDays: v })}
          placeholder="30"
          inputMode="numeric"
          suffix="days"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Token name"
          value={data.tokenName}
          onChange={(v) => update({ tokenName: v })}
          placeholder="Solar"
        />
        <Field
          label="Token symbol"
          value={data.tokenSymbol}
          onChange={(v) => update({ tokenSymbol: v })}
          placeholder="SOL"
        />
      </div>
      <Field
        label="Token supply"
        value={data.tokenSupply}
        onChange={(v) => update({ tokenSupply: v })}
        placeholder="1000000"
        inputMode="decimal"
        hint="Governance tokens minted to investors in proportion to their contribution."
      />
    </div>
  );
}
