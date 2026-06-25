/**
 * Sample campaigns for the browse grid so the page (and its filters) are
 * reviewable before real on-chain campaigns exist. Every one is flagged
 * `demo: true` so the UI can badge them honestly; the seed script upserts them
 * and real indexed campaigns appear alongside. campaignId is parked at 9000+ so
 * it never collides with the factory's sequential ids.
 */
function addr(seed: number): string {
  return `0x${seed.toString(16).padStart(40, '0')}`;
}

export function demoCampaigns() {
  const base = [
    {
      title: 'Solar microgrid for rural clinics',
      summary: 'Off-grid power so clinics keep vaccines cold and lights on through the night.',
      city: 'Nairobi',
      category: 'Energy',
      verified: true,
      featured: true,
      raiseTarget: '120000',
      totalRaised: '82400',
      status: 'funding',
    },
    {
      title: 'Open-source insulin pump',
      summary: 'A community-audited, low-cost pump with a fully documented hardware stack.',
      city: 'Berlin',
      category: 'Health',
      verified: true,
      featured: false,
      raiseTarget: '90000',
      totalRaised: '90000',
      status: 'active',
    },
    {
      title: 'Mesh network for flood zones',
      summary: 'Resilient comms that stay up when towers go down, deployed by local crews.',
      city: 'São Paulo',
      category: 'Infrastructure',
      verified: false,
      featured: false,
      raiseTarget: '60000',
      totalRaised: '14500',
      status: 'funding',
    },
    {
      title: 'Reef-safe coral printers',
      summary: 'Bioprinted substrate that speeds reef recovery, piloted with marine biologists.',
      city: 'Cebu',
      category: 'Climate',
      verified: true,
      featured: true,
      raiseTarget: '150000',
      totalRaised: '47000',
      status: 'funding',
    },
    {
      title: 'Repairable farm robotics',
      summary: 'Field robots smallholders can fix themselves, with open parts and manuals.',
      city: 'Bengaluru',
      category: 'Robotics',
      verified: false,
      featured: false,
      raiseTarget: '75000',
      totalRaised: '75000',
      status: 'succeeded',
    },
    {
      title: 'Cold-chain for vaccines',
      summary: 'Solar-backed cold storage with on-chain temperature attestations.',
      city: 'Lagos',
      category: 'Health',
      verified: true,
      featured: false,
      raiseTarget: '110000',
      totalRaised: '3200',
      status: 'funding',
    },
  ];

  return base.map((c, i) => ({
    ...c,
    campaignId: 9001 + i,
    vault: addr(0xa000 + i),
    founder: addr(0xf000 + i),
    demo: true,
    fundingDeadline: 0,
    milestones: [{}, {}, {}],
  }));
}
