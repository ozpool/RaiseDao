'use client';

import { Field } from '../Field';
import type { WizardData } from '../wizard-types';

interface StepProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

export function BasicsStep({ data, update }: StepProps) {
  return (
    <div className="space-y-5">
      <Field
        label="Campaign title"
        value={data.title}
        onChange={(v) => update({ title: v })}
        placeholder="Solar microgrid for rural clinics"
      />
      <Field
        label="Summary"
        textarea
        value={data.summary}
        onChange={(v) => update({ summary: v })}
        placeholder="One or two sentences on what you're raising for and why it matters."
      />
    </div>
  );
}
