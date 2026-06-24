import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';

export type Role = 'public' | 'investor' | 'founder' | 'admin';

export interface AuthClaims {
  address: string;
  roles: Role[];
}

export function signToken(claims: AuthClaims): string {
  return jwt.sign(claims, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): AuthClaims {
  const decoded = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload & AuthClaims;
  return { address: decoded.address, roles: decoded.roles };
}
