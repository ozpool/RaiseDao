import { Schema, model, type InferSchemaType } from 'mongoose';

/** A processed domain event (Contributed, MilestoneReleased, ...). The
 *  (txHash, logIndex) pair is unique so the reorg-safe indexer can upsert
 *  idempotently rather than double-count. */
const eventSchema = new Schema(
  {
    campaignId: { type: Number, required: true, index: true },
    type: { type: String, required: true },
    txHash: { type: String, required: true, lowercase: true },
    logIndex: { type: Number, required: true },
    blockNumber: { type: Number, required: true },
    args: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

eventSchema.index({ txHash: 1, logIndex: 1 }, { unique: true });
// The investor dashboard filters Contributed events by args.investor; a sparse
// index keeps that query off a full collection scan (only Contributed events
// carry the field, so most docs are absent from the index).
eventSchema.index({ 'args.investor': 1 }, { sparse: true });

export type Event = InferSchemaType<typeof eventSchema>;
export const EventModel = model('Event', eventSchema);
