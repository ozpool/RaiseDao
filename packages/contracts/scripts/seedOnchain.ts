import { ethers, network } from 'hardhat';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Seed REAL on-chain demo activity so the dashboards (which read indexer-synced
 * Contributed / VoteCast / MilestoneReleased events) actually fill with graphs.
 *
 * It runs the full lifecycle on two campaigns with deliberately tiny governance
 * timings, so the whole vote -> queue -> execute cycle finishes in minutes:
 *
 *   Campaign 1: founder = wallet A, investor = wallet B  -> milestone 0 released
 *   Campaign 2: founder = wallet B, investor = wallet A  -> milestone 0 released
 *
 * That leaves BOTH wallets with founder data (a release) AND investor data (a
 * contribution + a vote), so both /dashboard views light up.
 *
 *   pnpm -F @raisedao/contracts seed:onchain   (uses the arbitrumSepolia network)
 *
 * Requirements (the script checks and fails loudly if any are missing):
 *   - DEMO_PK_A and DEMO_PK_B in packages/contracts/.env (testnet keys ONLY).
 *   - Both wallets funded with Arbitrum Sepolia ETH (gas) and test USDC.
 *   - FACTORY_ADDRESS in env, or a deployments/<network>.json on disk.
 *   - The API running with INDEXER_ENABLED=true so it syncs what this writes.
 */

const DEFAULT_USDC = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const DAY = 86_400;
const USDC_DECIMALS = 6n;

/** OpenZeppelin Governor proposal states. */
enum ProposalState {
  Pending,
  Active,
  Canceled,
  Defeated,
  Succeeded,
  Queued,
  Expired,
  Executed,
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function requireEnvKey(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in packages/contracts/.env (testnet key only)`);
  return v.startsWith('0x') ? v : `0x${v}`;
}

function factoryAddress(): string {
  if (process.env.FACTORY_ADDRESS) return process.env.FACTORY_ADDRESS;
  const file = join(__dirname, '..', 'deployments', `${network.name}.json`);
  const record = JSON.parse(readFileSync(file, 'utf8')) as { factory?: string };
  if (!record.factory) throw new Error(`No factory in ${file} and FACTORY_ADDRESS unset`);
  return record.factory;
}

/** Poll the governor until the proposal reaches `target` (or a terminal state). */
async function waitForState(
  governor: Awaited<ReturnType<typeof ethers.getContractAt>>,
  proposalId: bigint,
  target: ProposalState,
  label: string,
  timeoutMs = 240_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const state = Number(
      await (governor as unknown as { state(id: bigint): Promise<bigint> }).state(proposalId),
    );
    if (state === target) return;
    if (
      state === ProposalState.Defeated ||
      state === ProposalState.Canceled ||
      state === ProposalState.Expired
    ) {
      throw new Error(`Proposal entered ${ProposalState[state]} while waiting for ${label}`);
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${label} (still ${ProposalState[state]})`);
    }
    console.log(`   …${label}: currently ${ProposalState[state]}, polling`);
    await sleep(6_000);
  }
}

interface CampaignResult {
  id: bigint;
  vault: string;
  token: string;
  governor: string;
}

/** Deploy one campaign and return its addresses + factory id. */
async function deployCampaign(
  factory: Awaited<ReturnType<typeof ethers.getContractAt>>,
  founder: string,
  name: string,
  symbol: string,
): Promise<CampaignResult> {
  const now = Math.floor(Date.now() / 1000);
  const params = {
    founder,
    fundingDeadline: BigInt(now + 7 * DAY),
    pctBps: [5000, 5000],
    deadlines: [BigInt(now + 30 * DAY), BigInt(now + 60 * DAY)],
    votingDelay: 1n, // clock units (token uses block.number)
    votingPeriod: 12n, // short window — votes are cast immediately after Active
    proposalThreshold: 0n, // factory requires zero (founders hold no votes)
    quorumNumerator: 4n, // 4% of token supply
    timelockDelay: 10n, // seconds before a queued release can execute
    tokenName: name,
    tokenSymbol: symbol,
  };

  const tx = await (
    factory as unknown as { deploy(p: typeof params): Promise<{ wait(): Promise<unknown> }> }
  ).deploy(params);
  const receipt = (await tx.wait()) as { logs: { topics: string[]; data: string }[] };

  const iface = factory.interface;
  for (const log of receipt.logs) {
    let parsed;
    try {
      parsed = iface.parseLog(log);
    } catch {
      continue;
    }
    if (parsed?.name === 'CampaignDeployed') {
      return {
        id: parsed.args.id as bigint,
        vault: parsed.args.vault as string,
        token: parsed.args.token as string,
        governor: parsed.args.governor as string,
      };
    }
  }
  throw new Error('CampaignDeployed event not found in deploy receipt');
}

/** Run the full fund -> vote -> release flow for one campaign. */
async function runLifecycle(
  founderWallet: ReturnType<typeof newWallet>,
  investorWallet: ReturnType<typeof newWallet>,
  campaign: CampaignResult,
  usdcAddr: string,
  contribAmount: bigint,
): Promise<void> {
  const usdc = await ethers.getContractAt('IERC20', usdcAddr, investorWallet);
  const vault = await ethers.getContractAt('RaiseVault', campaign.vault, investorWallet);
  const token = await ethers.getContractAt('GovToken', campaign.token, investorWallet);
  const governor = await ethers.getContractAt(
    'MilestoneGovernor',
    campaign.governor,
    founderWallet,
  );

  // 1. Contribute USDC (approve, then contribute) — mints soulbound votes.
  console.log(`   investor ${investorWallet.address} approving + contributing`);
  await (
    await (
      usdc as unknown as { approve(s: string, a: bigint): Promise<{ wait(): Promise<unknown> }> }
    ).approve(campaign.vault, contribAmount)
  ).wait();
  await (
    await (
      vault as unknown as { contribute(a: bigint): Promise<{ wait(): Promise<unknown> }> }
    ).contribute(contribAmount)
  ).wait();

  // 2. Activate voting power (self-delegate).
  console.log('   investor self-delegating');
  await (
    await (
      token as unknown as { delegate(a: string): Promise<{ wait(): Promise<unknown> }> }
    ).delegate(investorWallet.address)
  ).wait();

  // 3. Founder opens the milestone-0 release vote.
  const description = `Release milestone 0 for ${campaign.vault} — evidence ipfs://bafkreidemoevidenceplaceholderseedonchain00000000000000`;
  const calldata = vault.interface.encodeFunctionData('releaseMilestone', [0]);
  const targets = [campaign.vault];
  const values = [0n];
  const calldatas = [calldata];
  const descHash = ethers.id(description);

  console.log('   founder proposing release');
  await (
    await (
      governor as unknown as {
        propose(
          t: string[],
          v: bigint[],
          c: string[],
          d: string,
        ): Promise<{ wait(): Promise<unknown> }>;
      }
    ).propose(targets, values, calldatas, description)
  ).wait();
  const proposalId = await (
    governor as unknown as {
      hashProposal(t: string[], v: bigint[], c: string[], h: string): Promise<bigint>;
    }
  ).hashProposal(targets, values, calldatas, descHash);

  // 4. Investor votes For once the proposal is Active.
  await waitForState(governor, proposalId, ProposalState.Active, 'voting to open');
  console.log('   investor casting vote (For)');
  const governorAsInvestor = governor.connect(investorWallet);
  await (
    await (
      governorAsInvestor as unknown as {
        castVote(id: bigint, s: number): Promise<{ wait(): Promise<unknown> }>;
      }
    ).castVote(proposalId, 1)
  ).wait();

  // 5. Queue through the timelock once the vote Succeeds.
  await waitForState(governor, proposalId, ProposalState.Succeeded, 'vote to succeed');
  console.log('   queueing release');
  await (
    await (
      governor as unknown as {
        queue(
          t: string[],
          v: bigint[],
          c: string[],
          h: string,
        ): Promise<{ wait(): Promise<unknown> }>;
      }
    ).queue(targets, values, calldatas, descHash)
  ).wait();

  // 6. Execute after the timelock eta passes.
  await waitForState(governor, proposalId, ProposalState.Queued, 'queue to confirm');
  const eta = await (
    governor as unknown as { proposalEta(id: bigint): Promise<bigint> }
  ).proposalEta(proposalId);
  const waitMs = Math.max(0, Number(eta) * 1000 - Date.now()) + 3_000;
  console.log(`   waiting ~${Math.ceil(waitMs / 1000)}s for the timelock`);
  await sleep(waitMs);
  console.log('   executing release');
  await (
    await (
      governor as unknown as {
        execute(
          t: string[],
          v: bigint[],
          c: string[],
          h: string,
        ): Promise<{ wait(): Promise<unknown> }>;
      }
    ).execute(targets, values, calldatas, descHash)
  ).wait();
  console.log('   ✔ milestone 0 released');
}

function newWallet(pk: string) {
  return new ethers.Wallet(pk, ethers.provider);
}

async function main() {
  const walletA = newWallet(requireEnvKey('DEMO_PK_A'));
  const walletB = newWallet(requireEnvKey('DEMO_PK_B'));
  const usdcAddr = process.env.USDC_ADDRESS ?? DEFAULT_USDC;
  const contribAmount = BigInt(process.env.CONTRIB_USDC ?? '50') * 10n ** USDC_DECIMALS;
  const factoryAddr = factoryAddress();

  console.log(`Network ${network.name} · factory ${factoryAddr}`);
  console.log(`Wallet A ${walletA.address}`);
  console.log(`Wallet B ${walletB.address}`);
  console.log(`USDC ${usdcAddr} · contribution ${contribAmount} (raw, 6dp)\n`);

  const factoryA = await ethers.getContractAt('RaiseFactory', factoryAddr, walletA);
  const factoryB = await ethers.getContractAt('RaiseFactory', factoryAddr, walletB);

  console.log('Campaign 1 — founder A, investor B');
  const c1 = await deployCampaign(factoryA, walletA.address, 'Helix Bio', 'HELIX');
  console.log(`   deployed id=${c1.id} vault=${c1.vault}`);
  await runLifecycle(walletA, walletB, c1, usdcAddr, contribAmount);

  console.log('\nCampaign 2 — founder B, investor A');
  const c2 = await deployCampaign(factoryB, walletB.address, 'Aurora Grid', 'AUREO');
  console.log(`   deployed id=${c2.id} vault=${c2.vault}`);
  await runLifecycle(walletB, walletA, c2, usdcAddr, contribAmount);

  console.log('\n✅ Done. Both wallets now have founder + investor on-chain activity.');
  console.log('The in-process indexer will sync it into MongoDB within a poll cycle,');
  console.log('and both /dashboard views will show populated charts.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
