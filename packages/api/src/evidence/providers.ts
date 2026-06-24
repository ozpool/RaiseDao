import type { Config } from '../config.js';
import type { PinFile, PinProvider } from './pin.js';

/** Pinata pinning via its pinFileToIPFS endpoint, authorised with a scoped JWT. */
export function pinataProvider(jwt: string): PinProvider {
  return {
    name: 'pinata',
    async pin(file: PinFile): Promise<string> {
      const form = new FormData();
      const blob = new Blob([file.buffer], {
        type: file.contentType ?? 'application/octet-stream',
      });
      form.append('file', blob, file.filename);

      const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: form,
      });
      if (!res.ok) {
        throw new Error(`pinata responded ${res.status} ${await safeText(res)}`);
      }
      const body = (await res.json()) as { IpfsHash?: string };
      if (!body.IpfsHash) throw new Error('pinata response missing IpfsHash');
      return body.IpfsHash;
    },
  };
}

/** web3.storage upload; returns the root CID of the stored file. */
export function web3StorageProvider(token: string): PinProvider {
  return {
    name: 'web3.storage',
    async pin(file: PinFile): Promise<string> {
      const res = await fetch('https://api.web3.storage/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Name': file.filename,
        },
        body: file.buffer,
      });
      if (!res.ok) {
        throw new Error(`web3.storage responded ${res.status} ${await safeText(res)}`);
      }
      const body = (await res.json()) as { cid?: string };
      if (!body.cid) throw new Error('web3.storage response missing cid');
      return body.cid;
    },
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return '';
  }
}

/** Build the ordered provider chain from config; skips any without a token. */
export function buildProviders(cfg: Config): PinProvider[] {
  const providers: PinProvider[] = [];
  if (cfg.PINATA_JWT) providers.push(pinataProvider(cfg.PINATA_JWT));
  if (cfg.WEB3_STORAGE_TOKEN) providers.push(web3StorageProvider(cfg.WEB3_STORAGE_TOKEN));
  return providers;
}
