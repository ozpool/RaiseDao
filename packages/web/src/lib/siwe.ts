import { createSiweMessage } from 'viem/siwe';

/** Build the EIP-4361 message the wallet will sign. We use viem's builder (viem
 *  is already in the bundle via wagmi) rather than the `siwe` package, which
 *  drags in ethers v5 — ~300kB the client doesn't need. The output is
 *  spec-compliant, so the API (which parses with `siwe`) round-trips it. Domain
 *  and URI come from the live location so they match wherever the app is served
 *  (in dev that's localhost:3000, exactly what the API verifies against). */
export function buildSiweMessage(params: {
  address: `0x${string}`;
  chainId: number;
  nonce: string;
}): string {
  return createSiweMessage({
    domain: window.location.host,
    address: params.address,
    statement: 'Sign in to RaiseDAO.',
    uri: window.location.origin,
    version: '1',
    chainId: params.chainId,
    nonce: params.nonce,
  });
}
