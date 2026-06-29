import type { Metadata } from 'next';
import { WhitePaper } from '@/components/docs/WhitePaper';

export const metadata: Metadata = {
  title: 'White paper — RaiseDAO',
  description:
    'The RaiseDAO white paper: milestone-gated crowdfunding with on-chain investor governance.',
};

/** Public docs route: the RaiseDAO white paper. Linked from the dashboard and the
 *  site footer; readable and shareable without a session. */
export default function DocsPage() {
  return <WhitePaper />;
}
