import { VoteModel, AnalyticsModel, CheckpointModel } from '../models/index.js';
import { aggregateTallies, type Tally, type VoteLike } from './aggregate.js';

/** The campaign snapshot a (re)joining socket client receives, and what the
 *  /tally route returns: the live vote tallies plus a freshness stamp so the
 *  client can show a "syncing" state when the indexer falls behind. */
export interface CampaignSnapshot {
  campaignId: number;
  tallies: Tally[];
  analytics: unknown;
  /** ISO time the indexer last advanced its checkpoint, or null if never. */
  indexedAt: string | null;
  /** ISO server time, so the client can judge staleness despite clock skew. */
  serverTime: string;
}

/** Reads behind an interface so the route and the snapshot can be tested against
 *  an in-memory store with no MongoDB. */
export interface TallyStore {
  tallies(campaignId: number): Promise<Tally[]>;
  snapshot(campaignId: number): Promise<CampaignSnapshot>;
}

export class MongoTallyStore implements TallyStore {
  async tallies(campaignId: number): Promise<Tally[]> {
    const votes = await VoteModel.find(
      { campaignId },
      { _id: 0, proposalId: 1, support: 1, weight: 1 },
    ).lean();
    return aggregateTallies(votes as unknown as VoteLike[]);
  }

  async snapshot(campaignId: number): Promise<CampaignSnapshot> {
    const [tallies, analytics, checkpoint] = await Promise.all([
      this.tallies(campaignId),
      AnalyticsModel.findOne({ campaignId }, { _id: 0, __v: 0 }).lean(),
      CheckpointModel.findOne({ id: 'indexer' }).lean(),
    ]);
    const updatedAt = (checkpoint as { updatedAt?: Date } | null)?.updatedAt;
    return {
      campaignId,
      tallies,
      analytics: analytics ?? null,
      indexedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
      serverTime: new Date().toISOString(),
    };
  }
}

/** In-memory store for tests; holds raw votes and a fixed indexedAt. */
export class InMemoryTallyStore implements TallyStore {
  constructor(
    private readonly votes: (VoteLike & { campaignId: number })[] = [],
    private readonly indexedAt: string | null = null,
  ) {}

  async tallies(campaignId: number): Promise<Tally[]> {
    return aggregateTallies(this.votes.filter((v) => v.campaignId === campaignId));
  }

  async snapshot(campaignId: number): Promise<CampaignSnapshot> {
    return {
      campaignId,
      tallies: await this.tallies(campaignId),
      analytics: null,
      indexedAt: this.indexedAt,
      serverTime: new Date().toISOString(),
    };
  }
}
