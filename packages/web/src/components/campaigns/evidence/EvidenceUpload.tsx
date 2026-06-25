'use client';

import { useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useUploadEvidence } from '@/hooks/useEvidence';
import { EVIDENCE_MAX_BYTES, formatBytes } from '@/lib/ipfs';

/** Founder-only control to pin a new evidence file against one milestone. Large
 *  files are rejected client-side before the upload; a failed pin (API 502) or an
 *  over-cap file the client missed (413) surfaces as a clear message rather than a
 *  silent no-op. Shown only to the founder (gated by the parent). */
export function EvidenceUpload({
  campaignId,
  milestoneIndex,
}: {
  campaignId: number;
  milestoneIndex: number;
}) {
  const token = useAuthStore((s) => s.token);
  const upload = useUploadEvidence(campaignId, token);
  const [file, setFile] = useState<File | null>(null);
  const [tooLarge, setTooLarge] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(next: File | null) {
    upload.reset();
    setTooLarge(Boolean(next && next.size > EVIDENCE_MAX_BYTES));
    setFile(next);
  }

  function submit() {
    if (!file || tooLarge) return;
    upload.mutate(
      { file, milestoneIndex },
      {
        onSuccess: () => {
          setFile(null);
          if (inputRef.current) inputRef.current.value = '';
        },
      },
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-dashed border-line bg-void/20 p-4">
      <input
        ref={inputRef}
        type="file"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
        className="block w-full font-sans text-caption text-mist file:mr-3 file:rounded-full file:border-0 file:bg-panel file:px-3 file:py-1.5 file:font-mono file:text-caption file:uppercase file:tracking-widest file:text-paper hover:file:opacity-80"
      />
      {file && !tooLarge && (
        <p className="mt-2 font-mono text-caption text-mist">{formatBytes(file.size)} selected</p>
      )}
      {tooLarge && (
        <p className="mt-2 font-sans text-caption text-signal">
          File is larger than {formatBytes(EVIDENCE_MAX_BYTES)} — choose a smaller file.
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={!file || tooLarge || upload.isPending}
        className="mt-3 rounded-full bg-data px-4 py-2 font-mono text-caption uppercase tracking-widest text-void transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {upload.isPending ? 'Pinning…' : 'Pin evidence'}
      </button>
      {upload.isError && (
        <p className="mt-2 font-sans text-caption text-signal">{uploadError(upload.error)}</p>
      )}
    </div>
  );
}

function uploadError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 413) return 'File exceeds the size limit.';
    if (error.status === 502) return 'Could not pin to IPFS — try again in a moment.';
    if (error.status === 401) return 'Sign in again to upload.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Upload failed — try again.';
}
