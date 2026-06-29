import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import type { DraftStore } from '../drafts/store.js';

const decimal = z.string().regex(/^\d+(\.\d+)?$/, 'must be a non-negative number');

const createBody = z
  .object({
    title: z.string().min(1).max(120),
    summary: z.string().max(2000).default(''),
    image: z.string().max(2048).default(''),
    raiseTarget: decimal,
    fundingDurationDays: z.coerce.number().int().min(1).max(365),
    tokenName: z.string().min(1).max(60),
    tokenSymbol: z.string().min(1).max(12),
    tokenSupply: decimal,
    milestones: z
      .array(
        z.object({ title: z.string().min(1).max(200), pctBps: z.number().int().min(0).max(10000) }),
      )
      .min(1, 'at least one milestone is required'),
  })
  // The release shares must add up to exactly 100% (10000 bps).
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

/** Founder draft routes (#23). Drafts belong to the signed-in wallet; a draft is
 *  only ever readable by its founder. The on-chain deploy (#24) consumes a draft
 *  by id. */
export function draftsRouter(store: DraftStore): Router {
  const router = Router();

  router.post('/drafts', requireAuth, async (req: Request, res: Response) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid draft' });
      return;
    }
    const draft = await store.create({ ...parsed.data, founder: req.user!.address });
    res.status(201).json(draft);
  });

  router.get('/drafts', requireAuth, async (req: Request, res: Response) => {
    const drafts = await store.listByFounder(req.user!.address);
    res.status(200).json(drafts);
  });

  router.get('/drafts/:id', requireAuth, async (req: Request, res: Response) => {
    const draft = await store.getById(req.params.id!);
    if (!draft) {
      res.status(404).json({ error: 'draft not found' });
      return;
    }
    if (draft.founder !== req.user!.address) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    res.status(200).json(draft);
  });

  return router;
}
