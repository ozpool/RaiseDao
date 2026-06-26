import type { Metadata } from 'next';
import { AdminView } from '@/components/admin/AdminView';

export const metadata: Metadata = {
  title: 'Moderation — RaiseDAO',
};

/** Protected, role-gated moderation panel: SIWE session via AuthGate, then the
 *  admin allowlist check inside AdminView. */
export default function AdminPage() {
  return <AdminView />;
}
