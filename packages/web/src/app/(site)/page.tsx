import { Hero } from '@/components/landing/Hero';
import { FundsLockedTicker } from '@/components/landing/FundsLockedTicker';
import { MechanismDiagram } from '@/components/mechanism/MechanismDiagram';

/** Landing page. Server component shell; the Hero owns the client-only Vault and
 *  the ticker owns its count-up. No figure is shown as live yet — the ticker is
 *  badged demo until the indexer lands (#30), and the Vault preview is tagged.
 *  MechanismDiagram (#31) renders below the ticker as a client island. */
export default function Home() {
  return (
    <>
      <Hero />
      <FundsLockedTicker />
      <MechanismDiagram />
    </>
  );
}
