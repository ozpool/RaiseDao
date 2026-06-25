import { EvidenceModel, type Evidence } from '../models/index.js';

/** The fields a route supplies when recording a pinned file. */
export interface EvidenceInput {
  campaignId: number;
  milestoneIndex: number;
  cid: string;
  provider: string;
  filename: string;
  size: number;
  uploadedBy: string;
}

/** What the investor-facing read returns: the input fields plus the pin time, so
 *  the viewer can show newest-first without exposing the Mongoose document. */
export interface EvidenceRecord extends EvidenceInput {
  createdAt?: string;
}

/** Persistence for evidence records, behind an interface so the route can be
 *  tested against an in-memory store with no MongoDB. */
export interface EvidenceStore {
  save(input: EvidenceInput): Promise<Evidence>;
  /** Every pinned file for a campaign, newest first, across all milestones. */
  listByCampaign(campaignId: number): Promise<EvidenceRecord[]>;
}

function toRecord(input: EvidenceInput, createdAt?: Date | string): EvidenceRecord {
  return {
    campaignId: input.campaignId,
    milestoneIndex: input.milestoneIndex,
    cid: input.cid,
    provider: input.provider,
    filename: input.filename,
    size: input.size,
    uploadedBy: input.uploadedBy,
    ...(createdAt ? { createdAt: new Date(createdAt).toISOString() } : {}),
  };
}

export class MongoEvidenceStore implements EvidenceStore {
  async save(input: EvidenceInput): Promise<Evidence> {
    return EvidenceModel.create(input);
  }

  async listByCampaign(campaignId: number): Promise<EvidenceRecord[]> {
    const docs = await EvidenceModel.find({ campaignId }).sort({ createdAt: -1 }).lean();
    return docs.map((d) =>
      toRecord(d as unknown as EvidenceInput, (d as { createdAt?: Date }).createdAt),
    );
  }
}

/** In-memory store for tests; keeps the saved records for assertions. */
export class InMemoryEvidenceStore implements EvidenceStore {
  readonly records: EvidenceInput[] = [];

  async save(input: EvidenceInput): Promise<Evidence> {
    this.records.push(input);
    return input as unknown as Evidence;
  }

  async listByCampaign(campaignId: number): Promise<EvidenceRecord[]> {
    return this.records
      .filter((r) => r.campaignId === campaignId)
      .reverse()
      .map((r) => toRecord(r));
  }
}
