import { CampaignModel } from '../models/index.js';

export interface CampaignFilters {
  q?: string; // free text over title / city / category
  city?: string;
  category?: string;
  verified?: boolean;
  status?: string;
}

/** A card's worth of campaign data for the browse grid — the public display
 *  fields plus the funding numbers, never the heavy on-chain internals. */
export interface CampaignSummary {
  campaignId: number;
  vault: string;
  founder: string;
  status: string;
  title: string;
  summary: string;
  city: string;
  category: string;
  verified: boolean;
  featured: boolean;
  demo: boolean;
  raiseTarget: string;
  totalRaised: string;
  fundingDeadline: number;
  milestoneCount: number;
}

export interface CampaignMilestone {
  index: number;
  pctBps: number;
  status: string;
  deadline: number;
}

/** The full campaign for the detail page — the summary plus the schedule and the
 *  rest of the on-chain trio. */
export interface CampaignDetail extends CampaignSummary {
  token: string;
  governor: string;
  milestones: CampaignMilestone[];
}

export interface CampaignStore {
  list(filters: CampaignFilters): Promise<CampaignSummary[]>;
  getByVault(vault: string): Promise<CampaignDetail | null>;
  create(input: CampaignInput): Promise<CampaignDetail>;
}

interface CampaignDoc extends Omit<CampaignSummary, 'milestoneCount'> {
  token: string;
  governor: string;
  milestones: CampaignMilestone[];
}

/** The full doc a freshly-deployed campaign is persisted with (#27 bridge): the
 *  founder's off-chain metadata plus the on-chain addresses read from the deploy
 *  receipt. The indexer (#30) later reconciles the financial fields from events. */
export type CampaignInput = CampaignDoc;

function toDetail(c: CampaignDoc): CampaignDetail {
  return {
    ...toSummary(c),
    token: c.token,
    governor: c.governor,
    milestones: (c.milestones ?? []).map((m, i) => ({
      index: typeof m.index === 'number' ? m.index : i,
      pctBps: m.pctBps || 0,
      status: m.status || 'pending',
      deadline: m.deadline || 0,
    })),
  };
}

function toSummary(c: CampaignDoc): CampaignSummary {
  return {
    campaignId: c.campaignId,
    vault: c.vault,
    founder: c.founder,
    status: c.status,
    title: c.title,
    summary: c.summary,
    city: c.city,
    category: c.category,
    verified: c.verified,
    featured: c.featured,
    demo: c.demo,
    raiseTarget: c.raiseTarget,
    totalRaised: c.totalRaised,
    fundingDeadline: c.fundingDeadline,
    milestoneCount: c.milestones?.length ?? 0,
  };
}

export class MongoCampaignStore implements CampaignStore {
  async list(f: CampaignFilters): Promise<CampaignSummary[]> {
    const query: Record<string, unknown> = {};
    if (f.city) query.city = f.city;
    if (f.category) query.category = f.category;
    if (f.verified !== undefined) query.verified = f.verified;
    if (f.status) query.status = f.status;
    if (f.q) {
      const rx = new RegExp(f.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: rx }, { city: rx }, { category: rx }];
    }
    const docs = await CampaignModel.find(query).sort({ featured: -1, createdAt: -1 }).lean();
    return docs.map((d) => toSummary(d as unknown as CampaignDoc));
  }

  async getByVault(vault: string): Promise<CampaignDetail | null> {
    const doc = await CampaignModel.findOne({ vault: vault.toLowerCase() }).lean();
    return doc ? toDetail(doc as unknown as CampaignDoc) : null;
  }

  // Idempotent by vault: a founder may submit twice (retry, double-tap), and we
  // never clobber an existing doc — the indexer is the authority on conflicts.
  async create(input: CampaignInput): Promise<CampaignDetail> {
    const existing = await CampaignModel.findOne({ vault: input.vault.toLowerCase() }).lean();
    if (existing) return toDetail(existing as unknown as CampaignDoc);
    const doc = await CampaignModel.create(input);
    return toDetail(doc.toObject() as unknown as CampaignDoc);
  }
}

/** In-memory store for tests and the demo seed. */
export class InMemoryCampaignStore implements CampaignStore {
  constructor(private readonly docs: CampaignDoc[] = []) {}

  async list(f: CampaignFilters): Promise<CampaignSummary[]> {
    const rx = f.q ? new RegExp(f.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
    return this.docs
      .filter((c) => (f.city ? c.city === f.city : true))
      .filter((c) => (f.category ? c.category === f.category : true))
      .filter((c) => (f.verified !== undefined ? c.verified === f.verified : true))
      .filter((c) => (f.status ? c.status === f.status : true))
      .filter((c) => (rx ? rx.test(c.title) || rx.test(c.city) || rx.test(c.category) : true))
      .sort((a, b) => Number(b.featured) - Number(a.featured))
      .map(toSummary);
  }

  async getByVault(vault: string): Promise<CampaignDetail | null> {
    const doc = this.docs.find((c) => c.vault.toLowerCase() === vault.toLowerCase());
    return doc ? toDetail(doc) : null;
  }

  async create(input: CampaignInput): Promise<CampaignDetail> {
    const existing = this.docs.find((c) => c.vault.toLowerCase() === input.vault.toLowerCase());
    if (existing) return toDetail(existing);
    this.docs.push(input);
    return toDetail(input);
  }
}
