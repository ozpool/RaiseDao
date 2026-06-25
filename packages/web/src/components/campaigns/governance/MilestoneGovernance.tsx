'use client';

import { useAccount } from 'wagmi';
import { useProposals, proposalForMilestone } from '@/hooks/useProposals';
import { ProposalBallot } from './ProposalBallot';
import { ProposeButton } from './ProposeButton';

/** Per-milestone governance: shows the open ballot if a proposal exists, the
 *  founder's "open vote" control if not (and the viewer is the founder), or a
 *  quiet placeholder otherwise. evidenceCid is the milestone's newest pinned
 *  file, bound into the proposal so the vote points at concrete proof. */
export function MilestoneGovernance({
  campaignId,
  vault,
  governor,
  founder,
  milestoneIndex,
  evidenceCid,
}: {
  campaignId: number;
  vault: string;
  governor: string;
  founder: string;
  milestoneIndex: number;
  evidenceCid: string;
}) {
  const { address } = useAccount();
  const { data: proposals } = useProposals(vault);
  const proposal = proposalForMilestone(proposals, milestoneIndex);
  const isFounder = Boolean(address && address.toLowerCase() === founder.toLowerCase());

  if (proposal) {
    return <ProposalBallot governor={governor as `0x${string}`} proposalId={proposal.proposalId} />;
  }
  if (isFounder) {
    return (
      <ProposeButton
        campaignId={campaignId}
        vault={vault as `0x${string}`}
        governor={governor as `0x${string}`}
        milestoneIndex={milestoneIndex}
        evidenceCid={evidenceCid}
      />
    );
  }
  return (
    <p className="mt-3 font-sans text-caption text-mist">
      No release vote has been opened for this milestone yet.
    </p>
  );
}
