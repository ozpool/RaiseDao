'use client';

import { formatUnits } from 'viem';
import { useAccount } from 'wagmi';
import { EXPLORER_URL } from '@/lib/config';
import { useDelegate } from '@/hooks/useDelegate';

const CARD = 'rounded-2xl border border-line bg-panel/40 p-6 space-y-3';
const PRIMARY =
  'w-full rounded-full bg-data px-5 py-2.5 font-mono text-caption uppercase tracking-widest text-void transition-opacity hover:opacity-90 disabled:opacity-40';

/** The missing link in the voting flow: minted GovToken is dormant until the
 *  holder delegates it to themselves. Shown only to a connected wallet that holds
 *  votes but hasn't activated them — self-hides otherwise, so it surfaces exactly
 *  when (and only when) the user needs to act, in both funding and voting phases. */
export function ActivateVoting({ token }: { token: `0x${string}` }) {
  const { isConnected } = useAccount();
  const d = useDelegate(token);

  if (!isConnected || d.balance === 0n) return null;

  if (d.done) {
    return (
      <div className={CARD}>
        <p className="font-mono text-caption uppercase tracking-widest text-data">
          Voting power active
        </p>
        <p className="font-sans text-small text-mist">
          Your {Number(formatUnits(d.balance, 6)).toLocaleString()} votes now count toward milestone
          decisions.
        </p>
        {d.activateHash && (
          <a
            href={`${EXPLORER_URL}/tx/${d.activateHash}`}
            target="_blank"
            rel="noreferrer"
            className="block font-mono text-caption uppercase tracking-widest text-data hover:opacity-80"
          >
            View transaction ↗
          </a>
        )}
      </div>
    );
  }

  if (d.delegated) return null;

  return (
    <div className={CARD}>
      <p className="font-mono text-caption uppercase tracking-widest text-mist">
        Activate voting power
      </p>
      <p className="font-sans text-small text-mist">
        You hold {Number(formatUnits(d.balance, 6)).toLocaleString()} governance tokens, but they
        stay dormant until you activate them. A one-time transaction lets you vote on milestone
        releases.
      </p>
      <button type="button" className={PRIMARY} disabled={d.activating} onClick={d.activate}>
        {d.activating ? 'Activating…' : 'Activate voting power'}
      </button>
      {d.error && (
        <p className="font-sans text-caption text-signal">
          {/User rejected|denied/i.test(d.error.message)
            ? 'Transaction rejected in wallet.'
            : 'Something went wrong — try again.'}
        </p>
      )}
    </div>
  );
}
