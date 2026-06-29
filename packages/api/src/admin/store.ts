import { CampaignModel, AuditLogModel } from '../models/index.js';
import { scoreCampaign, type ScoreResult } from './score.js';

const DAY_MS = 86_400_000;

/** A campaign as the admin panel sees it: the moderation-relevant fields plus its
 *  computed risk. Never exposed to public routes. */
export interface ScoredCampaign {
  campaignId: number;
  vault: string;
  title: string;
  founder: string;
  status: string;
  verified: boolean;
  hidden: boolean;
  raiseTarget: string;
  totalRaised: string;
  risk: ScoreResult;
}

export interface AuditEntry {
  admin: string;
  action: string; // 'hide' | 'unhide' | 'verify' | 'unverify'
  vault: string;
  reason: string;
  at: string; // ISO timestamp
}

export interface AdminStore {
  /** Every campaign, risk-scored, highest risk first. */
  listScored(): Promise<ScoredCampaign[]>;
  /** Toggle a campaign's public visibility and log the action. Null if unknown. */
  setHidden(
    vault: string,
    hidden: boolean,
    admin: string,
    reason?: string,
  ): Promise<ScoredCampaign | null>;
  /** Grant or revoke a campaign's verified badge and log it. Null if unknown.
   *  This is the only way `verified` is ever set: an admin reviews the campaign
   *  (its on-chain founder, its risk signals) and vouches for it. */
  setVerified(
    vault: string,
    verified: boolean,
    admin: string,
    reason?: string,
  ): Promise<ScoredCampaign | null>;
  /** Most recent admin actions, newest first. */
  recentAudit(limit?: number): Promise<AuditEntry[]>;
}

/** The minimal campaign shape the scorer needs, drawn from either backend. */
interface RawCampaign {
  campaignId: number;
  vault: string;
  title: string;
  founder: string;
  status: string;
  verified: boolean;
  hidden: boolean;
  raiseTarget: string;
  totalRaised: string;
  schedule: number[];
  createdAt: number; // epoch ms
}

/** Score one campaign in the context of its founder's whole history. Founder
 *  aggregates (count, failures, tenure) come from the full set, not the row. */
function scoreWithin(c: RawCampaign, all: RawCampaign[], now: number): ScoredCampaign {
  const mine = all.filter((x) => x.founder === c.founder);
  const failed = mine.filter((x) => x.status === 'failed').length;
  const firstSeen = mine.reduce((min, x) => Math.min(min, x.createdAt), now);
  const risk = scoreCampaign({
    status: c.status,
    verified: c.verified,
    raiseTarget: c.raiseTarget,
    schedule: c.schedule,
    founderCampaignCount: mine.length,
    founderFailedCount: failed,
    founderTenureDays: Math.floor((now - firstSeen) / DAY_MS),
  });
  return {
    campaignId: c.campaignId,
    vault: c.vault,
    title: c.title,
    founder: c.founder,
    status: c.status,
    verified: c.verified,
    hidden: c.hidden,
    raiseTarget: c.raiseTarget,
    totalRaised: c.totalRaised,
    risk,
  };
}

const byRiskDesc = (a: ScoredCampaign, b: ScoredCampaign) => b.risk.score - a.risk.score;

export class MongoAdminStore implements AdminStore {
  private async raw(): Promise<RawCampaign[]> {
    const docs = await CampaignModel.find().lean();
    return docs.map((d) => {
      const c = d as unknown as {
        campaignId: number;
        vault: string;
        title?: string;
        founder: string;
        status: string;
        verified?: boolean;
        hidden?: boolean;
        raiseTarget?: string;
        totalRaised?: string;
        milestones?: { pctBps: number }[];
        createdAt?: Date;
      };
      return {
        campaignId: c.campaignId,
        vault: c.vault,
        title: c.title ?? '',
        founder: c.founder,
        status: c.status,
        verified: Boolean(c.verified),
        hidden: Boolean(c.hidden),
        raiseTarget: c.raiseTarget ?? '0',
        totalRaised: c.totalRaised ?? '0',
        schedule: (c.milestones ?? []).map((m) => m.pctBps),
        createdAt: c.createdAt ? c.createdAt.getTime() : Date.now(),
      };
    });
  }

  async listScored(): Promise<ScoredCampaign[]> {
    const all = await this.raw();
    const now = Date.now();
    return all.map((c) => scoreWithin(c, all, now)).sort(byRiskDesc);
  }

  async setHidden(
    vault: string,
    hidden: boolean,
    admin: string,
    reason = '',
  ): Promise<ScoredCampaign | null> {
    const v = vault.toLowerCase();
    const updated = await CampaignModel.findOneAndUpdate(
      { vault: v },
      { $set: { hidden } },
      { new: true },
    ).lean();
    if (!updated) return null;
    await AuditLogModel.create({
      admin: admin.toLowerCase(),
      action: hidden ? 'hide' : 'unhide',
      vault: v,
      reason,
    });
    const all = await this.raw();
    const target = all.find((x) => x.vault === v);
    return target ? scoreWithin(target, all, Date.now()) : null;
  }

  async setVerified(
    vault: string,
    verified: boolean,
    admin: string,
    reason = '',
  ): Promise<ScoredCampaign | null> {
    const v = vault.toLowerCase();
    const updated = await CampaignModel.findOneAndUpdate(
      { vault: v },
      { $set: { verified } },
      { new: true },
    ).lean();
    if (!updated) return null;
    await AuditLogModel.create({
      admin: admin.toLowerCase(),
      action: verified ? 'verify' : 'unverify',
      vault: v,
      reason,
    });
    const all = await this.raw();
    const target = all.find((x) => x.vault === v);
    return target ? scoreWithin(target, all, Date.now()) : null;
  }

  async recentAudit(limit = 50): Promise<AuditEntry[]> {
    const rows = await AuditLogModel.find().sort({ createdAt: -1 }).limit(limit).lean();
    return rows.map((r) => {
      const a = r as unknown as {
        admin: string;
        action: string;
        vault: string;
        reason: string;
        createdAt: Date;
      };
      return {
        admin: a.admin,
        action: a.action,
        vault: a.vault,
        reason: a.reason,
        at: a.createdAt.toISOString(),
      };
    });
  }
}

/** Seed shape for tests/demo: a campaign as the admin store ingests it. */
export interface SeedAdminCampaign {
  campaignId: number;
  vault: string;
  title?: string;
  founder: string;
  status: string;
  verified?: boolean;
  hidden?: boolean;
  raiseTarget?: string;
  totalRaised?: string;
  milestones?: { pctBps: number }[];
  createdAt?: Date;
}

export class InMemoryAdminStore implements AdminStore {
  private readonly audit: AuditEntry[] = [];

  constructor(private readonly seed: SeedAdminCampaign[] = []) {}

  private raw(): RawCampaign[] {
    return this.seed.map((c) => ({
      campaignId: c.campaignId,
      vault: c.vault.toLowerCase(),
      title: c.title ?? '',
      founder: c.founder.toLowerCase(),
      status: c.status,
      verified: Boolean(c.verified),
      hidden: Boolean(c.hidden),
      raiseTarget: c.raiseTarget ?? '0',
      totalRaised: c.totalRaised ?? '0',
      schedule: (c.milestones ?? []).map((m) => m.pctBps),
      createdAt: c.createdAt ? c.createdAt.getTime() : Date.now(),
    }));
  }

  async listScored(): Promise<ScoredCampaign[]> {
    const all = this.raw();
    const now = Date.now();
    return all.map((c) => scoreWithin(c, all, now)).sort(byRiskDesc);
  }

  async setHidden(
    vault: string,
    hidden: boolean,
    admin: string,
    reason = '',
  ): Promise<ScoredCampaign | null> {
    const v = vault.toLowerCase();
    const doc = this.seed.find((c) => c.vault.toLowerCase() === v);
    if (!doc) return null;
    doc.hidden = hidden;
    this.audit.unshift({
      admin: admin.toLowerCase(),
      action: hidden ? 'hide' : 'unhide',
      vault: v,
      reason,
      at: new Date().toISOString(),
    });
    const all = this.raw();
    const target = all.find((x) => x.vault === v)!;
    return scoreWithin(target, all, Date.now());
  }

  async setVerified(
    vault: string,
    verified: boolean,
    admin: string,
    reason = '',
  ): Promise<ScoredCampaign | null> {
    const v = vault.toLowerCase();
    const doc = this.seed.find((c) => c.vault.toLowerCase() === v);
    if (!doc) return null;
    doc.verified = verified;
    this.audit.unshift({
      admin: admin.toLowerCase(),
      action: verified ? 'verify' : 'unverify',
      vault: v,
      reason,
      at: new Date().toISOString(),
    });
    const all = this.raw();
    const target = all.find((x) => x.vault === v)!;
    return scoreWithin(target, all, Date.now());
  }

  async recentAudit(limit = 50): Promise<AuditEntry[]> {
    return this.audit.slice(0, limit);
  }
}
