import Link from 'next/link';
import { EXPLORER_URL, USDC_ADDRESS, FACTORY_ADDRESS } from '@/lib/config';

/** Site footer chrome (docs/UI.md §7): mono fact columns, real outbound links to
 *  the on-chain contracts on Arbiscan and the source on GitHub, the wordmark as a
 *  closing bookend. Zero animation — this is the trust anchor, it states facts. */
const REPO = 'https://github.com/ozpool/RaiseDao';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const factoryHref = FACTORY_ADDRESS ? `${EXPLORER_URL}/address/${FACTORY_ADDRESS}` : null;

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Campaigns', href: '/campaigns' },
      { label: 'Create a raise', href: '/create' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Contracts',
    links: [
      ...(factoryHref ? [{ label: 'RaiseFactory ↗', href: factoryHref, external: true }] : []),
      { label: 'USDC escrow ↗', href: `${EXPLORER_URL}/address/${USDC_ADDRESS}`, external: true },
      { label: 'Arbitrum Sepolia ↗', href: EXPLORER_URL, external: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'GitHub ↗', href: REPO, external: true },
      { label: 'Architecture ↗', href: `${REPO}/blob/main/docs/ARCHITECTURE.md`, external: true },
      { label: 'Demo walkthrough ↗', href: `${REPO}/blob/main/docs/DEMO.md`, external: true },
    ],
  },
  {
    title: 'Status',
    links: [
      { label: 'Testnet', href: '/campaigns' },
      { label: 'Not audited', href: `${REPO}/blob/main/README.md`, external: true },
      { label: 'Portfolio build', href: REPO, external: true },
    ],
  },
];

function FootLink({ link }: { link: FooterLink }) {
  const className = 'transition-colors hover:text-data';
  return link.external ? (
    <a href={link.href} target="_blank" rel="noreferrer" className={className}>
      {link.label}
    </a>
  ) : (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

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
              {col.links.map((link) => (
                <li key={link.label}>
                  <FootLink link={link} />
                </li>
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
