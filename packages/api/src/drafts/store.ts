import { DraftModel } from '../models/index.js';

export interface DraftMilestoneInput {
  title: string;
  pctBps: number;
}

/** The fields the route supplies when a founder saves a draft. */
export interface DraftInput {
  founder: string;
  title: string;
  summary: string;
  raiseTarget: string;
  fundingDurationDays: number;
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: string;
  milestones: DraftMilestoneInput[];
}

/** A saved draft, with its id, as returned to clients. */
export interface DraftRecord extends DraftInput {
  id: string;
  status: 'draft';
}

/** Persistence for drafts, behind an interface so the route can be tested
 *  against an in-memory store with no MongoDB. */
export interface DraftStore {
  create(input: DraftInput): Promise<DraftRecord>;
  getById(id: string): Promise<DraftRecord | null>;
  listByFounder(founder: string): Promise<DraftRecord[]>;
}

interface DraftDoc extends DraftInput {
  id: string;
}

function toRecord(doc: DraftDoc): DraftRecord {
  return {
    id: doc.id,
    founder: doc.founder,
    title: doc.title,
    summary: doc.summary,
    raiseTarget: doc.raiseTarget,
    fundingDurationDays: doc.fundingDurationDays,
    tokenName: doc.tokenName,
    tokenSymbol: doc.tokenSymbol,
    tokenSupply: doc.tokenSupply,
    milestones: doc.milestones.map((m) => ({ title: m.title, pctBps: m.pctBps })),
    status: 'draft',
  };
}

export class MongoDraftStore implements DraftStore {
  async create(input: DraftInput): Promise<DraftRecord> {
    const doc = await DraftModel.create(input);
    return toRecord(doc as unknown as DraftDoc);
  }

  async getById(id: string): Promise<DraftRecord | null> {
    try {
      const doc = await DraftModel.findById(id);
      return doc ? toRecord(doc as unknown as DraftDoc) : null;
    } catch {
      // Malformed ObjectId — treat as not found rather than a 500.
      return null;
    }
  }

  async listByFounder(founder: string): Promise<DraftRecord[]> {
    const docs = await DraftModel.find({ founder }).sort({ updatedAt: -1 });
    return docs.map((d) => toRecord(d as unknown as DraftDoc));
  }
}

/** In-memory store for tests; ids are assigned sequentially. */
export class InMemoryDraftStore implements DraftStore {
  readonly records: DraftRecord[] = [];
  private seq = 0;

  async create(input: DraftInput): Promise<DraftRecord> {
    const record: DraftRecord = { ...input, id: String(++this.seq), status: 'draft' };
    this.records.push(record);
    return record;
  }

  async getById(id: string): Promise<DraftRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async listByFounder(founder: string): Promise<DraftRecord[]> {
    return this.records.filter((r) => r.founder === founder);
  }
}
