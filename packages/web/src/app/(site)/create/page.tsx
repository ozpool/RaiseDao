import type { Metadata } from 'next';
import { AuthGate } from '@/components/auth/AuthGate';
import { CreateWizard } from '@/components/create/CreateWizard';

export const metadata: Metadata = {
  title: 'Create a campaign — RaiseDAO',
};

/** Protected: only a signed-in founder can compose a draft. */
export default function CreatePage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="font-display text-hero font-semibold tracking-tight text-paper">
        Create a campaign
      </h1>
      <p className="mb-12 mt-3 max-w-xl font-sans text-body text-mist">
        Define your raise and milestone schedule. Save it as a draft now — the on-chain deploy comes
        next.
      </p>
      <AuthGate>
        <CreateWizard />
      </AuthGate>
    </section>
  );
}
