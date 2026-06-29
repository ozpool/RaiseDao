/** The six beats of the Trust Core scroll-movie (the cinematic finale). Each beat
 *  owns a slice of scroll progress; the captions, rail and (Stage 2) the core's
 *  own parameters are all driven from the active beat. Palette is meaning, not
 *  decoration: cyan = data/funding, magenta = voting tension, gold = release. */
export type BeatAccent = 'data' | 'vote' | 'gold' | 'neutral';

export interface Beat {
  id: string;
  num: string;
  label: string;
  title: string;
  body: string;
  accent: BeatAccent;
  /** The real contract call this beat dramatizes — shown in mono as a craft
   *  signal for technical visitors. Every beat maps 1:1 to an actual function. */
  call?: string;
}

export const BEATS: Beat[] = [
  {
    id: 'hold',
    num: '00',
    label: 'The Vault',
    title: 'Watch trust become visible.',
    body: 'Every campaign deploys its own vault — a smart contract that holds the money, not the founder’s wallet. Scroll to see the full lifecycle of a raise.',
    accent: 'neutral',
    call: 'RaiseFactory.deploy()',
  },
  {
    id: 'raise',
    num: '01',
    label: 'The raise',
    title: 'Backers fund the vault.',
    body: 'Each contribution in USDC goes straight into the campaign’s vault and counts toward the goal. The founder never touches it — the contract does.',
    accent: 'data',
    call: 'RaiseVault.contribute()',
  },
  {
    id: 'lock',
    num: '02',
    label: 'The lock',
    title: 'The funds lock.',
    body: 'Once raised, no one can withdraw — not the founder, not the platform. The contract is the only key, and it opens only on a passing vote.',
    accent: 'data',
    call: 'onlyGovernor',
  },
  {
    id: 'vote',
    num: '03',
    label: 'The vote',
    title: 'Backers vote each milestone.',
    body: 'To release a tranche, backers vote on-chain. Miss quorum or fail the vote and the money stays locked. Approval is the only way funds move.',
    accent: 'vote',
    call: 'MilestoneGovernor.castVote()',
  },
  {
    id: 'release',
    num: '04',
    label: 'The release',
    title: 'Approved — one tranche releases.',
    body: 'A passing vote unlocks exactly one milestone’s funds to the founder — automatically, with no human approving it. The rest stays sealed for the next vote.',
    accent: 'gold',
    call: 'RaiseVault.releaseMilestone()',
  },
  {
    id: 'loop',
    num: '05',
    label: 'Repeat',
    title: 'Repeat — or refund.',
    body: 'The vault re-seals at the next milestone and the cycle repeats. If a milestone fails, every backer claims a pro-rata refund. Trust, not promises.',
    accent: 'data',
    call: 'RaiseVault.claimRefund()',
  },
];

/** Literal Tailwind classes per accent — kept whole so the JIT scanner sees them. */
export const ACCENT_TEXT: Record<BeatAccent, string> = {
  data: 'text-data',
  vote: 'text-vote',
  gold: 'text-gold-unlock',
  neutral: 'text-mist',
};

export const ACCENT_BG: Record<BeatAccent, string> = {
  data: 'bg-data',
  vote: 'bg-vote',
  gold: 'bg-gold-unlock',
  neutral: 'bg-mist',
};
