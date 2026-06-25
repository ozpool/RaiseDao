import { Hero } from '@/components/landing/Hero';

/** Landing page. Server component shell; the Hero owns the client-only Vault.
 *  The live funds-locked ticker lands next (#21 Stage C) — until then no figure
 *  is shown as live, and the Vault preview is visibly tagged (UI.md §9). */
export default function Home() {
  return <Hero />;
}
