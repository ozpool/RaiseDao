import { Schema, model, type InferSchemaType } from 'mongoose';

/** Singleton indexer cursor: the last block whose events have been mirrored.
 *  `id` is a fixed key so there is exactly one document. */
const checkpointSchema = new Schema({
  id: { type: String, required: true, unique: true, default: 'indexer' },
  lastBlock: { type: Number, required: true, default: 0 },
});

export type Checkpoint = InferSchemaType<typeof checkpointSchema>;
export const CheckpointModel = model('Checkpoint', checkpointSchema);
