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

export interface CampaignStore {
  list(filters: CampaignFilters): Promise<CampaignSummary[]>;
}

interface CampaignDoc extends Omit<CampaignSummary, 'milestoneCount'> {
  milestones: unknown[];
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
}
