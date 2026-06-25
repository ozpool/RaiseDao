/** The RaiseDAO mechanism pipeline in architectural order.
 *  "label" follows the "01 / STAGE" editorial format from UI.md §3.
 *  Keep in sync with docs/ARCHITECTURE.md — source of truth is there. */

export interface Stage {
  id: string;
  /** Short mono label — "01 / FACTORY" */
  label: string;
  /** Display heading shown in the active content panel */
  title: string;
  /** One-paragraph explanation of this architecture layer */
  blurb: string;
}

export const STAGES: Stage[] = [
  {
    id: 'factory',
    label: '01 / FACTORY',
    title: 'One clone per raise.',
    blurb:
      'A RaiseFactory deploys a minimal-proxy (EIP-1167) vault, governor and vote token for each campaign — cheap, isolated, identical.',
  },
  {
    id: 'vault',
    label: '02 / VAULT',
    title: 'Funds escrow on-chain.',
    blurb:
      'Contributions lock as USDC in the vault; nothing leaves except by a passed governance vote. Not even the founder can pull them.',
  },
  {
    id: 'governor',
    label: '03 / GOVERNOR',
    title: 'Investors decide each milestone.',
    blurb:
      'Token-weighted votes (snapshot stake) gate every release; a passing vote queues through a timelock before funds move.',
  },
  {
    id: 'indexer',
    label: '04 / INDEXER',
    title: 'The chain, mirrored.',
    blurb:
      'An in-process indexer tails contract events with reorg-safe confirmations, so the app reads one fast database instead of the chain on every request.',
  },
  {
    id: 'database',
    label: '05 / DATABASE',
    title: 'Live, the moment it happens.',
    blurb:
      'The API serves the mirrored state and pushes vote tallies over WebSockets — the UI updates without polling.',
  },
];
