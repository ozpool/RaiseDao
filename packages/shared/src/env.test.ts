import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { evmAddress, httpUrl, parseEnv } from './env';

describe('evmAddress', () => {
  it('accepts a valid 20-byte address', () => {
    const addr = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
    expect(evmAddress.parse(addr)).toBe(addr);
  });

  it('rejects a malformed address', () => {
    expect(() => evmAddress.parse('0x123')).toThrow();
  });
});

describe('parseEnv', () => {
  const schema = z.object({ RPC_URL: httpUrl, FACTORY_ADDR: evmAddress });

  it('returns typed data for valid input', () => {
    const env = parseEnv(schema, {
      RPC_URL: 'https://example.com/rpc',
      FACTORY_ADDR: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    });
    expect(env.RPC_URL).toBe('https://example.com/rpc');
  });

  it('throws a readable error listing invalid keys', () => {
    expect(() => parseEnv(schema, { RPC_URL: 'not-a-url' })).toThrow(/Invalid environment/u);
  });
});
