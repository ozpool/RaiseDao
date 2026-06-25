import { ProposalModel } from '../models/index.js';

/** What a route supplies when recording a milestone proposal. The proposer is
 *  taken from the session and re-checked against the campaign founder; it is
 *  never trusted from the body. */
export interface ProposalInput {
  campaignId: number;
  vault: string;
  governor: string;
  proposalId: string;
  milestoneIndex: number;
  descriptionHash: string;
  description: string;
  evidenceCid: string;
  proposer: string;
  txHash: string;
}

/** The investor-facing read shape: the input fields plus the created time. */
export interface ProposalRecord extends ProposalInput {
  createdAt?: string;
}

/** Persistence for proposals, behind an interface so the route can be tested
 *  against an in-memory store with no MongoDB. */
export interface ProposalStore {
  create(input: ProposalInput): Promise<ProposalRecord>;
  listByVault(vault: string): Promise<ProposalRecord[]>;
}

function toRecord(input: ProposalInput, createdAt?: Date | string): ProposalRecord {
  return {
    campaignId: input.campaignId,
    vault: input.vault.toLowerCase(),
    governor: input.governor.toLowerCase(),
    proposalId: input.proposalId,
    milestoneIndex: input.milestoneIndex,
    descriptionHash: input.descriptionHash.toLowerCase(),
    description: input.description,
    evidenceCid: input.evidenceCid,
    proposer: input.proposer.toLowerCase(),
    txHash: input.txHash.toLowerCase(),
    ...(createdAt ? { createdAt: new Date(createdAt).toISOString() } : {}),
  };
}

export class MongoProposalStore implements ProposalStore {
  /** Idempotent by proposalId — a double-submit of the same on-chain proposal
   *  returns the existing record rather than erroring on the unique index. */
  async create(input: ProposalInput): Promise<ProposalRecord> {
    const existing = await ProposalModel.findOne({ proposalId: input.proposalId }).lean();
    if (existing)
      return toRecord(
        existing as unknown as ProposalInput,
        (existing as { createdAt?: Date }).createdAt,
      );
    const doc = await ProposalModel.create(toRecord(input));
    return toRecord(
      doc.toObject() as unknown as ProposalInput,
      (doc as { createdAt?: Date }).createdAt,
    );
  }

  async listByVault(vault: string): Promise<ProposalRecord[]> {
    const docs = await ProposalModel.find({ vault: vault.toLowerCase() })
      .sort({ milestoneIndex: 1 })
      .lean();
    return docs.map((d) =>
      toRecord(d as unknown as ProposalInput, (d as { createdAt?: Date }).createdAt),
    );
  }
}

/** In-memory store for tests; keeps the saved records for assertions. */
export class InMemoryProposalStore implements ProposalStore {
  readonly records: ProposalRecord[] = [];

  async create(input: ProposalInput): Promise<ProposalRecord> {
    const existing = this.records.find((r) => r.proposalId === input.proposalId);
    if (existing) return existing;
    const record = toRecord(input);
    this.records.push(record);
    return record;
  }

  async listByVault(vault: string): Promise<ProposalRecord[]> {
    return this.records
      .filter((r) => r.vault === vault.toLowerCase())
      .sort((a, b) => a.milestoneIndex - b.milestoneIndex);
  }
}
