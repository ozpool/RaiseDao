import type { AuthClaims } from '../auth/jwt.js';

// Attach the verified JWT claims to the Express request.
declare global {
  namespace Express {
    interface Request {
      user?: AuthClaims;
    }
  }
}

export {};
