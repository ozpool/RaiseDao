import { Hero } from '@/components/landing/Hero';
import { FundsLockedTicker } from '@/components/landing/FundsLockedTicker';
import { JourneySection } from '@/components/journey/JourneySection';

/** Landing page. Server component shell; the Hero owns the client-only voxel core
 *  and the ticker owns its count-up. The JourneySection is the cinematic finale —
 *  the pinned diamond vault scrubbed through its six-beat story; it replaces the
 *  old text mechanism diagram as the single "how it works" narrative. */
export default function Home() {
  return (
    <>
      <Hero />
      <FundsLockedTicker />
      <JourneySection />
    </>
  );
}
