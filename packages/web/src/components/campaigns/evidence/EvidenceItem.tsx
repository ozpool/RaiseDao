'use client';

import type { EvidenceRecord } from '@/lib/api';
import { evidenceKind, formatBytes, ipfsUrl } from '@/lib/ipfs';

/** One pinned evidence file, rendered inline by type so investors can review it
 *  without leaving the page: images and video play in place, PDFs embed, and
 *  anything else falls back to a download link. Every item also links to the raw
 *  CID on the gateway so the proof is independently verifiable. */
export function EvidenceItem({ record }: { record: EvidenceRecord }) {
  const url = ipfsUrl(record.cid);
  const kind = evidenceKind(record.filename);

  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-void/40">
      <div className="bg-void/60">
        {kind === 'image' && (
          <img src={url} alt={record.filename} className="max-h-80 w-full object-contain" />
        )}
        {kind === 'video' && (
          <video src={url} controls className="max-h-80 w-full" preload="metadata" />
        )}
        {kind === 'pdf' && <iframe src={url} title={record.filename} className="h-80 w-full" />}
        {kind === 'other' && (
          <div className="px-5 py-8 text-center font-sans text-small text-mist">
            Preview not available for this file type.
          </div>
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-4 px-4 py-3">
        <span className="min-w-0">
          <span className="block truncate font-sans text-small text-paper">{record.filename}</span>
          <span className="font-mono text-caption text-mist">
            {formatBytes(record.size)} · pinned via {record.provider}
          </span>
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 font-mono text-caption uppercase tracking-widest text-data hover:opacity-80"
        >
          Open ↗
        </a>
      </figcaption>
    </figure>
  );
}
