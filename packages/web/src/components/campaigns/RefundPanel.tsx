'use client';

import { formatUnits } from 'viem';
import { useAccount } from 'wagmi';
import { EXPLORER_URL, USDC_DECIMALS } from '@/lib/config';
import type { CampaignMilestone } from '@/lib/api';
import { useRefund } from '@/hooks/useRefund';

const CARD = 'rounded-2xl border border-line bg-panel/40 p-6 space-y-3';
const PRIMARY =
  'w-full rounded-full bg-data px-5 py-2.5 font-mono text-caption uppercase tracking-widest text-void transition-opacity hover:opacity-90 disabled:opacity-40';
const usdc = (v: bigint) => Number(formatUnits(v, USDC_DECIMALS)).toLocaleString();

function TxLink({ hash }: { hash: `0x${string}` }) {
  return (
    <a
      href={`${EXPLORER_URL}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="block font-mono text-caption uppercase tracking-widest text-data hover:opacity-80"
    >
      View transaction ↗
    </a>
  );
}

function TxError({ message }: { message: string }) {
  return (
    <p className="font-sans text-caption text-signal">
      {/User rejected|denied/i.test(message)
        ? 'Transaction rejected in wallet.'
        : 'Something went wrong — try again.'}
    </p>
  );
}

/** The failure side of the lifecycle (#34): once a milestone fails, contributors
 *  claim pro-rata refunds; and if a milestone deadline lapses without a release,
 *  anyone may force-fail it to unlock those refunds. Self-hides unless one of
 *  those actions is available to the viewer, so it sits quietly in the aside. */
export function RefundPanel({
  vault,
  milestones,
}: {
  vault: `0x${string}`;
  milestones: CampaignMilestone[];
}) {
  const { isConnected } = useAccount();
  const r = useRefund(vault);

  // Refunds are open: a contributor can claim their share.
  if (r.refundsOpen) {
    if (r.claimed) {
      return (
        <div className={CARD}>
          <p className="font-mono text-caption uppercase tracking-widest text-data">
            Refund claimed
          </p>
          <p className="font-sans text-small text-mist">
            Your USDC has been returned to your wallet.
          </p>
          {r.claimHash && <TxLink hash={r.claimHash} />}
        </div>
      );
    }
    if (!isConnected || r.contributed === 0n) return null;
    return (
      <div className={CARD}>
        <p className="font-mono text-caption uppercase tracking-widest text-mist">
          Refund available
        </p>
        <p className="font-sans text-small text-mist">
          A milestone failed, so the remaining funds are returned pro-rata. Your share is{' '}
          <span className="text-paper">{usdc(r.refundAmount)} USDC</span>.
        </p>
        <button type="button" className={PRIMARY} disabled={r.claiming} onClick={r.claim}>
          {r.claiming ? 'Claiming…' : 'Claim refund'}
        </button>
        {r.error && <TxError message={r.error.message} />}
      </div>
    );
  }

  // Refunds not open — offer the expiry escape hatch if the next deadline lapsed.
  const next = milestones.find((m) => m.index === r.currentMilestone);
  const expired =
    isConnected &&
    r.milestoneCount > 0 &&
    r.currentMilestone < r.milestoneCount &&
    Boolean(next) &&
    Math.floor(Date.now() / 1000) > next!.deadline;

  if (r.failed) {
    return (
      <div className={CARD}>
        <p className="font-mono text-caption uppercase tracking-widest text-data">
          Refunds unlocked
        </p>
        <p className="font-sans text-small text-mist">
          The lapsed milestone was failed. Refunds are now open — reload to claim your share.
        </p>
        {r.failHash && <TxLink hash={r.failHash} />}
      </div>
    );
  }

  if (!expired) return null;

  return (
    <div className={CARD}>
      <p className="font-mono text-caption uppercase tracking-widest text-mist">
        Milestone overdue
      </p>
      <p className="font-sans text-small text-mist">
        Milestone {r.currentMilestone + 1}&rsquo;s deadline passed without a release. Anyone may
        fail it to unlock refunds for contributors.
      </p>
      <button type="button" className={PRIMARY} disabled={r.failing} onClick={r.forceFail}>
        {r.failing ? 'Failing…' : 'Force-fail & unlock refunds'}
      </button>
      {r.error && <TxError message={r.error.message} />}
    </div>
  );
}
