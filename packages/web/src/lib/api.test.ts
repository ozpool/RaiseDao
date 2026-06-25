import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './api';

interface Call {
  url: string | URL;
  init?: RequestInit;
}

/** Stub global fetch with a fixed response and record the calls (typed), so
 *  assertions read request shape without wrestling vi.fn's tuple inference. */
function mockFetch(status: number, body: unknown) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      calls.push({ url, init });
      return { ok: status >= 200 && status < 300, status, json: async () => body };
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('POSTs the nonce request with a JSON body and returns the payload', async () => {
    const calls = mockFetch(200, { nonce: 'abc123' });
    const result = await api.auth.nonce('0xAbC');

    expect(result).toEqual({ nonce: 'abc123' });
    const { url, init } = calls[0]!;
    expect(String(url)).toMatch(/\/auth\/nonce$/);
    expect(init).toMatchObject({ method: 'POST' });
    expect(JSON.parse(init!.body as string)).toEqual({ address: '0xAbC' });
    expect(init!.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('attaches the bearer token on authenticated calls', async () => {
    const calls = mockFetch(200, { address: '0xabc', roles: [] });
    await api.auth.me('jwt-token');

    expect(calls[0]!.init!.headers).toMatchObject({ Authorization: 'Bearer jwt-token' });
  });

  it('throws an ApiError carrying the status and the API error message', async () => {
    mockFetch(401, { error: 'No pending challenge for this address' });
    await expect(api.auth.verify('msg', 'sig')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'No pending challenge for this address',
    });
  });

  it('falls back to a generic message when the body has no error field', async () => {
    mockFetch(500, null);
    const err = await api.auth.me('t').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toContain('500');
  });
});
