import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import type { CampaignStore } from '../campaigns/store.js';
import type { ProposalStore } from '../proposals/store.js';

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'must be a 20-byte hex address');
const hash32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'must be a 32-byte hex hash');

/** What the founder's client posts right after the propose tx confirms: the
 *  proposalId parsed from the ProposalCreated event, the milestone it targets,
 *  and the description (with its evidence CID) that produced the descriptionHash.
 *  proposer is taken from the session and re-checked against the campaign founder. */
const createBody = z.object({
  campaignId: z.number().int().min(0),
  vault: address,
  governor: address,
  proposalId: z.string().regex(/^\d+$/, 'proposalId must be a numeric string'),
  milestoneIndex: z.number().int().min(0),
  descriptionHash: hash32,
  description: z.string().min(1).max(2000),
  evidenceCid: z.string().max(200).default(''),
  txHash: hash32,
});

/** Milestone proposals (#29). Listing is public so any investor can find the
 *  open ballot; creating requires the founder's session AND that the caller is
 *  the campaign's on-chain-verified founder (the governor itself also rejects
 *  non-founder proposals, so a persisted record can't outrun the chain). */
export function proposalsRouter(store: ProposalStore, campaigns: CampaignStore): Router {
  const router = Router();

  router.get('/proposals', async (req: Request, res: Response) => {
    const vault = req.query.vault;
    if (typeof vault !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(vault)) {
      res.status(400).json({ error: 'a valid vault address is required' });
      return;
    }
    const proposals = await store.listByVault(vault);
    res.status(200).json({ proposals });
  });

  router.post('/proposals', requireAuth, async (req: Request, res: Response) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid proposal' });
      return;
    }
    const b = parsed.data;
    const caller = req.user!.address.toLowerCase();

    const campaign = await campaigns.getByVault(b.vault);
    if (!campaign) {
      res.status(404).json({ error: 'campaign not found for this vault' });
      return;
    }
    if (campaign.founder.toLowerCase() !== caller) {
      res.status(403).json({ error: 'only the campaign founder can record a proposal' });
      return;
    }
    if (b.milestoneIndex >= campaign.milestones.length) {
      res.status(400).json({ error: 'milestoneIndex is out of range for this campaign' });
      return;
    }

    const proposal = await store.create({
      campaignId: b.campaignId,
      vault: b.vault,
      governor: b.governor,
      proposalId: b.proposalId,
      milestoneIndex: b.milestoneIndex,
      descriptionHash: b.descriptionHash,
      description: b.description,
      evidenceCid: b.evidenceCid,
      proposer: caller,
      txHash: b.txHash,
    });
    res.status(201).json(proposal);
  });

  return router;
}
