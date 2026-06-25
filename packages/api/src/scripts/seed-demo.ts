import { config } from '../config.js';
import { connectDB, disconnectDB } from '../db.js';
import { CampaignModel } from '../models/index.js';
import { demoCampaigns } from '../campaigns/demo.js';
import { logger } from '../logger.js';

/**
 * Seed the browse grid with badged demo campaigns so the page is reviewable
 * before real on-chain campaigns exist. Idempotent (upsert by campaignId).
 *
 *   pnpm -F @raisedao/api seed:demo
 */
async function main() {
  await connectDB(config.MONGODB_URI);
  const demos = demoCampaigns();
  for (const c of demos) {
    await CampaignModel.updateOne({ campaignId: c.campaignId }, { $set: c }, { upsert: true });
  }
  logger.info(`Seeded ${demos.length} demo campaigns`);
  await disconnectDB();
}

main().catch((err) => {
  logger.error({ err }, 'demo seed failed');
  process.exitCode = 1;
});
