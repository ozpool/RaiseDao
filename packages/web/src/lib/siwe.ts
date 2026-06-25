import { SiweMessage } from 'siwe';

/** Build the EIP-4361 message the wallet will sign. Domain and URI come from the
 *  live location so they always match wherever the app is served (in dev that's
 *  localhost:3000, which is exactly what the API verifies against). The same
 *  `siwe` major version is used here and on the API, so the string round-trips. */
export function buildSiweMessage(params: {
  address: string;
  chainId: number;
  nonce: string;
}): string {
  return new SiweMessage({
    domain: window.location.host,
    address: params.address,
    statement: 'Sign in to RaiseDAO.',
    uri: window.location.origin,
    version: '1',
    chainId: params.chainId,
    nonce: params.nonce,
  }).prepareMessage();
}
