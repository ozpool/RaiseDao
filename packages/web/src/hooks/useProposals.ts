'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type ProposalRecord } from '@/lib/api';

/** Every persisted proposal for a campaign's vault, so each milestone card can
 *  look up whether a ballot is open. Disabled until the vault is known. */
export function useProposals(vault: string | undefined) {
  return useQuery({
    queryKey: ['proposals', vault],
    queryFn: () => api.proposals.list(vault!),
    enabled: Boolean(vault),
    select: (data) => data.proposals,
  });
}

/** The proposal for one milestone, if any (a milestone has at most one). */
export function proposalForMilestone(
  proposals: ProposalRecord[] | undefined,
  milestoneIndex: number,
): ProposalRecord | undefined {
  return proposals?.find((p) => p.milestoneIndex === milestoneIndex);
}
