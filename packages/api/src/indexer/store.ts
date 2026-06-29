import {
  CampaignModel,
  EventModel,
  VoteModel,
  AnalyticsModel,
  CheckpointModel,
} from '../models/index.js';
import type { DecodedEvent } from './types.js';

/**
 * Persistence the engine needs, behind an interface so the reorg/idempotency
 * logic can be tested against an in-memory store with no MongoDB.
 *
 * `handle` is idempotent: it returns false if the (txHash, logIndex) event was
 * already recorded, and applies aggregate changes only on first sight.
 */
export interface IndexerStore {
  getCheckpoint(): Promise<number | null>;
  setCheckpoint(block: number): Promise<void>;
  /** Map of watched campaign-contract address -> campaign id (vault + governor). */
  getWatched(): Promise<Map<string, number>>;
  handle(event: DecodedEvent): Promise<boolean>;
}

const CHECKPOINT_ID = 'indexer';

export class MongoIndexerStore implements IndexerStore {
  async getCheckpoint(): Promise<number | null> {
    const doc = await CheckpointModel.findOne({ id: CHECKPOINT_ID });
    return doc?.lastBlock ?? null;
  }

  async setCheckpoint(block: number): Promise<void> {
    await CheckpointModel.updateOne(
      { id: CHECKPOINT_ID },
      { $set: { lastBlock: block } },
      { upsert: true },
    );
  }

  async getWatched(): Promise<Map<string, number>> {
    const campaigns = await CampaignModel.find({}, { campaignId: 1, vault: 1, governor: 1 });
    const map = new Map<string, number>();
    for (const c of campaigns) {
      map.set(c.vault, c.campaignId);
      map.set(c.governor, c.campaignId);
    }
    return map;
  }

  async handle(event: DecodedEvent): Promise<boolean> {
    const result = await EventModel.updateOne(
      { txHash: event.txHash, logIndex: event.logIndex },
      {
        $setOnInsert: {
          campaignId: event.campaignId,
          type: event.type,
          txHash: event.txHash,
          logIndex: event.logIndex,
          blockNumber: event.blockNumber,
          args: event.args,
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount !== 1) return false; // already processed
    await this.apply(event);
    return true;
  }

  private async apply(e: DecodedEvent): Promise<void> {
    const id = e.campaignId;
    if (e.type === 'CampaignDeployed') {
      await CampaignModel.updateOne(
        { campaignId: id },
        {
          $setOnInsert: {
            campaignId: id,
            vault: e.args.vault,
            token: e.args.token,
            governor: e.args.governor,
            founder: e.args.founder,
            fundingDeadline: 0,
          },
        },
        { upsert: true },
      );
      await AnalyticsModel.updateOne(
        { campaignId: id },
        { $setOnInsert: { campaignId: id } },
        { upsert: true },
      );
    } else if (e.type === 'Contributed') {
      // Accumulate the raised total on both the campaign doc (browse/detail read
      // it directly) and analytics (the founder dashboard reads it there).
      // Stored as decimal strings, so we read-modify-write with BigInt; apply()
      // runs once per event (idempotency guard above), so this never double-adds.
      const amount = BigInt((e.args.amount as string | undefined) ?? '0');
      const campaign = await CampaignModel.findOne({ campaignId: id }, { totalRaised: 1 });
      const campaignTotal = (BigInt(campaign?.totalRaised ?? '0') + amount).toString();
      await CampaignModel.updateOne({ campaignId: id }, { $set: { totalRaised: campaignTotal } });

      const analytics = await AnalyticsModel.findOne({ campaignId: id }, { totalRaised: 1 });
      const analyticsTotal = (BigInt(analytics?.totalRaised ?? '0') + amount).toString();
      await AnalyticsModel.updateOne(
        { campaignId: id },
        {
          $inc: { contributorCount: 1 },
          $set: { totalRaised: analyticsTotal, lastEventBlock: e.blockNumber },
        },
        { upsert: true },
      );
    } else if (e.type === 'MilestoneReleased') {
      await AnalyticsModel.updateOne(
        { campaignId: id },
        { $inc: { milestonesReleased: 1 } },
        { upsert: true },
      );
      // Reflect the released milestone in the campaign's schedule so the detail
      // page shows it (the doc's milestone statuses are otherwise set at create).
      const index = Number(e.args.index ?? 0);
      await CampaignModel.updateOne(
        { campaignId: id },
        { $set: { 'milestones.$[m].status': 'released' } },
        { arrayFilters: [{ 'm.index': index }] },
      );
    } else if (e.type === 'MilestoneFailed') {
      await AnalyticsModel.updateOne(
        { campaignId: id },
        { $inc: { milestonesFailed: 1 } },
        { upsert: true },
      );
      const index = Number(e.args.index ?? 0);
      await CampaignModel.updateOne(
        { campaignId: id },
        { $set: { status: 'failed', 'milestones.$[m].status': 'failed' } },
        { arrayFilters: [{ 'm.index': index }] },
      );
    } else if (e.type === 'VoteCast') {
      await VoteModel.updateOne(
        { proposalId: e.args.proposalId, voter: e.args.voter },
        {
          $setOnInsert: {
            campaignId: id,
            proposalId: e.args.proposalId,
            voter: e.args.voter,
            support: Number(e.args.support),
            weight: String(e.args.weight),
            txHash: e.txHash,
            blockNumber: e.blockNumber,
          },
        },
        { upsert: true },
      );
    }
  }
}

/** In-memory store for tests; mirrors just enough state to assert against. */
export class InMemoryIndexerStore implements IndexerStore {
  checkpoint: number | null = null;
  readonly seen = new Set<string>();
  readonly events: DecodedEvent[] = [];
  readonly watched = new Map<string, number>();
  readonly contributions = new Map<number, number>();

  async getCheckpoint(): Promise<number | null> {
    return this.checkpoint;
  }

  async setCheckpoint(block: number): Promise<void> {
    this.checkpoint = block;
  }

  async getWatched(): Promise<Map<string, number>> {
    return new Map(this.watched);
  }

  async handle(event: DecodedEvent): Promise<boolean> {
    const key = `${event.txHash}:${event.logIndex}`;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    this.events.push(event);

    if (event.type === 'CampaignDeployed') {
      this.watched.set(String(event.args.vault), event.campaignId);
      this.watched.set(String(event.args.governor), event.campaignId);
    } else if (event.type === 'Contributed') {
      this.contributions.set(event.campaignId, (this.contributions.get(event.campaignId) ?? 0) + 1);
    }
    return true;
  }
}
