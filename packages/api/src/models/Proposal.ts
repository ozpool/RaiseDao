import { Schema, model, type InferSchemaType } from 'mongoose';

/** Off-chain index of a milestone-release proposal (#29). The on-chain proposalId
 *  is derived from the founder's exact description string (which embeds the
 *  evidence CID), so the ballot can't recompute it — we persist it here at
 *  propose time so investors can find and vote on it. Live tallies come later
 *  from the indexer (#30); this record is just the discovery handle. */
const proposalSchema = new Schema(
  {
    campaignId: { type: Number, required: true, index: true },
    vault: { type: String, required: true, lowercase: true },
    governor: { type: String, required: true, lowercase: true },
    proposalId: { type: String, required: true, unique: true }, // uint256 as a string
    milestoneIndex: { type: Number, required: true },
    descriptionHash: { type: String, required: true, lowercase: true },
    description: { type: String, required: true },
    evidenceCid: { type: String, default: '' },
    proposer: { type: String, required: true, lowercase: true }, // == campaign founder
    txHash: { type: String, required: true, lowercase: true },
  },
  { timestamps: true },
);

proposalSchema.index({ vault: 1, milestoneIndex: 1 });

export type Proposal = InferSchemaType<typeof proposalSchema>;
export const ProposalModel = model('Proposal', proposalSchema);
