interface EmptyStateProps {
  title: string;
  body?: string;
}

/** Centered empty-state placeholder, reused across all dashboard sections. */
export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-panel/40 px-8 py-14 text-center">
      <p className="font-sans text-h2 font-semibold text-paper">{title}</p>
      {body && <p className="max-w-sm font-sans text-small text-mist">{body}</p>}
    </div>
  );
}
