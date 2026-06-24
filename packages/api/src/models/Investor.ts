import { Schema, model, type InferSchemaType } from 'mongoose';

/** A wallet that has authenticated. `nonce` is the pending SIWE challenge. */
const investorSchema = new Schema(
  {
    address: { type: String, required: true, unique: true, lowercase: true, trim: true },
    roles: { type: [String], enum: ['investor', 'founder', 'admin'], default: ['investor'] },
    nonce: { type: String, default: null },
    displayName: { type: String, default: null },
    // Optional notification opt-in; only wallets that set an email get emailed.
    email: { type: String, default: null, lowercase: true, trim: true },
  },
  { timestamps: true },
);

export type Investor = InferSchemaType<typeof investorSchema>;
export const InvestorModel = model('Investor', investorSchema);
