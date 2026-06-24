/** Landing page. Server component. The Vault and the live funds-locked ticker
 *  arrive in later milestones (#20, #21) — until then their slot is a visibly
 *  distinct placeholder, never a plausible-looking mocked figure (UI.md §9). */
export default function Home() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <p className="font-mono text-caption uppercase tracking-widest text-mist">
        Milestone-gated crowdfunding
      </p>
      <h1 className="mt-4 max-w-3xl font-sans text-display font-semibold tracking-tight text-paper">
        Watch trust become visible.
      </h1>
      <p className="mt-6 max-w-xl font-sans text-body text-mist">
        Founders raise into a vault that releases funds tranche by tranche — only when investors
        vote each milestone through. Fail a milestone, and the rest refunds pro rata.
      </p>
      <div className="mt-12 flex max-w-xl items-center gap-3 rounded-md border border-dashed border-line px-4 py-3 text-small text-mist">
        <span className="font-mono uppercase tracking-wider text-signal">Placeholder</span>
        <span>The signature Vault and the live funds-locked ticker land next.</span>
      </div>
    </section>
  );
}
