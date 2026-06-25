import { Schema, model, type InferSchemaType } from 'mongoose';

/** Singleton indexer cursor: the last block whose events have been mirrored.
 *  `id` is a fixed key so there is exactly one document. timestamps give an
 *  `updatedAt` that advances each time the cursor moves, which the live-tally
 *  snapshot surfaces as `indexedAt` so clients can detect a stale indexer. */
const checkpointSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, default: 'indexer' },
    lastBlock: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export type Checkpoint = InferSchemaType<typeof checkpointSchema>;
export const CheckpointModel = model('Checkpoint', checkpointSchema);
