'use client';

import { useEffect } from 'react';
import type { EvidenceRecord } from '@/lib/api';
import { evidenceKind, formatBytes, ipfsUrl } from '@/lib/ipfs';

/** Full-screen viewer for the evidence gallery. Steps through every image/video
 *  proof across the campaign with arrows or ←/→, Escape or a backdrop click to
 *  close. A metadata row keeps each piece tied to its milestone, so the proof
 *  reads as a record, not just a picture. */
export interface EvidenceLightboxProps {
  records: EvidenceRecord[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}

export function EvidenceLightbox({ records, index, onClose, onIndex }: EvidenceLightboxProps) {
  const rec = records[index];
  const count = records.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % count);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + count) % count);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, count, onClose, onIndex]);

  if (!rec) return null;
  const url = ipfsUrl(rec.cid);
  const kind = evidenceKind(rec.filename);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Evidence viewer"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-void/92 p-4 backdrop-blur-sm sm:p-8"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 font-mono text-caption uppercase tracking-widest text-mist hover:text-paper"
      >
        Close ✕
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              onIndex((index - 1 + count) % count);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-line bg-panel/60 px-4 py-3 text-paper hover:border-data hover:text-data sm:left-6"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              onIndex((index + 1) % count);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-line bg-panel/60 px-4 py-3 text-paper hover:border-data hover:text-data sm:right-6"
          >
            →
          </button>
        </>
      )}

      <figure
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-panel/70"
      >
        <div className="flex min-h-0 flex-1 items-center justify-center bg-void/70">
          {kind === 'video' ? (
            <video src={url} controls autoPlay className="max-h-[72vh] w-full" />
          ) : (
            <img src={url} alt={rec.filename} className="max-h-[72vh] w-full object-contain" />
          )}
        </div>
        <figcaption className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <span className="min-w-0">
            <span className="block truncate font-sans text-small text-paper">{rec.filename}</span>
            <span className="font-mono text-caption uppercase tracking-widest text-mist">
              Milestone {String(rec.milestoneIndex + 1).padStart(2, '0')} · {formatBytes(rec.size)}{' '}
              · {index + 1}/{count}
            </span>
          </span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 font-mono text-caption uppercase tracking-widest text-data hover:opacity-80"
          >
            Open on IPFS ↗
          </a>
        </figcaption>
      </figure>
    </div>
  );
}
