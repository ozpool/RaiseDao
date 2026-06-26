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
import { tallyRouter } from './routes/tally.js';
import { MongoTallyStore, type TallyStore } from './tally/store.js';
import { dashboardRouter } from './routes/dashboard.js';
import { MongoDashboardStore, type DashboardStore } from './dashboard/store.js';
import { adminRouter } from './routes/admin.js';
import { MongoAdminStore, type AdminStore } from './admin/store.js';
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
  /** Override the live-tally reads (tests inject an in-memory store). */
  tallyStore?: TallyStore;
  /** Override the dashboard read layer (tests inject an in-memory store). */
  dashboardStore?: DashboardStore;
  /** Override the admin moderation layer (tests inject an in-memory store). */
  adminStore?: AdminStore;
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
  const tallyStore = deps.tallyStore ?? new MongoTallyStore();
  const dashboardStore = deps.dashboardStore ?? new MongoDashboardStore();
  const adminStore = deps.adminStore ?? new MongoAdminStore();
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
  app.use(tallyRouter(tallyStore));
  app.use(dashboardRouter(dashboardStore));
  app.use(adminRouter(adminStore));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
