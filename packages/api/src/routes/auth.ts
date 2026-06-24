import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { generateNonce, verifySiwe, addressFromMessage } from '../auth/siwe.js';
import { signToken } from '../auth/jwt.js';
import { requireAuth } from '../auth/middleware.js';
import type { AuthStore } from '../auth/store.js';

const nonceBody = z.object({ address: z.string().min(1) });
const verifyBody = z.object({ message: z.string().min(1), signature: z.string().min(1) });

/** SIWE challenge/verify routes, parameterised by the auth store so tests can
 *  inject an in-memory implementation. */
export function authRouter(store: AuthStore): Router {
  const router = Router();

  // Step 1: client asks for a nonce to embed in the SIWE message it will sign.
  router.post('/auth/nonce', async (req: Request, res: Response) => {
    const parsed = nonceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'address is required' });
      return;
    }
    const nonce = generateNonce();
    await store.saveNonce(parsed.data.address, nonce);
    res.status(200).json({ nonce });
  });

  // Step 2: client returns the signed message; we verify and issue a JWT.
  router.post('/auth/verify', async (req: Request, res: Response) => {
    const parsed = verifyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'message and signature are required' });
      return;
    }
    const { message, signature } = parsed.data;

    const claimed = addressFromMessage(message).toLowerCase();
    const expectedNonce = await store.takeNonce(claimed);
    if (!expectedNonce) {
      res.status(401).json({ error: 'No pending challenge for this address' });
      return;
    }

    try {
      await verifySiwe(message, signature, expectedNonce);
    } catch {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const user = await store.login(claimed);
    const token = signToken({ address: user.address, roles: user.roles });
    res.status(200).json({ token, address: user.address, roles: user.roles });
  });

  // The current session, derived from the bearer token.
  router.get('/auth/me', requireAuth, (req: Request, res: Response) => {
    res.status(200).json(req.user);
  });

  return router;
}
