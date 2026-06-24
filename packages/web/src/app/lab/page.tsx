import type { Metadata } from 'next';
import { VaultBench } from '@/components/lab/VaultBench';

// A dev bench, never linked in production nav and kept out of the index.
export const metadata: Metadata = {
  title: 'Vault — lab bench',
  robots: { index: false, follow: false },
};

export default function LabPage() {
  return <VaultBench />;
}
