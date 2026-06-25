import express, { type Express } from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { evidenceRouter, type EvidenceDeps } from './routes/evidence.js';
import { draftsRouter } from './routes/drafts.js';
import { campaignsRouter } from './routes/campaigns.js';
import { MongoAuthStore, type AuthStore } from './auth/store.js';
import { MongoEvidenceStore } from './evidence/store.js';
import { MongoDraftStore, type DraftStore } from './drafts/store.js';
import { MongoCampaignStore, type CampaignStore } from './campaigns/store.js';
import { proposalsRouter } from './routes/proposals.js';
import { MongoProposalStore, type ProposalStore } from './proposals/store.js';
import { ethersFounderVerifier, type FounderVerifier } from './campaigns/verify.js';
import { buildProviders } from './evidence/providers.js';
import { config } from './config.js';
import { notFound, errorHandler } from './middleware/error.js';

export interface AppDeps {
  /** Override the auth persistence (tests inject an in-memory store). */
  authStore?: AuthStore;
  /** Override the evidence pinning deps (tests inject fakes). */
  evidence?: EvidenceDeps;
  /** Override the draft persistence (tests inject an in-memory store). */
  draftStore?: DraftStore;
  /** Override the campaign read store (tests inject an in-memory store). */
  campaignStore?: CampaignStore;
  /** Override on-chain founder verification (tests inject a stub, no RPC). */
  campaignFounderVerifier?: FounderVerifier;
  /** Override the proposal persistence (tests inject an in-memory store). */
  proposalStore?: ProposalStore;
}

/** Build the Express app with no side effects (no listen, no DB), so tests can
 *  exercise it directly via supertest. */
export function createApp(deps: AppDeps = {}): Express {
  const authStore = deps.authStore ?? new MongoAuthStore();
  const evidence: EvidenceDeps = deps.evidence ?? {
    providers: buildProviders(config),
    store: new MongoEvidenceStore(),
    maxBytes: config.EVIDENCE_MAX_BYTES,
  };
  const draftStore = deps.draftStore ?? new MongoDraftStore();
  const campaignStore = deps.campaignStore ?? new MongoCampaignStore();
  const proposalStore = deps.proposalStore ?? new MongoProposalStore();
  const verifyFounder = deps.campaignFounderVerifier ?? ethersFounderVerifier(config.RPC_URL);
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(express.json());

  app.use(healthRouter);
  app.use(authRouter(authStore));
  app.use(evidenceRouter(evidence));
  app.use(draftsRouter(draftStore));
  app.use(campaignsRouter(campaignStore, verifyFounder));
  app.use(proposalsRouter(proposalStore, campaignStore));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
