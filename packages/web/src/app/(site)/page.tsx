import { Hero } from '@/components/landing/Hero';
import { FundsLockedTicker } from '@/components/landing/FundsLockedTicker';
import { JourneySection } from '@/components/journey/JourneySection';
import { MechanismDiagram } from '@/components/mechanism/MechanismDiagram';

/** Landing page. Server component shell; the Hero owns the client-only Vault and
 *  the ticker owns its count-up. The JourneySection is the cinematic finale — the
 *  pinned Trust Core scrubbed through its six-beat story — sitting between the
 *  ticker and the mechanism diagram. No figure is shown as live yet. */
export default function Home() {
  return (
    <>
      <Hero />
      <FundsLockedTicker />
      <JourneySection />
      <MechanismDiagram />
    </>
  );
}
