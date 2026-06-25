/** Site footer chrome. The oversized wordmark bookends the page (the hero opens
 *  with it, the footer closes on it); mono fact columns above, zero animation
 *  (docs/UI.md §7). */
const COLUMNS: { title: string; items: string[] }[] = [
  { title: 'Product', items: ['Campaigns', 'How it works', 'The Vault'] },
  { title: 'Network', items: ['Arbitrum Sepolia', 'USDC escrow', 'Contracts'] },
  { title: 'Resources', items: ['Docs', 'GitHub', 'Architecture'] },
  { title: 'Status', items: ['Testnet', 'Not audited', 'Portfolio build'] },
];

export function Footer() {
  return (
    <footer className="mt-28 border-t border-line">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 pb-12 pt-14 sm:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="font-mono text-caption uppercase tracking-widest text-mist">
              {col.title}
            </p>
            <ul className="mt-4 space-y-2 font-sans text-small text-paper">
              {col.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* The wordmark as a closing bookend — a dim watermark, not a shout. */}
      <div className="overflow-hidden px-6">
        <p className="select-none font-display text-mega font-semibold leading-[0.8] tracking-tighter text-line">
          RAISEDAO
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 font-mono text-caption text-mist">
        <p>© 2026 RaiseDAO — milestone-gated crowdfunding. Testnet demo, not audited.</p>
      </div>
    </footer>
  );
}
