'use client';

import { useState } from 'react';
import { AuthGate } from '@/components/auth/AuthGate';
import { FounderDashboard } from './FounderDashboard';
import { InvestorDashboard } from './InvestorDashboard';

type Tab = 'founder' | 'investor';

const TABS: { id: Tab; label: string }[] = [
  { id: 'founder', label: 'Founder' },
  { id: 'investor', label: 'Investor' },
];

/** Tab shell wrapping both dashboard perspectives behind a SIWE session. The two
 *  hooks fetch independently — switching tabs is instant after first load because
 *  TanStack Query holds both results in cache. */
export function DashboardView() {
  const [tab, setTab] = useState<Tab>('founder');

  return (
    <AuthGate>
      <div className="mx-auto max-w-4xl space-y-8 px-6 py-16">
        <div>
          <h1 className="font-display text-h1 font-semibold tracking-tight text-paper">
            Dashboard
          </h1>
          <p className="mt-2 font-sans text-small text-mist">Your activity on-chain and off.</p>
        </div>

        {/* Pill tab switcher — matches the segmented control pattern from the lab. */}
        <div className="flex gap-1 rounded-xl border border-line bg-panel/40 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg py-2 font-mono text-caption uppercase tracking-widest transition-colors duration-base ${
                tab === t.id ? 'bg-void text-paper' : 'text-mist hover:text-paper'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'founder' ? <FounderDashboard /> : <InvestorDashboard />}
      </div>
    </AuthGate>
  );
}
