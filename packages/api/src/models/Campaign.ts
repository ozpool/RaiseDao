import { Schema, model, type InferSchemaType } from 'mongoose';

/** Denormalised campaign state, projected from chain events by the indexer (#14).
 *  Amounts are stored as decimal strings to avoid float and int53 precision loss. */
const milestoneSchema = new Schema(
  {
    index: { type: Number, required: true },
    pctBps: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'passed', 'failed', 'released'],
      default: 'pending',
    },
    deadline: { type: Number, required: true }, // unix seconds
  },
  { _id: false },
);

const campaignSchema = new Schema(
  {
    campaignId: { type: Number, required: true, unique: true }, // factory id
    vault: { type: String, required: true, lowercase: true },
    token: { type: String, required: true, lowercase: true },
    governor: { type: String, required: true, lowercase: true },
    founder: { type: String, required: true, lowercase: true },
    status: {
      type: String,
      enum: ['funding', 'active', 'succeeded', 'failed'],
      default: 'funding',
    },
    totalRaised: { type: String, default: '0' },
    protocolFeeBps: { type: Number, default: 0 },
    fundingDeadline: { type: Number, required: true },
    milestones: { type: [milestoneSchema], default: [] },
    metadataCid: { type: String, default: null },
    createdAtBlock: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type Campaign = InferSchemaType<typeof campaignSchema>;
export const CampaignModel = model('Campaign', campaignSchema);
