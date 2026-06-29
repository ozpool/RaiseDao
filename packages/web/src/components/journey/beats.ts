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
}

export const BEATS: Beat[] = [
  {
    id: 'hold',
    num: '00',
    label: 'The vault',
    title: 'Watch trust become visible.',
    body: 'Every campaign deploys its own vault, a smart contract that holds the money instead of the founder’s wallet. Scroll to watch a raise play out.',
    accent: 'neutral',
  },
  {
    id: 'raise',
    num: '01',
    label: 'The raise',
    title: 'Backers fund the vault.',
    body: 'Contributions in USDC flow straight into the vault and count toward the goal. The founder never touches them. The contract holds the line.',
    accent: 'data',
  },
  {
    id: 'lock',
    num: '02',
    label: 'The lock',
    title: 'The funds lock.',
    body: 'Once raised, nobody can pull the money out. Not the founder, not the platform. The contract is the only key, and it turns only on a passing vote.',
    accent: 'data',
  },
  {
    id: 'vote',
    num: '03',
    label: 'The vote',
    title: 'Backers vote each milestone.',
    body: 'Releasing a tranche takes an on-chain vote. Miss the quorum or lose the vote, and the money stays put. Approval is the only way funds ever move.',
    accent: 'vote',
  },
  {
    id: 'release',
    num: '04',
    label: 'The release',
    title: 'Approved. One tranche releases.',
    body: 'A passing vote frees exactly one milestone’s funds to the founder, with no person signing off. The rest stays sealed for the next vote.',
    accent: 'gold',
  },
  {
    id: 'loop',
    num: '05',
    label: 'Repeat',
    title: 'Repeat, or refund.',
    body: 'The vault re-seals for the next milestone and the rhythm continues. If a milestone fails, every backer takes a pro-rata refund. Proof, not promises.',
    accent: 'data',
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
