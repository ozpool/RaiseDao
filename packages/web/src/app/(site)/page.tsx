import { Hero } from '@/components/landing/Hero';
import { FundsLockedTicker } from '@/components/landing/FundsLockedTicker';
import { JourneySection } from '@/components/journey/JourneySection';
import { Lifecycle } from '@/components/sections/Lifecycle';
import { Guarantees } from '@/components/sections/Guarantees';
import { DualPath } from '@/components/sections/DualPath';
import { Faq } from '@/components/sections/Faq';
import { ClosingCta } from '@/components/sections/ClosingCta';

/** Landing page. Server component shell; the Hero owns the client-only voxel core
 *  and the ticker owns its count-up. The JourneySection is the cinematic finale —
 *  the pinned diamond vault scrubbed through its six-beat story. The shared
 *  atmosphere is mounted by the site layout, behind every page. */
export default function Home() {
  return (
    <>
      <Hero />
      <FundsLockedTicker />
      <JourneySection />
      <Lifecycle />
      <Guarantees />
      <DualPath />
      <Faq />
      <ClosingCta />
    </>
  );
}
