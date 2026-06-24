import { SiweMessage, generateNonce } from 'siwe';
import { config } from '../config.js';

export { generateNonce };

/**
 * Verify a SIWE message + signature against the expected domain and the nonce we
 * issued. Returns the (checksummed) address on success, throws otherwise.
 */
export async function verifySiwe(
  message: string,
  signature: string,
  expectedNonce: string,
): Promise<string> {
  const siwe = new SiweMessage(message);
  const result = await siwe.verify({
    signature,
    nonce: expectedNonce,
    domain: config.SIWE_DOMAIN,
  });
  if (!result.success) throw new Error('SIWE verification failed');
  return result.data.address;
}

/** The claimed address in a SIWE message, before verification. */
export function addressFromMessage(message: string): string {
  return new SiweMessage(message).address;
}
