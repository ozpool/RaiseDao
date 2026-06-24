import type { Logger } from 'pino';

/** A file to pin, already buffered in memory by the upload middleware. */
export interface PinFile {
  buffer: Buffer;
  filename: string;
  contentType?: string;
}

export interface PinResult {
  cid: string;
  provider: string;
}

/** A single IPFS pinning backend. Implementations throw on failure so the
 *  fallback chain can move on to the next provider. */
export interface PinProvider {
  readonly name: string;
  pin(file: PinFile): Promise<string>; // resolves to the CID
}

/**
 * Pin to the first provider that succeeds. Tries each in order, collecting
 * errors, and throws loudly only when every provider has failed — so a partial
 * outage degrades silently but a total one never hides a lost upload.
 */
export async function pinWithFallback(
  providers: PinProvider[],
  file: PinFile,
  log?: Logger,
): Promise<PinResult> {
  if (providers.length === 0) {
    throw new Error('no IPFS pin providers are configured');
  }

  const failures: string[] = [];
  for (const provider of providers) {
    try {
      const cid = await provider.pin(file);
      return { cid, provider: provider.name };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${provider.name}: ${message}`);
      log?.warn({ provider: provider.name, err }, 'pin provider failed, trying next');
    }
  }

  throw new Error(`all IPFS pin providers failed (${failures.join('; ')})`);
}
