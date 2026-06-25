import { Schema, model, type InferSchemaType } from 'mongoose';

/** A founder's off-chain campaign draft, composed in the creation wizard (#23)
 *  before any on-chain deploy (#24). Kept separate from the chain-projected
 *  Campaign model: a draft has no vault/token/governor addresses yet, and its
 *  amounts are author-supplied rather than indexed from events. Amounts are
 *  decimal strings to avoid float/int53 precision loss, matching Campaign. */
const draftMilestoneSchema = new Schema(
  {
    title: { type: String, required: true }, // the deliverable
    pctBps: { type: Number, required: true, min: 0, max: 10000 }, // release share, basis points
  },
  { _id: false },
);

const draftSchema = new Schema(
  {
    founder: { type: String, required: true, lowercase: true, index: true }, // wallet address
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    raiseTarget: { type: String, required: true }, // USDC, decimal string
    fundingDurationDays: { type: Number, required: true, min: 1 },
    tokenName: { type: String, required: true },
    tokenSymbol: { type: String, required: true },
    tokenSupply: { type: String, required: true }, // decimal string
    milestones: { type: [draftMilestoneSchema], default: [] },
    status: { type: String, enum: ['draft'], default: 'draft' },
  },
  { timestamps: true },
);

export type Draft = InferSchemaType<typeof draftSchema>;
export const DraftModel = model('Draft', draftSchema);
