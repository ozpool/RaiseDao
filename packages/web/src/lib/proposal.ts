import {
  decodeEventLog,
  encodeFunctionData,
  keccak256,
  toHex,
  type TransactionReceipt,
} from 'viem';
import { milestoneGovernorAbi, raiseVaultAbi } from './abi';

/** The on-chain call a passing milestone vote will execute: release tranche
 *  `index` from the vault. Everything except the description is deterministic
 *  from (vault, index), so the proposalId is fixed only once the founder picks
 *  the description — which is why we persist it server-side after proposing. */
export interface MilestoneProposal {
  targets: readonly `0x${string}`[];
  values: readonly bigint[];
  calldatas: readonly `0x${string}`[];
  description: string;
  descriptionHash: `0x${string}`;
}

/** Human-readable description that also embeds the evidence CID, so the proof is
 *  bound into the descriptionHash the governor records — an investor can verify
 *  the proposal points at exactly the evidence they're reviewing. */
export function buildMilestoneProposal(
  vault: `0x${string}`,
  milestoneIndex: number,
  evidenceCid: string,
): MilestoneProposal {
  const calldata = encodeFunctionData({
    abi: raiseVaultAbi,
    functionName: 'releaseMilestone',
    args: [BigInt(milestoneIndex)],
  });
  const evidenceLine = evidenceCid ? `\n\nEvidence: ipfs://${evidenceCid}` : '';
  const description = `Release milestone ${milestoneIndex + 1}${evidenceLine}`;

  return {
    targets: [vault],
    values: [0n],
    calldatas: [calldata],
    description,
    descriptionHash: keccak256(toHex(description)),
  };
}

/** The deterministic args passed to governor.queue and governor.execute.
 *  targets/values/calldatas are the same as at propose-time; the descriptionHash
 *  must be keccak256 of the EXACT persisted description string — any drift causes
 *  the governor to revert with "Governor: invalid proposal id". */
export interface ExecuteArgs {
  targets: readonly `0x${string}`[];
  values: readonly bigint[];
  calldatas: readonly `0x${string}`[];
  descriptionHash: `0x${string}`;
}

/** Build the queue/execute call arguments from the stored proposal fields.
 *  Reuses the same releaseMilestone encoding as buildMilestoneProposal, but
 *  accepts the persisted description directly so the hash stays in sync with
 *  what the governor recorded at propose-time. */
export function buildExecuteArgs(
  vault: `0x${string}`,
  milestoneIndex: number,
  description: string,
): ExecuteArgs {
  // Encode the vault call that the governor will forward on execution.
  const calldata = encodeFunctionData({
    abi: raiseVaultAbi,
    functionName: 'releaseMilestone',
    args: [BigInt(milestoneIndex)],
  });

  return {
    targets: [vault],
    values: [0n],
    calldatas: [calldata],
    // keccak256(toHex(description)) — must match what the governor hashed at propose-time.
    descriptionHash: keccak256(toHex(description)),
  };
}

/** Pull the proposalId out of the ProposalCreated event in a confirmed propose
 *  receipt. Returns the uint256 as a decimal string (how the API stores it).
 *  Null if the event isn't present — the caller surfaces that rather than
 *  persisting a proposal that didn't actually land. */
export function parseProposalId(receipt: TransactionReceipt): string | null {
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({
        abi: milestoneGovernorAbi,
        data: log.data,
        topics: log.topics,
      });
      if (ev.eventName === 'ProposalCreated') return ev.args.proposalId.toString();
    } catch {
      // not the ProposalCreated event
    }
  }
  return null;
}
