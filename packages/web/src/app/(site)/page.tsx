import { Hero } from '@/components/landing/Hero';
import { FundsLockedTicker } from '@/components/landing/FundsLockedTicker';

/** Landing page. Server component shell; the Hero owns the client-only Vault and
 *  the ticker owns its count-up. No figure is shown as live yet — the ticker is
 *  badged demo until the indexer lands (#30), and the Vault preview is tagged. */
export default function Home() {
  return (
    <>
      <Hero />
      <FundsLockedTicker />
    </>
  );
}
