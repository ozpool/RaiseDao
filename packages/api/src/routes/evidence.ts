import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { logger } from '../logger.js';
import { pinWithFallback, type PinProvider } from '../evidence/pin.js';
import type { EvidenceStore } from '../evidence/store.js';

export interface EvidenceDeps {
  providers: PinProvider[];
  store: EvidenceStore;
  maxBytes: number;
}

const metaBody = z.object({
  campaignId: z.coerce.number().int().nonnegative(),
  milestoneIndex: z.coerce.number().int().nonnegative(),
});

/** POST /evidence — pin a milestone evidence file to IPFS and record its CID. */
export function evidenceRouter(deps: EvidenceDeps): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: deps.maxBytes },
  });

  // Run multer ourselves so an over-cap upload becomes a clean 413 rather than
  // a generic 500 from the error handler.
  const receiveFile = (req: Request, res: Response, next: NextFunction): void => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'file exceeds the size limit' });
        return;
      }
      if (err) {
        next(err);
        return;
      }
      next();
    });
  };

  router.post('/evidence', requireAuth, receiveFile, async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'file is required' });
      return;
    }
    const parsed = metaBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'campaignId and milestoneIndex are required' });
      return;
    }

    let result;
    try {
      result = await pinWithFallback(
        deps.providers,
        {
          buffer: req.file.buffer,
          filename: req.file.originalname,
          contentType: req.file.mimetype,
        },
        logger,
      );
    } catch (err) {
      logger.error({ err }, 'evidence pinning failed');
      res.status(502).json({ error: 'failed to pin evidence to IPFS' });
      return;
    }

    const { campaignId, milestoneIndex } = parsed.data;
    await deps.store.save({
      campaignId,
      milestoneIndex,
      cid: result.cid,
      provider: result.provider,
      filename: req.file.originalname,
      size: req.file.size,
      uploadedBy: req.user!.address,
    });

    res.status(201).json({
      cid: result.cid,
      provider: result.provider,
      campaignId,
      milestoneIndex,
    });
  });

  // Public read: investors review a campaign's evidence by CID, no auth. The
  // CIDs are world-readable on IPFS anyway, so gating the listing buys nothing.
  router.get('/evidence', async (req: Request, res: Response) => {
    const campaignId = Number(req.query.campaignId);
    if (!Number.isInteger(campaignId) || campaignId < 0) {
      res.status(400).json({ error: 'a non-negative campaignId is required' });
      return;
    }
    const evidence = await deps.store.listByCampaign(campaignId);
    res.status(200).json({ evidence });
  });

  return router;
}
