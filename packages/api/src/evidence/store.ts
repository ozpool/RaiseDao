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

/** Persistence for evidence records, behind an interface so the route can be
 *  tested against an in-memory store with no MongoDB. */
export interface EvidenceStore {
  save(input: EvidenceInput): Promise<Evidence>;
}

export class MongoEvidenceStore implements EvidenceStore {
  async save(input: EvidenceInput): Promise<Evidence> {
    return EvidenceModel.create(input);
  }
}

/** In-memory store for tests; keeps the saved records for assertions. */
export class InMemoryEvidenceStore implements EvidenceStore {
  readonly records: EvidenceInput[] = [];

  async save(input: EvidenceInput): Promise<Evidence> {
    this.records.push(input);
    return input as unknown as Evidence;
  }
}
