import { Schema, model, type InferSchemaType } from 'mongoose';

/** Per-campaign rollups maintained by the indexer, so dashboards read one small
 *  document instead of aggregating the event log on every request. */
const analyticsSchema = new Schema(
  {
    campaignId: { type: Number, required: true, unique: true },
    contributorCount: { type: Number, default: 0 },
    totalRaised: { type: String, default: '0' },
    milestonesReleased: { type: Number, default: 0 },
    milestonesFailed: { type: Number, default: 0 },
    lastEventBlock: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type Analytics = InferSchemaType<typeof analyticsSchema>;
export const AnalyticsModel = model('Analytics', analyticsSchema);
