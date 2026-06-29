import { config } from '../config.js';
import { connectDB, disconnectDB } from '../db.js';
import { CampaignModel } from '../models/index.js';
import { logger } from '../logger.js';

/** Seed a set of rich, varied DEMO campaigns so the browse + detail experience
 *  looks alive for a walkthrough. Demo campaigns are badged and contribute-
 *  disabled in the UI, so they're safe to show without any on-chain action.
 *  Idempotent: clears existing demo docs first, then inserts the fresh set.
 *
 *  Run: pnpm -F @raisedao/api exec tsx src/scripts/seedDemo.ts
 */

const DAY = 86400;
const now = Math.floor(Date.now() / 1000);

interface Demo {
  id: number;
  title: string;
  summary: string;
  city: string;
  category: string;
  target: number; // soft goal, plain USD
  raised: number; // plain USD
  status: 'funding' | 'active' | 'succeeded';
  verified: boolean;
  featured: boolean;
  milestones: number; // count
  released: number; // how many already released
}

const DEMOS: Demo[] = [
  {
    id: 9001,
    title: 'Helix Bio',
    summary: 'An open lab-on-a-chip for at-home blood panels — results in minutes, not days.',
    city: 'Boston',
    category: 'Biotech',
    target: 250_000,
    raised: 181_000,
    status: 'funding',
    verified: true,
    featured: true,
    milestones: 4,
    released: 2,
  },
  {
    id: 9002,
    title: 'Aurora Grid',
    summary: 'Neighbourhood-scale solar storage that lets streets trade their own power.',
    city: 'Berlin',
    category: 'Energy',
    target: 400_000,
    raised: 184_000,
    status: 'funding',
    verified: true,
    featured: false,
    milestones: 3,
    released: 1,
  },
  {
    id: 9003,
    title: 'Vault Labs',
    summary: 'A continuous auditor for smart contracts — every deploy gets a live risk report.',
    city: 'Remote',
    category: 'Security',
    target: 150_000,
    raised: 137_000,
    status: 'funding',
    verified: true,
    featured: false,
    milestones: 5,
    released: 3,
  },
  {
    id: 9004,
    title: 'Terra Mesh',
    summary: 'Solar soil sensors that text smallholder farmers when their fields need water.',
    city: 'Nairobi',
    category: 'Hardware',
    target: 120_000,
    raised: 34_000,
    status: 'funding',
    verified: false,
    featured: false,
    milestones: 4,
    released: 0,
  },
  {
    id: 9005,
    title: 'Lumen Studio',
    summary: 'A worker-owned animation house funding its first feature, frame by frame.',
    city: 'Lisbon',
    category: 'Media',
    target: 300_000,
    raised: 178_000,
    status: 'funding',
    verified: true,
    featured: false,
    milestones: 3,
    released: 1,
  },
  {
    id: 9006,
    title: 'NovaPay',
    summary: 'Cross-border payroll for remote teams, settled on-chain in stablecoins.',
    city: 'Singapore',
    category: 'Fintech',
    target: 500_000,
    raised: 72_000,
    status: 'funding',
    verified: false,
    featured: false,
    milestones: 4,
    released: 0,
  },
];

/** Deterministic 40-hex address from an id + role offset. */
function addr(id: number, salt: number): string {
  return '0x' + (BigInt(id) * 1000n + BigInt(salt)).toString(16).padStart(40, '0');
}

function buildMilestones(count: number, released: number) {
  const per = Math.floor(10000 / count);
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    pctBps: i === count - 1 ? 10000 - per * (count - 1) : per,
    status: i < released ? 'released' : 'pending',
    deadline: now + (i + 1) * 30 * DAY,
  }));
}

async function main() {
  await connectDB(config.MONGODB_URI);

  const removed = await CampaignModel.deleteMany({ demo: true });
  logger.info({ removed: removed.deletedCount }, 'cleared existing demo campaigns');

  const docs = DEMOS.map((d) => ({
    campaignId: d.id,
    vault: addr(d.id, 1),
    token: addr(d.id, 2),
    governor: addr(d.id, 3),
    founder: addr(d.id, 4),
    status: d.status,
    totalRaised: String(d.raised),
    raiseTarget: String(d.target),
    protocolFeeBps: 100,
    fundingDeadline: now + 45 * DAY,
    milestones: buildMilestones(d.milestones, d.released),
    title: d.title,
    summary: d.summary,
    // A stable, distinct cover photo per campaign (deterministic seed).
    image: `https://picsum.photos/seed/raisedao${d.id}/1000/560`,
    city: d.city,
    category: d.category,
    verified: d.verified,
    featured: d.featured,
    demo: true,
    hidden: false,
    createdAtBlock: 0,
  }));

  await CampaignModel.insertMany(docs);
  logger.info({ inserted: docs.length }, 'seeded demo campaigns');

  await disconnectDB();
}

main().catch((err) => {
  logger.error({ err }, 'demo seed failed');
  process.exit(1);
});
