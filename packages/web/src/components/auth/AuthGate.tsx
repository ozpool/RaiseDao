'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth';
import { ConnectButton } from '@/components/wallet/ConnectButton';

/** Gates its children behind a signed-in session — the reusable primitive the
 *  M5/M6 protected flows (create, contribute, vote) will wrap their UI in.
 *  Until authenticated it shows a sign-in prompt with the same wallet control
 *  from the header. Server and first client render both see `unauthenticated`
 *  (status isn't persisted; it's earned via /auth/me), so there's no hydration
 *  mismatch — the children appear once AuthSync confirms the token. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  // A persisted token that AuthSync is still re-validating against /auth/me. We
  // show a quiet "restoring" state instead of the sign-in CTA so a returning user
  // can't accidentally sign a second, redundant SIWE message during that window.
  const restoring = useAuthStore((s) => Boolean(s.token) && s.status !== 'authenticated');

  if (isAuthenticated) return <>{children}</>;

  if (restoring) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-line bg-panel/40 px-8 py-14 text-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-data" />
        <p className="font-mono text-caption uppercase tracking-widest text-mist">
          Restoring your session…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border border-line bg-panel/40 px-8 py-14 text-center">
      <p className="font-mono text-caption uppercase tracking-widest text-mist">Members only</p>
      <p className="font-sans text-h2 font-semibold text-paper">Sign in to continue</p>
      <p className="max-w-sm font-sans text-small text-mist">
        Connect your wallet and sign a message to prove it&apos;s yours. No transaction, no gas.
      </p>
      <ConnectButton />
    </div>
  );
}
