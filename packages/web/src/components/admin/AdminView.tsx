'use client';

import { AuthGate } from '@/components/auth/AuthGate';
import { useAdminCampaigns, useIsAdmin } from '@/hooks/useAdmin';
import { AdminCampaignRow } from './AdminCampaignRow';
import { AuditTrail } from './AuditTrail';

function NotAuthorized() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-panel/40 px-8 py-16 text-center">
      <p className="font-sans text-h2 font-semibold text-paper">Admins only</p>
      <p className="mt-3 font-sans text-small text-mist">
        This wallet is not on the moderation allowlist.
      </p>
    </div>
  );
}

function Body() {
  const { data: campaigns, isLoading, isError } = useAdminCampaigns();

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-line bg-panel/40" />;
  }
  if (isError) {
    return <p className="font-sans text-small text-signal">Could not load campaigns.</p>;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-mono text-caption uppercase tracking-widest text-mist">
          Campaigns by risk
        </h2>
        <div className="space-y-3">
          {(campaigns ?? []).map((c) => (
            <AdminCampaignRow key={c.vault} c={c} />
          ))}
        </div>
      </section>
      <AuditTrail />
    </div>
  );
}

/** Admin moderation panel. SIWE-gated by AuthGate, then role-gated: a non-admin
 *  session sees a polite wall. Admins can risk-triage campaigns and hide the bad
 *  ones from public browse — never anything on-chain. */
export function AdminView() {
  const isAdmin = useIsAdmin();

  return (
    <AuthGate>
      <div className="mx-auto max-w-4xl space-y-8 px-6 py-16">
        <div>
          <h1 className="font-display text-h1 font-semibold tracking-tight text-paper">
            Moderation
          </h1>
          <p className="mt-2 font-sans text-small text-mist">
            Off-chain risk triage. Hiding affects browse visibility only — funds and votes stay
            on-chain.
          </p>
        </div>
        {isAdmin ? <Body /> : <NotAuthorized />}
      </div>
    </AuthGate>
  );
}
