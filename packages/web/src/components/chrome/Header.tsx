import Link from 'next/link';
import { ConnectButton } from '@/components/wallet/ConnectButton';

/** Site header chrome. The wordmark is the only `signal` use here; the wallet
 *  connect control is the one interactive island in the nav. */
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-void/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-sans text-h2 font-semibold tracking-tight text-paper">
          Raise<span className="text-signal">DAO</span>
        </Link>
        <nav className="flex items-center gap-6 font-sans text-small text-mist">
          <Link href="/campaigns" className="transition-colors hover:text-paper">
            Campaigns
          </Link>
          <Link href="/create" className="hidden transition-colors hover:text-paper sm:inline">
            Create
          </Link>
          <Link href="/dashboard" className="transition-colors hover:text-paper">
            Dashboard
          </Link>
          <Link href="/account" className="transition-colors hover:text-paper">
            Account
          </Link>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
