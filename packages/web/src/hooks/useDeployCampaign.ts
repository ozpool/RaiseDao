'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { decodeEventLog } from 'viem';
import { raiseFactoryAbi } from '@/lib/abi';
import { FACTORY_ADDRESS } from '@/lib/config';
import { toCampaignParams } from '@/lib/deploy-params';
import type { DraftRecord } from '@/lib/api';

export interface DeployedCampaign {
  id: bigint;
  vault: `0x${string}`;
  token: `0x${string}`;
  governor: `0x${string}`;
}

/** idle → signing (awaiting wallet) → confirming (tx mining) → confirmed; or error. */
export type DeployPhase = 'idle' | 'signing' | 'confirming' | 'confirmed' | 'error';

/** The exact factory params used for the in-flight deploy, kept so the campaign
 *  can be persisted off-chain with the same funding/milestone deadlines. */
export type DeployParams = ReturnType<typeof toCampaignParams>;

export interface UseDeployCampaign {
  deploy: () => void;
  phase: DeployPhase;
  hash: `0x${string}` | undefined;
  result: DeployedCampaign | null;
  params: DeployParams | null;
  error: Error | null;
  reset: () => void;
  configured: boolean;
}

/** Deploys a saved draft on-chain via RaiseFactory.deploy and surfaces the
 *  transaction lifecycle. The deployed vault/token/governor are read back from
 *  the CampaignDeployed event in the receipt. Inert (configured=false) when no
 *  factory address is set for the network. */
export function useDeployCampaign(draft: DraftRecord): UseDeployCampaign {
  const { address } = useAccount();
  const { writeContract, data: hash, error: writeError, isPending, reset } = useWriteContract();
  const {
    data: receipt,
    isLoading: confirming,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  // Stash the params used for this deploy so the campaign can be persisted with
  // the same deadlines that went on-chain, not a recomputed (drifted) set.
  const paramsRef = useRef<DeployParams | null>(null);

  const deploy = useCallback(() => {
    if (!FACTORY_ADDRESS || !address) return;
    const params = toCampaignParams(draft, address);
    paramsRef.current = params;
    writeContract({
      address: FACTORY_ADDRESS,
      abi: raiseFactoryAbi,
      functionName: 'deploy',
      args: [params],
    });
  }, [address, draft, writeContract]);

  const result = useMemo<DeployedCampaign | null>(() => {
    if (!receipt) return null;
    for (const log of receipt.logs) {
      try {
        const ev = decodeEventLog({ abi: raiseFactoryAbi, data: log.data, topics: log.topics });
        if (ev.eventName === 'CampaignDeployed') {
          const a = ev.args;
          return { id: a.id, vault: a.vault, token: a.token, governor: a.governor };
        }
      } catch {
        // A log from one of the cloned contracts — not the event we want.
      }
    }
    return null;
  }, [receipt]);

  const error = writeError ?? receiptError ?? null;
  const phase: DeployPhase = error
    ? 'error'
    : result
      ? 'confirmed'
      : confirming
        ? 'confirming'
        : isPending
          ? 'signing'
          : 'idle';

  return {
    deploy,
    phase,
    hash,
    result,
    params: paramsRef.current,
    error,
    reset,
    configured: !!FACTORY_ADDRESS,
  };
}
