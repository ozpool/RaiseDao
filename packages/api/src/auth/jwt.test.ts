import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from './jwt.js';

describe('JWT', () => {
  it('round-trips claims', () => {
    const token = signToken({ address: '0xabc', roles: ['investor', 'admin'] });
    const claims = verifyToken(token);
    expect(claims.address).toBe('0xabc');
    expect(claims.roles).toEqual(['investor', 'admin']);
  });

  it('rejects a tampered token', () => {
    const token = signToken({ address: '0xabc', roles: ['investor'] });
    expect(() => verifyToken(token + 'x')).toThrow();
  });
});
