'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type DraftRecord } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { INITIAL_DATA, toDraftPayload, validateStep, type WizardData } from './wizard-types';
import { VaultWireframe } from './VaultWireframe';
import { BasicsStep } from './steps/BasicsStep';
import { EconomicsStep } from './steps/EconomicsStep';
import { MilestonesStep } from './steps/MilestonesStep';
import { ReviewStep } from './steps/ReviewStep';

const STEPS = ['Basics', 'Economics', 'Milestones', 'Review'];
const PRIMARY =
  'rounded-full bg-data px-5 py-2 font-mono text-caption uppercase tracking-widest text-void transition-opacity hover:opacity-90 disabled:opacity-40';
const GHOST =
  'rounded-full border border-line px-5 py-2 font-mono text-caption uppercase tracking-widest text-mist transition-colors hover:text-paper disabled:opacity-40';

export function CreateWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<DraftRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);

  const update = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));
  const allValid = [0, 1, 2].every((s) => validateStep(s, data));

  const save = async () => {
    if (!token || !allValid) return;
    setSaving(true);
    setError(null);
    try {
      setSaved(await api.drafts.create(toDraftPayload(data), token));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the draft. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-panel/40 px-8 py-12 text-center">
        <p className="font-mono text-caption uppercase tracking-widest text-data">Draft saved</p>
        <p className="mt-3 font-sans text-h2 font-semibold text-paper">{saved.title}</p>
        <p className="mt-3 font-sans text-small text-mist">
          Your campaign is saved as a draft. The on-chain deploy lands next (#24); for now you can
          keep editing the schedule.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/account" className={GHOST}>
            Account
          </Link>
          <button
            type="button"
            className={PRIMARY}
            onClick={() => {
              setSaved(null);
              setData(INITIAL_DATA);
              setStep(0);
            }}
          >
            New draft
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
      <div>
        <ol className="mb-8 flex flex-wrap gap-x-6 gap-y-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span className={`font-mono text-caption ${i === step ? 'text-data' : 'text-mist'}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`font-mono text-caption uppercase tracking-widest transition-colors ${
                  i === step ? 'text-paper' : 'text-mist hover:text-paper'
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ol>

        {step === 0 && <BasicsStep data={data} update={update} />}
        {step === 1 && <EconomicsStep data={data} update={update} />}
        {step === 2 && <MilestonesStep data={data} update={update} />}
        {step === 3 && <ReviewStep data={data} />}

        {error && <p className="mt-5 font-sans text-caption text-signal">{error}</p>}

        <div className="mt-9 flex items-center justify-between">
          <button
            type="button"
            className={GHOST}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              className={PRIMARY}
              onClick={() => setStep((s) => s + 1)}
              disabled={!validateStep(step, data)}
            >
              Next
            </button>
          ) : (
            <button type="button" className={PRIMARY} onClick={save} disabled={!allValid || saving}>
              {saving ? 'Saving…' : 'Save draft'}
            </button>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="mx-auto h-64 w-48 lg:w-full">
          <VaultWireframe milestones={data.milestones} />
        </div>
        <p className="mt-3 text-center font-mono text-caption uppercase tracking-widest text-mist">
          One facet per milestone
        </p>
      </aside>
    </div>
  );
}
