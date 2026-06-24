import { Schema, model, type InferSchemaType } from 'mongoose';

/** A cast vote, denormalised from the governor. One vote per (proposal, voter). */
const voteSchema = new Schema(
  {
    campaignId: { type: Number, required: true, index: true },
    proposalId: { type: String, required: true },
    voter: { type: String, required: true, lowercase: true },
    support: { type: Number, required: true, enum: [0, 1, 2] }, // against / for / abstain
    weight: { type: String, required: true }, // snapshot voting power as a string
    txHash: { type: String, required: true, lowercase: true },
    blockNumber: { type: Number, required: true },
  },
  { timestamps: true },
);

voteSchema.index({ proposalId: 1, voter: 1 }, { unique: true });

export type Vote = InferSchemaType<typeof voteSchema>;
export const VoteModel = model('Vote', voteSchema);
