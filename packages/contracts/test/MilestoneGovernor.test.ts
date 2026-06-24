import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, mine, time } from '@nomicfoundation/hardhat-network-helpers';
import type { MockUSDC, MilestoneGovernor, TimelockController } from '../typechain-types';
import { deployImpls, cloneGovToken, cloneVault } from './helpers';

const usdc = (n: bigint) => n * 1_000_000n;
const TIMELOCK_DELAY = 2 * 24 * 3600; // 2 days
const VOTING_DELAY = 1; // blocks
const VOTING_PERIOD = 50; // blocks
const QUORUM_PCT = 30;

const For = 1;
const Against = 0;

describe('MilestoneGovernor', () => {
  async function deploy() {
    const [deployer, founder, feeRecipient, alice, bob] = await ethers.getSigners();

    const usdcToken = (await (
      await ethers.getContractFactory('MockUSDC')
    ).deploy()) as unknown as MockUSDC;

    const { govImpl, vaultImpl, cloner } = await deployImpls();
    const govToken = await cloneGovToken(cloner, govImpl);
    const vault = await cloneVault(cloner, vaultImpl);

    const timelock = (await (
      await ethers.getContractFactory('TimelockController')
    ).deploy(TIMELOCK_DELAY, [], [], deployer.address)) as unknown as TimelockController;

    const governor = (await (
      await ethers.getContractFactory('MilestoneGovernor')
    ).deploy(
      await govToken.getAddress(),
      await timelock.getAddress(),
      founder.address,
      VOTING_DELAY,
      VOTING_PERIOD,
      0,
      QUORUM_PCT,
    )) as unknown as MilestoneGovernor;

    // timelock executes proposals -> it is the vault's governor and the proposer/executor
    await timelock.grantRole(await timelock.PROPOSER_ROLE(), await governor.getAddress());
    await timelock.grantRole(await timelock.CANCELLER_ROLE(), await governor.getAddress());
    await timelock.grantRole(await timelock.EXECUTOR_ROLE(), ethers.ZeroAddress);

    await govToken.initialize('RaiseDAO Vote', 'rdVOTE', founder.address, await vault.getAddress());
    await vault.initialize(
      await usdcToken.getAddress(),
      await govToken.getAddress(),
      founder.address,
      await timelock.getAddress(),
      feeRecipient.address,
      0,
      4_000_000_000n,
      [10_000],
      [4_000_100_000n],
    );

    // both investors fund the vault and self-delegate before any snapshot
    for (const who of [alice, bob]) {
      await usdcToken.mint(who.address, usdc(100n));
      await usdcToken.connect(who).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(who).contribute(usdc(100n));
      await govToken.connect(who).delegate(who.address);
    }

    const targets = [await vault.getAddress()];
    const values = [0];
    const calldatas = [vault.interface.encodeFunctionData('releaseMilestone', [0])];
    const description = 'Release milestone 0';
    const descHash = ethers.id(description);
    const proposalId = await governor.hashProposal(targets, values, calldatas, descHash);

    return {
      governor,
      vault,
      usdcToken,
      founder,
      feeRecipient,
      alice,
      bob,
      targets,
      values,
      calldatas,
      description,
      descHash,
      proposalId,
    };
  }

  it('lets only the founder propose', async () => {
    const { governor, alice, targets, values, calldatas, description } = await loadFixture(deploy);
    await expect(
      governor.connect(alice).propose(targets, values, calldatas, description),
    ).to.be.revertedWithCustomError(governor, 'NotFounder');
  });

  it('passes a quorate vote and executes the release through the timelock', async () => {
    const f = await loadFixture(deploy);
    const { governor, vault, usdcToken, founder, alice, proposalId } = f;

    await governor.connect(founder).propose(f.targets, f.values, f.calldatas, f.description);
    await mine(VOTING_DELAY + 1);
    await governor.connect(alice).castVote(proposalId, For); // 100 of 200 >= 30% quorum
    await mine(VOTING_PERIOD);
    expect(await governor.state(proposalId)).to.equal(4n); // Succeeded

    await governor.queue(f.targets, f.values, f.calldatas, f.descHash);
    await time.increase(TIMELOCK_DELAY + 1);
    await governor.execute(f.targets, f.values, f.calldatas, f.descHash);

    expect(await governor.state(proposalId)).to.equal(7n); // Executed
    expect(await usdcToken.balanceOf(founder.address)).to.equal(usdc(200n)); // full raise, 0 fee
    expect((await vault.milestones(0)).status).to.equal(4n); // MilestoneStatus.Released
  });

  it('defeats a vote that misses quorum and refuses to queue it', async () => {
    const f = await loadFixture(deploy);
    const { governor, alice, proposalId } = f;

    await governor.connect(f.founder).propose(f.targets, f.values, f.calldatas, f.description);
    await mine(VOTING_DELAY + 1);
    await governor.connect(alice).castVote(proposalId, Against);
    await mine(VOTING_PERIOD);

    expect(await governor.state(proposalId)).to.equal(3n); // Defeated
    await expect(
      governor.queue(f.targets, f.values, f.calldatas, f.descHash),
    ).to.be.revertedWithCustomError(governor, 'GovernorUnexpectedProposalState');
  });
});
