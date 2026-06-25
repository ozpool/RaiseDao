import type { Metadata } from 'next';
import { AccountView } from '@/components/account/AccountView';

export const metadata: Metadata = {
  title: 'Account — RaiseDAO',
};

/** Protected route: the AccountView gates its body behind a SIWE session. */
export default function AccountPage() {
  return <AccountView />;
}
