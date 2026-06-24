import { describe, it, expect } from 'vitest';
import { pinWithFallback, type PinFile, type PinProvider } from './pin.js';

const file: PinFile = { buffer: Buffer.from('evidence'), filename: 'proof.pdf' };

/** A provider that either returns a CID or throws, with a call counter. */
function fakeProvider(
  name: string,
  behaviour: { cid?: string; fail?: string },
): PinProvider & {
  calls: number;
} {
  return {
    name,
    calls: 0,
    async pin() {
      this.calls += 1;
      if (behaviour.fail) throw new Error(behaviour.fail);
      return behaviour.cid!;
    },
  };
}

describe('pinWithFallback', () => {
  it('returns the CID from the first provider and never calls the second', async () => {
    const first = fakeProvider('pinata', { cid: 'cid-1' });
    const second = fakeProvider('web3.storage', { cid: 'cid-2' });

    const result = await pinWithFallback([first, second], file);

    expect(result).toEqual({ cid: 'cid-1', provider: 'pinata' });
    expect(first.calls).toBe(1);
    expect(second.calls).toBe(0);
  });

  it('falls back to the second provider when the first throws', async () => {
    const first = fakeProvider('pinata', { fail: 'pinata down' });
    const second = fakeProvider('web3.storage', { cid: 'cid-2' });

    const result = await pinWithFallback([first, second], file);

    expect(result).toEqual({ cid: 'cid-2', provider: 'web3.storage' });
    expect(first.calls).toBe(1);
    expect(second.calls).toBe(1);
  });

  it('throws loudly listing every failure when all providers fail', async () => {
    const first = fakeProvider('pinata', { fail: 'pinata down' });
    const second = fakeProvider('web3.storage', { fail: 'w3s down' });

    await expect(pinWithFallback([first, second], file)).rejects.toThrow(
      /all IPFS pin providers failed.*pinata down.*w3s down/,
    );
  });

  it('throws when no providers are configured', async () => {
    await expect(pinWithFallback([], file)).rejects.toThrow(/no IPFS pin providers/);
  });
});
