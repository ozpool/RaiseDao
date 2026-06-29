import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import type { CampaignFilters, CampaignStore } from '../campaigns/store.js';
import type { FounderVerifier } from '../campaigns/verify.js';

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'must be a 20-byte hex address');
const decimal = z.string().regex(/^\d+(\.\d+)?$/, 'must be a non-negative number');

/** What the founder's client posts right after a successful on-chain deploy: the
 *  addresses read from the receipt plus the draft's display metadata. founder is
 *  taken from the session, never the body, and verified/featured/demo are never
 *  client-settable. */
const createBody = z
  .object({
    campaignId: z.number().int().min(0),
    vault: address,
    token: address,
    governor: address,
    title: z.string().min(1).max(120),
    summary: z.string().max(2000).default(''),
    image: z.string().max(2048).default(''),
    raiseTarget: decimal,
    fundingDeadline: z.number().int().min(0),
    milestones: z
      .array(
        z.object({
          pctBps: z.number().int().min(0).max(10000),
          deadline: z.number().int().min(0),
        }),
      )
      .min(1, 'at least one milestone is required'),
  })
  .superRefine((data, ctx) => {
    const sum = data.milestones.reduce((acc, m) => acc + m.pctBps, 0);
    if (sum !== 10000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['milestones'],
        message: 'milestone releases must sum to 100%',
      });
    }
  });

/** Public campaign browse (#25) + the post-deploy persistence bridge (#27). The
 *  list/detail reads are public; creating a campaign requires the founder's
 *  session AND on-chain proof that the caller is the vault's founder, so a
 *  signed-in user can't claim-jack a vault address they don't own. */
export function campaignsRouter(store: CampaignStore, verifyFounder: FounderVerifier): Router {
  const router = Router();

  router.get('/campaigns', async (req: Request, res: Response) => {
    const { q, city, category, verified, status } = req.query;
    const filters: CampaignFilters = {};
    if (typeof q === 'string' && q.trim()) filters.q = q.trim();
    if (typeof city === 'string' && city) filters.city = city;
    if (typeof category === 'string' && category) filters.category = category;
    if (typeof status === 'string' && status) filters.status = status;
    if (verified === 'true') filters.verified = true;
    else if (verified === 'false') filters.verified = false;

    const campaigns = await store.list(filters);
    res.status(200).json({ campaigns });
  });

  router.get('/campaigns/:vault', async (req: Request, res: Response) => {
    const campaign = await store.getByVault(req.params.vault!);
    if (!campaign) {
      res.status(404).json({ error: 'campaign not found' });
      return;
    }
    res.status(200).json(campaign);
  });

  router.post('/campaigns', requireAuth, async (req: Request, res: Response) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid campaign' });
      return;
    }
    const b = parsed.data;

    // The session proves who is calling; the chain proves they own this vault.
    // Reject (fail closed) unless the vault's on-chain founder is the caller.
    const caller = req.user!.address.toLowerCase();
    const onchainFounder = await verifyFounder(b.vault);
    if (!onchainFounder) {
      res.status(400).json({ error: 'vault is not a deployed campaign' });
      return;
    }
    if (onchainFounder !== caller) {
      res.status(403).json({ error: 'only the vault founder can register this campaign' });
      return;
    }

    const campaign = await store.create({
      campaignId: b.campaignId,
      vault: b.vault,
      token: b.token,
      governor: b.governor,
      founder: caller,
      status: 'funding',
      title: b.title,
      summary: b.summary,
      image: b.image,
      city: '', // the wizard doesn't collect these yet; left blank, not faked
      category: '',
      verified: false,
      featured: false,
      demo: false,
      raiseTarget: b.raiseTarget,
      totalRaised: '0',
      fundingDeadline: b.fundingDeadline,
      milestones: b.milestones.map((m, index) => ({
        index,
        pctBps: m.pctBps,
        status: 'pending',
        deadline: m.deadline,
      })),
    });
    res.status(201).json(campaign);
  });

  return router;
}
