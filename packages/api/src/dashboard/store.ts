import { CampaignModel, AnalyticsModel, EventModel, VoteModel } from '../models/index.js';

// ---- Public row types (web half depends on these exact field names) ----

export interface MilestoneSlim {
  index: number;
  pctBps: number;
  status: string;
}
export interface ReleaseRow {
  index: number;
  blockNumber: number;
  txHash: string;
}

export interface FounderRow {
  campaignId: number;
  vault: string;
  title: string;
  status: string;
  raiseTarget: string;
  totalRaised: string;
  contributorCount: number;
  milestonesReleased: number;
  milestonesFailed: number;
  milestones: MilestoneSlim[];
  releases: ReleaseRow[];
}

export interface ContribRow {
  campaignId: number;
  vault: string;
  title: string;
  amount: string;
  votesMinted: string;
  blockNumber: number;
  txHash: string;
}

export interface VoteRow {
  campaignId: number;
  vault: string;
  title: string;
  proposalId: string;
  support: number;
  weight: string;
  blockNumber: number;
  txHash: string;
}

export interface RefundRow {
  campaignId: number;
  vault: string;
  title: string;
  status: string;
}

export interface InvestorData {
  contributions: ContribRow[];
  votes: VoteRow[];
  refundable: RefundRow[];
}

export interface DashboardStore {
  founder(address: string): Promise<FounderRow[]>;
  investor(address: string): Promise<InvestorData>;
}

// ---- Helpers (pure) ----

/** Pull a string from unknown Mixed args; returns '0' for missing/null. */
function argStr(args: unknown, key: string): string {
  if (args !== null && typeof args === 'object' && key in (args as object)) {
    const v = (args as Record<string, unknown>)[key];
    return v != null ? String(v) : '0';
  }
  return '0';
}

/** Pull a number from unknown Mixed args; returns 0 for missing/non-number. */
function argNum(args: unknown, key: string): number {
  if (args !== null && typeof args === 'object' && key in (args as object)) {
    const v = (args as Record<string, unknown>)[key];
    return typeof v === 'number' ? v : 0;
  }
  return 0;
}

// ---- Internal lean shapes (avoid as-unknown-as chains throughout) ----

interface LeanCampaign {
  campaignId: number;
  vault: string;
  title: string;
  status: string;
  raiseTarget: string;
  milestones: { index: number; pctBps: number; status: string }[];
}
interface LeanAnalytics {
  campaignId: number;
  contributorCount: number;
  totalRaised: string;
  milestonesReleased: number;
  milestonesFailed: number;
}
interface LeanEvent {
  campaignId: number;
  blockNumber: number;
  txHash: string;
  args: unknown;
}
interface LeanVote {
  campaignId: number;
  proposalId: string;
  support: number;
  weight: string;
  txHash: string;
  blockNumber: number;
}

// ---- Mongo implementation ----

export class MongoDashboardStore implements DashboardStore {
  async founder(address: string): Promise<FounderRow[]> {
    const addr = address.toLowerCase();
    const cDocs = (await CampaignModel.find({ founder: addr })
      .sort({ campaignId: 1 })
      .lean()) as unknown as LeanCampaign[];
    if (!cDocs.length) return [];

    const ids = cDocs.map((c) => c.campaignId);
    const filter: Record<string, unknown> = { campaignId: { $in: ids } };
    const releaseFilter: Record<string, unknown> = {
      campaignId: { $in: ids },
      type: 'MilestoneReleased',
    };

    const [aDocs, eDocs] = await Promise.all([
      AnalyticsModel.find(filter).lean() as unknown as Promise<LeanAnalytics[]>,
      EventModel.find(releaseFilter).lean() as unknown as Promise<LeanEvent[]>,
    ]);

    const aMap = new Map(aDocs.map((a) => [a.campaignId, a]));
    const rMap = new Map<number, ReleaseRow[]>();
    for (const e of eDocs) {
      const list = rMap.get(e.campaignId) ?? [];
      list.push({ index: argNum(e.args, 'index'), blockNumber: e.blockNumber, txHash: e.txHash });
      rMap.set(e.campaignId, list);
    }

    return cDocs.map((c) => {
      const a = aMap.get(c.campaignId);
      return {
        campaignId: c.campaignId,
        vault: c.vault,
        title: c.title,
        status: c.status,
        raiseTarget: c.raiseTarget,
        totalRaised: a?.totalRaised ?? '0',
        contributorCount: a?.contributorCount ?? 0,
        milestonesReleased: a?.milestonesReleased ?? 0,
        milestonesFailed: a?.milestonesFailed ?? 0,
        milestones: c.milestones.map((m) => ({
          index: m.index,
          pctBps: m.pctBps,
          status: m.status,
        })),
        releases: rMap.get(c.campaignId) ?? [],
      };
    });
  }

  async investor(address: string): Promise<InvestorData> {
    const addr = address.toLowerCase();
    // Dotted-path query on Mixed args.investor — needs a sparse index in prod (#33).
    const contribFilter: Record<string, unknown> = { type: 'Contributed', 'args.investor': addr };

    const [eDocs, vDocs] = await Promise.all([
      EventModel.find(contribFilter).sort({ blockNumber: -1 }).lean() as unknown as Promise<
        LeanEvent[]
      >,
      VoteModel.find({ voter: addr }).sort({ blockNumber: -1 }).lean() as unknown as Promise<
        LeanVote[]
      >,
    ]);

    // Collect campaignIds to batch-fetch campaign metadata (vault/title/status).
    const contribCids = new Set(eDocs.map((e) => e.campaignId));
    const allCids = [...new Set([...contribCids, ...vDocs.map((v) => v.campaignId)])];
    const cFilter: Record<string, unknown> = { campaignId: { $in: allCids } };
    const cDocs = allCids.length
      ? ((await CampaignModel.find(cFilter).lean()) as unknown as LeanCampaign[])
      : [];
    const cMap = new Map(cDocs.map((c) => [c.campaignId, c]));
    const camp = (id: number): Pick<LeanCampaign, 'vault' | 'title' | 'status'> =>
      cMap.get(id) ?? { vault: '', title: '', status: '' };

    const contributions: ContribRow[] = eDocs.map((e) => ({
      campaignId: e.campaignId,
      vault: camp(e.campaignId).vault,
      title: camp(e.campaignId).title,
      amount: argStr(e.args, 'amount'),
      votesMinted: argStr(e.args, 'votesMinted'),
      blockNumber: e.blockNumber,
      txHash: e.txHash,
    }));

    const votes: VoteRow[] = vDocs.map((v) => ({
      campaignId: v.campaignId,
      vault: camp(v.campaignId).vault,
      title: camp(v.campaignId).title,
      proposalId: v.proposalId,
      support: v.support,
      weight: v.weight,
      blockNumber: v.blockNumber,
      txHash: v.txHash,
    }));

    // Display-only: campaigns the caller contributed to that flipped to 'failed'.
    const refundable: RefundRow[] = [...contribCids]
      .map((id) => cMap.get(id))
      .filter((c): c is LeanCampaign => c !== undefined && c.status === 'failed')
      .map((c) => ({ campaignId: c.campaignId, vault: c.vault, title: c.title, status: c.status }));

    return { contributions, votes, refundable };
  }
}

// ---- Seed types + InMemory store (tests inject these) ----

export interface SeedCampaign {
  campaignId: number;
  vault: string;
  title: string;
  status: string;
  raiseTarget: string;
  founder: string;
  milestones: MilestoneSlim[];
}
export interface SeedAnalytics {
  campaignId: number;
  contributorCount: number;
  totalRaised: string;
  milestonesReleased: number;
  milestonesFailed: number;
}
export interface SeedEvent {
  campaignId: number;
  type: string;
  txHash: string;
  blockNumber: number;
  args: Record<string, unknown>;
}
export interface SeedVote {
  campaignId: number;
  proposalId: string;
  voter: string;
  support: number;
  weight: string;
  txHash: string;
  blockNumber: number;
}

export class InMemoryDashboardStore implements DashboardStore {
  constructor(
    private readonly campaigns: SeedCampaign[] = [],
    private readonly analytics: SeedAnalytics[] = [],
    private readonly events: SeedEvent[] = [],
    private readonly votes: SeedVote[] = [],
  ) {}

  async founder(address: string): Promise<FounderRow[]> {
    const addr = address.toLowerCase();
    return this.campaigns
      .filter((c) => c.founder.toLowerCase() === addr)
      .sort((a, b) => a.campaignId - b.campaignId)
      .map((c) => {
        const a = this.analytics.find((x) => x.campaignId === c.campaignId);
        const releases = this.events
          .filter((e) => e.campaignId === c.campaignId && e.type === 'MilestoneReleased')
          .map((e) => ({
            index: typeof e.args['index'] === 'number' ? e.args['index'] : 0,
            blockNumber: e.blockNumber,
            txHash: e.txHash,
          }));
        return {
          campaignId: c.campaignId,
          vault: c.vault,
          title: c.title,
          status: c.status,
          raiseTarget: c.raiseTarget,
          totalRaised: a?.totalRaised ?? '0',
          contributorCount: a?.contributorCount ?? 0,
          milestonesReleased: a?.milestonesReleased ?? 0,
          milestonesFailed: a?.milestonesFailed ?? 0,
          milestones: c.milestones,
          releases,
        };
      });
  }

  async investor(address: string): Promise<InvestorData> {
    const addr = address.toLowerCase();
    const contribEvts = this.events
      .filter(
        (e) => e.type === 'Contributed' && String(e.args['investor'] ?? '').toLowerCase() === addr,
      )
      .sort((a, b) => b.blockNumber - a.blockNumber);
    const myVotes = this.votes
      .filter((v) => v.voter.toLowerCase() === addr)
      .sort((a, b) => b.blockNumber - a.blockNumber);

    const camp = (id: number) => this.campaigns.find((c) => c.campaignId === id);

    const contributions: ContribRow[] = contribEvts.map((e) => ({
      campaignId: e.campaignId,
      vault: camp(e.campaignId)?.vault ?? '',
      title: camp(e.campaignId)?.title ?? '',
      amount: String(e.args['amount'] ?? '0'),
      votesMinted: String(e.args['votesMinted'] ?? '0'),
      blockNumber: e.blockNumber,
      txHash: e.txHash,
    }));

    const votes: VoteRow[] = myVotes.map((v) => ({
      campaignId: v.campaignId,
      vault: camp(v.campaignId)?.vault ?? '',
      title: camp(v.campaignId)?.title ?? '',
      proposalId: v.proposalId,
      support: v.support,
      weight: v.weight,
      blockNumber: v.blockNumber,
      txHash: v.txHash,
    }));

    const contribCids = new Set(contribEvts.map((e) => e.campaignId));
    const refundable: RefundRow[] = [...contribCids]
      .map(camp)
      .filter((c): c is SeedCampaign => c !== undefined && c.status === 'failed')
      .map((c) => ({ campaignId: c.campaignId, vault: c.vault, title: c.title, status: c.status }));

    return { contributions, votes, refundable };
  }
}
