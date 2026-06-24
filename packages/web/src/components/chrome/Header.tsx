import Link from 'next/link';

/** Site header chrome. Server component — no interactivity yet; wallet connect
 *  arrives with #19. The wordmark is the only `signal` use here. */
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-void/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-sans text-h2 font-semibold tracking-tight text-paper">
          Raise<span className="text-signal">DAO</span>
        </Link>
        <nav className="flex items-center gap-6 font-sans text-small text-mist">
          <Link href="/" className="transition-colors hover:text-paper">
            Campaigns
          </Link>
          <Link href="/" className="transition-colors hover:text-paper">
            How it works
          </Link>
        </nav>
      </div>
    </header>
  );
}
