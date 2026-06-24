import { Schema, model, type InferSchemaType } from 'mongoose';

/** A wallet that has authenticated. `nonce` is the pending SIWE challenge. */
const investorSchema = new Schema(
  {
    address: { type: String, required: true, unique: true, lowercase: true, trim: true },
    roles: { type: [String], enum: ['investor', 'founder', 'admin'], default: ['investor'] },
    nonce: { type: String, default: null },
    displayName: { type: String, default: null },
  },
  { timestamps: true },
);

export type Investor = InferSchemaType<typeof investorSchema>;
export const InvestorModel = model('Investor', investorSchema);
