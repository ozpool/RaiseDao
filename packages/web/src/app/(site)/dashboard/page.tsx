import type { Metadata } from 'next';
import { DashboardView } from '@/components/dashboard/DashboardView';

export const metadata: Metadata = {
  title: 'Dashboard — RaiseDAO',
};

/** Protected route: DashboardView gates its body behind a SIWE session, then
 *  offers Founder / Investor perspectives via a tab switcher. */
export default function DashboardPage() {
  return <DashboardView />;
}
