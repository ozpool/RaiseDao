'use client';

import { AuthGate } from '@/components/auth/AuthGate';
import { useAuth } from '@/hooks/useAuth';

/** The signed-in session, behind the gate. A small demonstration that the auth
 *  primitive works end to end; the real account surfaces (positions, votes)
 *  arrive with M5/M6. */
function SessionDetails() {
  const { session } = useAuth();
  if (!session) return null;
  return (
    <dl className="mx-auto max-w-md divide-y divide-line rounded-2xl border border-line bg-panel/40">
      <div className="flex items-center justify-between gap-6 px-6 py-4">
        <dt className="font-mono text-caption uppercase tracking-widest text-mist">Address</dt>
        <dd className="break-all font-mono text-small text-paper">{session.address}</dd>
      </div>
      <div className="flex items-center justify-between gap-6 px-6 py-4">
        <dt className="font-mono text-caption uppercase tracking-widest text-mist">Roles</dt>
        <dd className="font-mono text-small text-paper">
          {session.roles.length ? session.roles.join(', ') : 'investor'}
        </dd>
      </div>
    </dl>
  );
}

export function AccountView() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h1 className="mb-10 text-center font-display text-hero font-semibold tracking-tight text-paper">
        Account
      </h1>
      <AuthGate>
        <SessionDetails />
      </AuthGate>
    </section>
  );
}
