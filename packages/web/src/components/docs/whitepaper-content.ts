/** The RaiseDAO white paper, as structured content. Kept as data so the renderer
 *  stays small and the prose is easy to review and edit in one place. Every claim
 *  here reflects the deployed contracts and the documented architecture; the tone
 *  is plain and factual, with sources linked in the References section. */

export interface KeyValue {
  k: string;
  v: string;
}

export interface DocLink {
  label: string;
  href: string;
}

export type Block =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'kv'; rows: KeyValue[] }
  | { type: 'links'; items: DocLink[] };

export interface Section {
  id: string;
  num: string;
  title: string;
  blocks: Block[];
}

const REPO = 'https://github.com/ozpool/RaiseDao';
const EXPLORER = 'https://sepolia.arbiscan.io';
const FACTORY = '0xb88bb092A575d6CE82FbaDcC9a0216aE5BD1a765';
const USDC = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';

export const META = {
  title: 'RaiseDAO',
  subtitle: 'Milestone-gated crowdfunding with on-chain investor governance',
  version: 'Version 1.0',
  date: 'June 2026',
  network: 'Arbitrum Sepolia (testnet)',
};

export const SECTIONS: Section[] = [
  {
    id: 'summary',
    num: '01',
    title: 'Executive Summary',
    blocks: [
      {
        type: 'p',
        text: 'RaiseDAO is a crowdfunding protocol in which raised funds are held by a smart contract and released to the founder one milestone at a time, only after the backers approve each release through an on-chain vote. If a milestone is rejected, or its deadline passes without a release, every backer can reclaim a proportional share of the remaining funds.',
      },
      {
        type: 'p',
        text: 'The protocol replaces the trust a backer normally places in a founder with rules enforced by smart contract code. The founder can ask for funds, but cannot move them. Only a passing vote, followed by a short safety delay, can release money, and the refund path is available to backers whenever a milestone fails. This document describes the problem, the design, the contracts, the governance model, the economics, and the known limitations of the current build, which runs on a test network and has not been audited.',
      },
    ],
  },
  {
    id: 'introduction',
    num: '02',
    title: 'Introduction',
    blocks: [
      {
        type: 'p',
        text: 'Conventional crowdfunding pays the full target amount to the creator at the moment a campaign succeeds. Backers part with their money first and rely entirely on the creator to deliver. When a project stalls or is abandoned, backers have little practical recourse, and recovering funds is rare. On-chain crowdfunding has often reproduced the same pattern, simply moving the single payout onto a blockchain without changing the underlying accountability gap.',
      },
      {
        type: 'p',
        text: 'RaiseDAO is built around a single principle: money and rules live on-chain, and funds move only when the people who provided them agree. Everything that does not need to be enforced by a contract, such as descriptions and images, lives off-chain in a conventional database, while the contracts remain the source of truth for custody and governance.',
      },
    ],
  },
  {
    id: 'problem',
    num: '03',
    title: 'The Problem',
    blocks: [
      { type: 'p', text: 'Three weaknesses recur in existing crowdfunding models:' },
      {
        type: 'ul',
        items: [
          'Upfront payout. The full amount is handed over before any work is verified, so a backer carries all of the delivery risk.',
          'No enforced recourse. Refund policies depend on the platform and the creator rather than on code, so they are slow, discretionary, or absent.',
          'Opaque custody. Backers rarely know where their money is held or who can move it.',
        ],
      },
      {
        type: 'p',
        text: 'A funding model that addresses these weaknesses must hold funds in clear, neutral custody, release them only against verified progress, and guarantee refunds when progress is not made.',
      },
    ],
  },
  {
    id: 'solution',
    num: '04',
    title: 'The RaiseDAO Solution',
    blocks: [
      {
        type: 'p',
        text: 'Each campaign deploys its own set of contracts. Backers contribute a stablecoin (USDC) into a dedicated vault and, in return, receive a governance token. That token is soulbound, meaning it cannot be transferred between wallets, and it carries voting power proportional to the amount contributed. The raise is divided into milestones, each holding a fixed share of the total.',
      },
      {
        type: 'p',
        text: 'To unlock a milestone, the founder opens a vote. Backers vote with their voting power. If the vote passes and meets quorum, the release is queued behind a short timelock and then sent to the founder, less a fixed protocol fee. If a milestone is voted down or its deadline lapses, the campaign enters refund mode and backers reclaim their proportional share of the funds that remain.',
      },
    ],
  },
  {
    id: 'architecture',
    num: '05',
    title: 'System Architecture',
    blocks: [
      {
        type: 'p',
        text: 'The protocol is composed of a small number of contracts, each with a single clear responsibility:',
      },
      {
        type: 'ul',
        items: [
          'RaiseFactory. A single global contract that launches a campaign in one transaction, creating and wiring all of the per-campaign contracts.',
          'RaiseVault. The escrow for one campaign. It holds the USDC, mints voting power on contribution, releases tranches, and pays refunds. It is the only contract that touches campaign funds.',
          'GovToken. The non-transferable (soulbound) governance token for one campaign, minted to backers in proportion to their contribution and used to weigh votes.',
          'MilestoneGovernor. The voting contract for one campaign. The founder opens proposals; backers cast votes weighted by their token balance at a snapshot.',
          'TimelockController. A mandatory delay between a passing vote and the movement of funds, and the only address permitted to call a release on the vault.',
        ],
      },
      {
        type: 'p',
        text: 'The per-campaign Vault and GovToken are deployed as minimal proxy clones of shared implementations (the ERC-1167 standard), which keeps deployment inexpensive while giving every campaign its own isolated storage. Two small helper contracts deploy the Governor and Timelock so that the factory remains within the contract size limit defined by the network.',
      },
    ],
  },
  {
    id: 'lifecycle',
    num: '06',
    title: 'The Lifecycle of a Raise',
    blocks: [
      {
        type: 'ul',
        items: [
          'Launch. The founder calls the factory, which builds and wires a vault, a token, a governor, and a timelock for the campaign.',
          'Fund. Backers contribute USDC into the vault and receive voting power equal to the amount they contributed.',
          'Activate voting. Each backer delegates their voting power to themselves once, which is required for the snapshot accounting used during votes.',
          'Propose. The founder opens a release vote for the next milestone.',
          'Vote. Backers vote during the voting window. The vote must reach quorum to count.',
          'Queue and execute. A passing vote is queued behind the timelock. After the delay, anyone may execute it, which instructs the vault to release that milestone to the founder, less the protocol fee.',
          'Repeat or refund. The cycle repeats for the next milestone. If a milestone is rejected or its deadline passes, refunds open and backers reclaim their share.',
        ],
      },
    ],
  },
  {
    id: 'example',
    num: '07',
    title: 'A Worked Example',
    blocks: [
      {
        type: 'p',
        text: 'Consider a founder raising 10,000 USDC across two milestones, the first holding 60 percent (6,000 USDC) and the second 40 percent (4,000 USDC). Ten backers each contribute 1,000 USDC and each receive voting power equal to 1,000.',
      },
      {
        type: 'p',
        text: 'When the founder completes the first milestone, they open a release vote. If backers holding more than half of the participating voting power approve, and at least the quorum (10 percent of all voting power) takes part, the release is queued. After the timelock, the protocol fee is taken (at 2 percent, that is 120 USDC) and the remaining 5,880 USDC is sent to the founder. The other 4,000 USDC stays locked for the second milestone.',
      },
      {
        type: 'p',
        text: 'If the second milestone is then rejected, or its deadline passes without a release, the campaign enters refund mode. The 4,000 USDC that remains becomes claimable, and each backer can withdraw their proportional share of it. In this example, every backer contributed an equal amount, so each could reclaim 400 USDC.',
      },
    ],
  },
  {
    id: 'governance',
    num: '08',
    title: 'Governance Model',
    blocks: [
      {
        type: 'p',
        text: 'Governance is deliberately narrow. The only decision backers make is whether to release the next milestone. Proposals can be opened only by the campaign founder, because backers hold voting power over releases alone, and an open proposal right would invite spam. Every backer may vote on any open proposal.',
      },
      {
        type: 'p',
        text: 'The founder, as the campaign’s deployer, receives no voting power of their own. The proposal threshold is set to zero precisely because founders hold no tokens. A founder can, however, contribute to their own campaign like any backer, and would then receive voting power in proportion to that contribution. This possibility is the basis of the self-funding and governance-concentration risks discussed in the Risks section.',
      },
      {
        type: 'p',
        text: 'A passing vote does not execute immediately; it waits out a timelock, which gives participants a window to react before funds move. Refund mode can be opened in two ways. A governance vote can fail a milestone, or, if a milestone’s deadline passes without a release, any participant at all may call a permissionless fail function. No special role is required for this second path, so an inactive founder cannot trap funds: once the deadline has passed, anyone can trigger refunds.',
      },
    ],
  },
  {
    id: 'token',
    num: '09',
    title: 'Token and Voting Design',
    blocks: [
      {
        type: 'p',
        text: 'Voting power is represented by a per-campaign governance token. Throughout this paper, the token is the asset a backer holds and voting power is the weight it carries in a vote. The token is minted to a backer when they contribute and burned when they take a refund. It is soulbound: any wallet-to-wallet transfer is rejected by the contract. Voting power can therefore be earned by contributing, but never bought or sold.',
      },
      {
        type: 'p',
        text: 'The token records historical balances at each block, and votes are counted against a snapshot taken when a proposal opens. This prevents a backer from acquiring power after a vote begins in order to influence its outcome. Because the accounting uses delegated balances, each backer delegates to themselves once to make their power countable.',
      },
    ],
  },
  {
    id: 'economics',
    num: '10',
    title: 'Economics and Parameters',
    blocks: [
      {
        type: 'p',
        text: 'The protocol charges a single fee. When a milestone is released, a fixed percentage of that tranche is sent to a designated fee recipient and the remainder goes to the founder. The fee is set when the factory is deployed and is fixed for every campaign that factory creates; it cannot be changed for a campaign after deployment, and it is charged only on funds that are actually released, never on contributions or refunds. The current deployment uses a fee of 2 percent.',
      },
      {
        type: 'p',
        text: 'The governance timings are chosen to balance participation against momentum:',
      },
      {
        type: 'ul',
        items: [
          'Voting delay (about one hour). A short gap between opening a proposal and votes counting, so backers can see the proposal and the voting snapshot is set cleanly.',
          'Voting period (about one day). Long enough for backers in different time zones to take part, short enough to keep milestones moving.',
          'Quorum (10 percent of voting power). Low enough to be reachable with realistic turnout, high enough that a very small minority cannot decide a release alone.',
          'Timelock (two days). A cooling-off window after a vote passes, so participants can react before any funds move.',
        ],
      },
    ],
  },
  {
    id: 'security',
    num: '11',
    title: 'Security and Trust Guarantees',
    blocks: [
      {
        type: 'ul',
        items: [
          'Isolated custody. Each campaign has its own vault, so funds are never pooled across campaigns and one campaign cannot affect another.',
          'Single money path. The only function that moves campaign funds can be called only by the timelock, and only as the result of a passing vote.',
          'Guaranteed refunds. The refund path is enforced by the same contract as the release path, so the platform cannot block or delay it.',
          'Permissionless escape hatch. If a founder goes inactive past a milestone deadline, anyone may fail that milestone, which opens refunds, so funds cannot be locked indefinitely.',
          'Reviewed foundations. Governance, access control, and token logic build on OpenZeppelin’s audited and widely used contract libraries. This applies to those libraries; the RaiseDAO protocol contracts themselves have not been independently audited (see Risks).',
        ],
      },
    ],
  },
  {
    id: 'risks',
    num: '12',
    title: 'Risks and Limitations',
    blocks: [
      { type: 'p', text: 'This build is presented honestly, with its limits stated plainly:' },
      {
        type: 'ul',
        items: [
          'Testnet and unaudited. The current deployment runs on a test network with test tokens and has not undergone a formal security audit. It should not be used with funds of real value.',
          'Self-funding and Sybil risk. Because the protocol does not verify identity, a founder can split their own funds across several wallets and contribute from each. Every wallet receives voting power, so a founder who supplies a large share of the total could approve their own milestone releases. This is a fundamental limitation of permissionless, one-token-one-vote governance without identity.',
          'Governance concentration. More generally, any single party who contributes most of the funds holds most of the voting power and can dominate releases. Quorum and majority rules do not prevent a genuine majority backer from deciding outcomes.',
          'Mitigations are documented, not enforced. Approaches such as an optimistic release window in which a minority can block or exit, a founder bond placed at stake, identity-linked per-wallet caps, or non-linear vote weighting can reduce these risks. They are described here as design options rather than shipped features.',
          'Low turnout. If few backers vote, a small share of voting power can meet quorum and decide a release. The quorum setting mitigates but does not remove this.',
          'Founder key dependence. Because proposals are founder-only, loss of the founder key prevents any new release from being proposed. Funds are not lost: once a milestone deadline passes, the permissionless escape hatch lets anyone open refunds.',
        ],
      },
    ],
  },
  {
    id: 'roadmap',
    num: '13',
    title: 'Roadmap',
    blocks: [
      {
        type: 'p',
        text: 'The following are planned directions, not commitments or shipped features. They describe what moving from a testnet portfolio build toward production would involve:',
      },
      {
        type: 'ul',
        items: [
          'Independent security audit of the protocol contracts before any use with real funds.',
          'Mainnet deployment on Arbitrum One once an audit is complete.',
          'Optional identity and attestation support, so campaigns that want it can reduce Sybil and concentration risk without forcing identity on every raise.',
          'Per-campaign governance parameters, letting founders and backers tune voting periods, quorum, and timelock to the size and risk of a raise.',
          'Stronger backer protections, including a minority refund (exit) window and an optional multisig requirement to open proposals.',
          'Smoother onboarding, including a fiat on-ramp and account-abstraction for gasless interactions.',
        ],
      },
    ],
  },
  {
    id: 'cta',
    num: '14',
    title: 'Get Involved',
    blocks: [
      {
        type: 'p',
        text: 'Explore live campaigns to see milestone-gated funding in action, launch your own raise to put your milestones in front of backers, or read the verified contract source to check exactly how custody and governance are enforced.',
      },
      {
        type: 'links',
        items: [
          { label: 'Browse campaigns', href: '/campaigns' },
          { label: 'Launch a campaign', href: '/create' },
          { label: 'Source code on GitHub', href: REPO },
          { label: 'RaiseFactory on Arbiscan', href: `${EXPLORER}/address/${FACTORY}` },
        ],
      },
    ],
  },
  {
    id: 'references',
    num: '15',
    title: 'References',
    blocks: [
      {
        type: 'links',
        items: [
          {
            label: 'OpenZeppelin Contracts: Governance and Access Control',
            href: 'https://docs.openzeppelin.com/contracts/governance',
          },
          {
            label: 'ERC-1167: Minimal Proxy Contract',
            href: 'https://eips.ethereum.org/EIPS/eip-1167',
          },
          {
            label: 'ERC-5805 and ERC20Votes: voting with delegation and historical balances',
            href: 'https://eips.ethereum.org/EIPS/eip-5805',
          },
          {
            label: 'ERC-4361: Sign-In with Ethereum',
            href: 'https://eips.ethereum.org/EIPS/eip-4361',
          },
          { label: 'Arbitrum documentation', href: 'https://docs.arbitrum.io' },
          { label: 'Circle USD Coin (USDC)', href: 'https://www.circle.com/usdc' },
        ],
      },
    ],
  },
  {
    id: 'appendix',
    num: '16',
    title: 'Appendix',
    blocks: [
      { type: 'p', text: 'Default governance parameters and key deployment details.' },
      {
        type: 'kv',
        rows: [
          { k: 'Network', v: 'Arbitrum Sepolia (chain id 421614)' },
          { k: 'Settlement asset', v: 'USDC' },
          { k: 'Voting delay', v: 'Approximately one hour before a vote opens' },
          { k: 'Voting period', v: 'Approximately one day' },
          { k: 'Quorum', v: '10 percent of voting power must take part' },
          { k: 'Timelock', v: 'Two days before a passed release executes' },
          { k: 'Protocol fee', v: '2 percent, charged only on released funds' },
          { k: 'Milestone spacing', v: 'Roughly one month between milestone deadlines' },
        ],
      },
      {
        type: 'links',
        items: [
          { label: 'RaiseFactory contract', href: `${EXPLORER}/address/${FACTORY}` },
          { label: 'USDC token', href: `${EXPLORER}/address/${USDC}` },
          { label: 'Source code repository', href: REPO },
        ],
      },
      {
        type: 'p',
        text: 'Glossary. Vault: the per-campaign escrow contract. Governance token: the per-campaign token a backer receives for contributing. Soulbound: a token that cannot be transferred between wallets. Voting power: the weight a governance token carries in a vote. Quorum: the minimum participation a vote needs to count. Timelock: a mandatory delay between a passing vote and the release of funds. Tranche: the portion of the total raise tied to one milestone.',
      },
    ],
  },
];
