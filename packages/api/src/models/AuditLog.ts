import { Schema, model, type InferSchemaType } from 'mongoose';

/** An immutable record of an off-chain admin action (#35). Admin power is limited
 *  to hiding/un-hiding campaigns from public browse; every such action is logged
 *  here with who did it and why, so the moderation trail is auditable. */
const auditLogSchema = new Schema(
  {
    admin: { type: String, required: true, lowercase: true },
    action: { type: String, required: true }, // e.g. 'hide' | 'unhide'
    vault: { type: String, required: true, lowercase: true },
    reason: { type: String, default: '' },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel = model('AuditLog', auditLogSchema);
