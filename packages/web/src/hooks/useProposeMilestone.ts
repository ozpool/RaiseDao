'use client';

import { useEffect, useState } from 'react';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { milestoneGovernorAbi } from '@/lib/abi';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { buildMilestoneProposal, parseProposalId } from '@/lib/proposal';

interface ProposeArgs {
  campaignId: number;
  vault: `0x${string}`;
  governor: `0x${string}`;
  milestoneIndex: number;
  evidenceCid: string;
}

/** Founder action: open a milestone-release vote. Writes governor.propose, then
 *  once the tx confirms parses the proposalId from the ProposalCreated event and
 *  persists the proposal (so the ballot can find it) before refreshing the list.
 *  A missing event or a failed save surfaces as an error rather than a silent
 *  half-done state. */
export function useProposeMilestone(args: ProposeArgs) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const built = buildMilestoneProposal(args.vault, args.milestoneIndex, args.evidenceCid);

  function propose() {
    setSaveError(null);
    setSaved(false);
    write.writeContract({
      address: args.governor,
      abi: milestoneGovernorAbi,
      functionName: 'propose',
      args: [built.targets, built.values, built.calldatas, built.description],
    });
  }

  // Persist once — and only once — the propose tx is mined.
  useEffect(() => {
    if (!receipt.isSuccess || !receipt.data || saved || !token) return;
    const proposalId = parseProposalId(receipt.data);
    if (!proposalId) {
      setSaveError('Proposal tx mined but its id could not be read — refresh and retry.');
      return;
    }
    setSaved(true);
    api.proposals
      .create(
        {
          campaignId: args.campaignId,
          vault: args.vault,
          governor: args.governor,
          proposalId,
          milestoneIndex: args.milestoneIndex,
          descriptionHash: built.descriptionHash,
          description: built.description,
          evidenceCid: args.evidenceCid,
          txHash: receipt.data.transactionHash,
        },
        token,
      )
      .then(() => queryClient.invalidateQueries({ queryKey: ['proposals', args.vault] }))
      .catch((err: unknown) => {
        setSaved(false);
        setSaveError(err instanceof Error ? err.message : 'Could not save the proposal.');
      });
  }, [receipt.isSuccess, receipt.data, saved, token, args, built, queryClient]);

  return {
    propose,
    proposing: write.isPending || receipt.isLoading,
    done: saved,
    hash: write.data,
    error: write.error ?? receipt.error ?? (saveError ? new Error(saveError) : null),
  };
}
