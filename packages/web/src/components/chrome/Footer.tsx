/** Site footer chrome. Zero animation; mono facts only (docs/UI.md §7). */
export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-10 font-mono text-caption text-mist">
        <p>RaiseDAO — milestone-gated crowdfunding on Arbitrum Sepolia.</p>
        <p>Funds release per milestone, gated by token-weighted investor votes.</p>
      </div>
    </footer>
  );
}
