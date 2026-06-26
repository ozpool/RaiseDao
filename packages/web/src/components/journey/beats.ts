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
    label: 'The Vault',
    title: 'Watch trust become visible.',
    body: 'A single escrow, held in code. Scroll to see how it works.',
    accent: 'neutral',
  },
  {
    id: 'raise',
    num: '01',
    label: 'The raise',
    title: 'Founders raise into escrow.',
    body: 'Every contribution converges into one locked vault — no wallet, no middleman.',
    accent: 'data',
  },
  {
    id: 'lock',
    num: '02',
    label: 'The lock',
    title: 'Funds lock.',
    body: 'No one can pull them out — not even the founder. The contract holds the keys.',
    accent: 'data',
  },
  {
    id: 'vote',
    num: '03',
    label: 'The vote',
    title: 'Investors vote each milestone.',
    body: 'Miss quorum and nothing moves. Approval is the only way funds flow.',
    accent: 'vote',
  },
  {
    id: 'release',
    num: '04',
    label: 'The release',
    title: 'Approved. One tranche releases.',
    body: 'A single milestone unlocks. The rest stays sealed until the next vote.',
    accent: 'gold',
  },
  {
    id: 'loop',
    num: '05',
    label: 'Repeat',
    title: 'Every milestone. Until it’s built — or refunded.',
    body: 'The vault re-seals at a higher mark and the ritual repeats. Trust, made visible.',
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
