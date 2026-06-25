/** Resolve a pinned CID to a fetchable URL. The gateway is overridable per
 *  deployment (a dedicated Pinata/Cloudflare gateway is faster and more reliable
 *  than the public one); the default is the public ipfs.io gateway so the viewer
 *  works out of the box without extra config. */
const GATEWAY = (process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? 'https://ipfs.io/ipfs').replace(/\/$/, '');

export function ipfsUrl(cid: string): string {
  return `${GATEWAY}/${cid}`;
}

/** Client-side mirror of the API's EVIDENCE_MAX_BYTES (10 MB) so we can reject an
 *  oversize file before wasting an upload — the API still enforces it (413). */
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

/** How the viewer should render a pinned file, inferred from its filename. We
 *  key off the extension rather than a stored MIME type because that's all the
 *  evidence record keeps, and it's enough to pick image / video / pdf / other. */
export type EvidenceKind = 'image' | 'video' | 'pdf' | 'other';

const IMAGE = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg'];
const VIDEO = ['mp4', 'webm', 'mov', 'm4v', 'ogv'];

export function evidenceKind(filename: string): EvidenceKind {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE.includes(ext)) return 'image';
  if (VIDEO.includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

/** Human-readable byte size for the file list (e.g. "2.4 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}
