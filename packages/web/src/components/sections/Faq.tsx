'use client';

import { useState } from 'react';

/** The questions a sceptical visitor actually has, answered plainly. A smooth
 *  accordion (grid-rows 0fr→1fr trick, so height animates without measuring) keeps
 *  it tidy. Buttons are real <button>s with aria-expanded — keyboard + SR friendly. */

interface QA {
  q: string;
  a: string;
}

const QAS: QA[] = [
  {
    q: 'Who actually controls the money?',
    a: 'The vault contract does. Not the founder, not RaiseDAO. Once a campaign funds, the only thing that can move the money is a passing milestone vote — and that logic lives on-chain where anyone can read it.',
  },
  {
    q: 'What happens if a project fails?',
    a: 'If a milestone is voted down or never met, the campaign can fail and every backer claims a pro-rata refund straight from the vault. The platform has no power to block or delay it — the refund path is enforced by the same contract as the release path.',
  },
  {
    q: 'What chain and token does it use?',
    a: 'This build runs on Arbitrum Sepolia and settles in USDC. It is a testnet portfolio project — funds are test tokens, not real money.',
  },
  {
    q: 'Can RaiseDAO freeze or redirect funds?',
    a: 'No. A small protocol fee is taken on each release, and that amount is fixed in the contract. Beyond that fee, the platform cannot freeze, redirect, or withdraw any campaign’s funds.',
  },
  {
    q: 'How is voting weighted?',
    a: 'Backers receive a soulbound (non-transferable) governance token proportional to their contribution. You delegate it to yourself once to activate voting, then vote on each milestone. Weight can’t be bought or sold.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative py-24 lg:py-32" aria-label="Frequently asked questions">
      <div className="mx-auto max-w-3xl px-6">
        <p className="font-mono text-caption uppercase tracking-widest text-mist">
          Questions <span className="text-data">//</span> straight answers
        </p>
        <h2 className="mt-4 font-display text-h1 font-semibold leading-[1.05] tracking-tight text-paper">
          The things you should ask first.
        </h2>

        <ul className="mt-12 divide-y divide-line border-y border-line">
          {QAS.map((item, i) => {
            const isOpen = open === i;
            return (
              <li key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  <span className="font-display text-h2 font-medium tracking-tight text-paper">
                    {item.q}
                  </span>
                  <span
                    aria-hidden
                    className={`shrink-0 font-mono text-body text-mist transition-transform duration-300 ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-2xl pb-6 font-sans text-body leading-relaxed text-mist">
                      {item.a}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
