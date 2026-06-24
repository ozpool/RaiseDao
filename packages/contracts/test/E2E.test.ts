import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, mine, time } from '@nomicfoundation/hardhat-network-helpers';
import type {
  MockUSDC,
  RaiseFactory,
  GovToken,
  RaiseVault,
  MilestoneGovernor,
} from '../typechain-types';

const usdc = (n: bigint) => n * 1_000_000n;
const FEE_BPS = 200; // 2%, set on the factory
const TIMELOCK_DELAY = 2 * 24 * 3600;
const VOTING_DELAY = 1;
const VOTING_PERIOD = 50;

function params(founder: string, action: 'release' | 'fail') {
  return {
    founder,
    fundingDeadline: 4_000_000_000n,
    pctBps: [10_000],
    deadlines: [4_000_100_000n],
    votingDelay: VOTING_DELAY,
    votingPeriod: VOTING_PERIOD,
    proposalThreshold: 0,
    quorumNumerator: 30,
    timelockDelay: TIMELOCK_DELAY,
    tokenName: 'RaiseDAO Vote',
    tokenSymbol: 'rdVOTE',
    action,
  };
}

describe('End-to-end campaign', () => {
  async function deploy() {
    const [, founder, feeRecipient, alice, bob] = await ethers.getSigners();
    const usdcToken = (await (
      await ethers.getContractFactory('MockUSDC')
    ).deploy()) as unknown as MockUSDC;
    const govImpl = await (await ethers.getContractFactory('GovToken')).deploy();
    const vaultImpl = await (await ethers.getContractFactory('RaiseVault')).deploy();
    const timelockDeployer = await (await ethers.getContractFactory('TimelockDeployer')).deploy();
    const governorDeployer = await (await ethers.getContractFactory('GovernorDeployer')).deploy();
    const factory = (await (
      await ethers.getContractFactory('RaiseFactory')
    ).deploy(
      await usdcToken.getAddress(),
      feeRecipient.address,
      FEE_BPS,
      await govImpl.getAddress(),
      await vaultImpl.getAddress(),
      await timelockDeployer.getAddress(),
      await governorDeployer.getAddress(),
    )) as unknown as RaiseFactory;
    return { factory, usdcToken, founder, feeRecipient, alice, bob };
  }

  /** Launch a campaign and have both investors fund it and self-delegate. */
  async function launchAndFund(
    factory: RaiseFactory,
    usdcToken: MockUSDC,
    founder: string,
    investors: { address: string }[],
  ) {
    const tx = await factory.deploy(params(founder, 'release'));
    const rc = await tx.wait();
    const ev = rc!.logs
      .map((l) => {
        try {
          return factory.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === 'CampaignDeployed')!;

    const vault = (await ethers.getContractAt(
      'RaiseVault',
      ev.args.vault,
    )) as unknown as RaiseVault;
    const token = (await ethers.getContractAt('GovToken', ev.args.token)) as unknown as GovToken;
    const governor = (await ethers.getContractAt(
      'MilestoneGovernor',
      ev.args.governor,
    )) as unknown as MilestoneGovernor;

    for (const who of investors) {
      const signer = await ethers.getSigner(who.address);
      await usdcToken.mint(who.address, usdc(100n));
      await usdcToken.connect(signer).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(signer).contribute(usdc(100n));
      await token.connect(signer).delegate(who.address);
    }
    return { vault, token, governor };
  }

  /** Drive a proposal calling `fn(arg)` on the vault through to execution. */
  async function passProposal(
    governor: MilestoneGovernor,
    vault: RaiseVault,
    founder: { address: string },
    voter: { address: string },
    fn: 'releaseMilestone' | 'markFailed',
  ) {
    const targets = [await vault.getAddress()];
    const values = [0];
    const calldatas = [vault.interface.encodeFunctionData(fn as 'releaseMilestone', [0])];
    const descHash = ethers.id(`${fn} 0`);
    const founderS = await ethers.getSigner(founder.address);
    const voterS = await ethers.getSigner(voter.address);

    await governor.connect(founderS).propose(targets, values, calldatas, `${fn} 0`);
    const id = await governor.hashProposal(targets, values, calldatas, descHash);
    await mine(VOTING_DELAY + 1);
    await governor.connect(voterS).castVote(id, 1); // For
    await mine(VOTING_PERIOD);
    await governor.queue(targets, values, calldatas, descHash);
    await time.increase(TIMELOCK_DELAY + 1);
    await governor.execute(targets, values, calldatas, descHash);
  }

  it('launch -> fund -> vote -> release pays the founder net of fee', async () => {
    const { factory, usdcToken, founder, feeRecipient, alice, bob } = await loadFixture(deploy);
    const { vault, governor } = await launchAndFund(factory, usdcToken, founder.address, [
      alice,
      bob,
    ]);

    await passProposal(governor, vault, founder, alice, 'releaseMilestone');

    const fee = (usdc(200n) * BigInt(FEE_BPS)) / 10_000n;
    expect(await usdcToken.balanceOf(founder.address)).to.equal(usdc(200n) - fee);
    expect(await usdcToken.balanceOf(feeRecipient.address)).to.equal(fee);
    expect((await vault.milestones(0)).status).to.equal(4n); // Released
  });

  it('launch -> fund -> vote -> fail lets investors claim refunds', async () => {
    const { factory, usdcToken, founder, alice, bob } = await loadFixture(deploy);
    const { vault, governor } = await launchAndFund(factory, usdcToken, founder.address, [
      alice,
      bob,
    ]);

    await passProposal(governor, vault, founder, alice, 'markFailed');

    expect(await vault.refundsOpen()).to.equal(true);
    const aliceS = await ethers.getSigner(alice.address);
    await vault.connect(aliceS).claimRefund();
    // full raise still in the vault at failure, so alice gets her 100 back
    expect(await usdcToken.balanceOf(alice.address)).to.equal(usdc(100n));
  });
});
