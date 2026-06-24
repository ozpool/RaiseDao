import { Schema, model, type InferSchemaType } from 'mongoose';

/** Off-chain record of milestone evidence pinned to IPFS (#15). The CID is the
 *  durable handle an on-chain proposal (#29) later references; we keep the
 *  provider and size for auditing which pin won and how big the file was. */
const evidenceSchema = new Schema(
  {
    campaignId: { type: Number, required: true },
    milestoneIndex: { type: Number, required: true },
    cid: { type: String, required: true },
    provider: { type: String, required: true }, // pinata | web3.storage
    filename: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
    uploadedBy: { type: String, required: true, lowercase: true }, // wallet address
  },
  { timestamps: true },
);

evidenceSchema.index({ campaignId: 1, milestoneIndex: 1 });

export type Evidence = InferSchemaType<typeof evidenceSchema>;
export const EvidenceModel = model('Evidence', evidenceSchema);
