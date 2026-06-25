'use client';

import { useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { EXPLORER_URL, USDC_DECIMALS } from '@/lib/config';
import { useContribute } from '@/hooks/useContribute';
import { ConnectButton } from '@/components/wallet/ConnectButton';

const CARD = 'rounded-2xl border border-line bg-panel/40 p-6';
const PRIMARY =
  'w-full rounded-full bg-data px-5 py-2.5 font-mono text-caption uppercase tracking-widest text-void transition-opacity hover:opacity-90 disabled:opacity-40';

function TxLink({ hash, label }: { hash: `0x${string}`; label: string }) {
  return (
    <a
      href={`${EXPLORER_URL}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="block font-mono text-caption uppercase tracking-widest text-data hover:opacity-80"
    >
      {label} ↗
    </a>
  );
}

export function ContributePanel({
  vault,
  status,
  demo,
}: {
  vault: `0x${string}`;
  status: string;
  demo: boolean;
}) {
  const { isConnected } = useAccount();
  const c = useContribute(vault);
  const [amount, setAmount] = useState('');

  const valid = /^\d+(\.\d{1,6})?$/.test(amount) && Number(amount) > 0;
  const units = valid ? parseUnits(amount, USDC_DECIMALS) : 0n;
  const needsApproval = units > c.allowance;
  const overBalance = units > c.balance;

  if (demo) {
    return (
      <div className={CARD}>
        <p className="font-sans text-small text-mist">
          This is a demo campaign — contributions are disabled for samples.
        </p>
      </div>
    );
  }
  if (status !== 'funding') {
    return (
      <div className={CARD}>
        <p className="font-sans text-small text-mist">Funding has closed for this campaign.</p>
      </div>
    );
  }
  if (!isConnected) {
    return (
      <div className={`${CARD} flex flex-col items-center gap-4 text-center`}>
        <p className="font-sans text-small text-mist">Connect your wallet to contribute.</p>
        <ConnectButton />
      </div>
    );
  }
  if (c.done) {
    return (
      <div className={`${CARD} space-y-2`}>
        <p className="font-mono text-caption uppercase tracking-widest text-data">
          Contribution confirmed
        </p>
        {c.mintedVotes !== null && (
          <p className="font-sans text-small text-mist">
            Minted {Number(formatUnits(c.mintedVotes, 18)).toLocaleString()} governance tokens.
          </p>
        )}
        {c.contributeHash && <TxLink hash={c.contributeHash} label="View transaction" />}
      </div>
    );
  }

  return (
    <div className={`${CARD} space-y-4`}>
      <p className="font-mono text-caption uppercase tracking-widest text-mist">Contribute USDC</p>
      <span className="relative block">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="0.00"
          className="w-full rounded-lg border border-line bg-void/40 px-3 py-2 pr-14 font-mono text-small text-paper outline-none transition-colors focus:border-data"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-caption uppercase text-mist">
          USDC
        </span>
      </span>
      <p className="font-mono text-caption text-mist">
        Balance {Number(formatUnits(c.balance, USDC_DECIMALS)).toLocaleString()} USDC
      </p>

      {needsApproval ? (
        <button
          type="button"
          className={PRIMARY}
          disabled={!valid || overBalance || c.approving}
          onClick={() => c.approve(units)}
        >
          {c.approving ? 'Approving…' : 'Approve USDC'}
        </button>
      ) : (
        <button
          type="button"
          className={PRIMARY}
          disabled={!valid || overBalance || c.contributing}
          onClick={() => c.contribute(units)}
        >
          {c.contributing ? 'Contributing…' : 'Contribute'}
        </button>
      )}

      {overBalance && valid && (
        <p className="font-sans text-caption text-signal">Amount exceeds your USDC balance.</p>
      )}
      {c.approveHash && c.approving && <TxLink hash={c.approveHash} label="Approval transaction" />}
      {c.error && (
        <p className="font-sans text-caption text-signal">
          {/User rejected|denied/i.test(c.error.message)
            ? 'Transaction rejected in wallet.'
            : 'Something went wrong — try again.'}
        </p>
      )}
    </div>
  );
}
