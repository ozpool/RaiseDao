import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import type { MockUSDC } from '../typechain-types';
import { deployImpls, cloneGovToken, cloneVault } from './helpers';

const FUNDING_DEADLINE = 4_000_000_000n; // far-future unix timestamp
const FEE_BPS = 200n; // 2% protocol fee
const PCT = [5_000, 5_000]; // two equal tranches
const DEADLINES = [4_000_100_000n, 4_000_200_000n];

const usdc = (n: bigint) => n * 1_000_000n; // 6-decimal helper
const MINTER_ROLE = ethers.id('MINTER_ROLE');

describe('RaiseVault', () => {
  async function deploy() {
    const [, founder, governor, feeRecipient, alice, bob] = await ethers.getSigners();

    const usdcToken = (await (
      await ethers.getContractFactory('MockUSDC')
    ).deploy()) as unknown as MockUSDC;

    const { govImpl, vaultImpl, cloner } = await deployImpls();
    const govToken = await cloneGovToken(cloner, govImpl);
    const vault = await cloneVault(cloner, vaultImpl);

    await govToken.initialize('RaiseDAO Vote', 'rdVOTE', founder.address, await vault.getAddress());
    await vault.initialize(
      await usdcToken.getAddress(),
      await govToken.getAddress(),
      founder.address,
      governor.address,
      feeRecipient.address,
      FEE_BPS,
      FUNDING_DEADLINE,
      PCT,
      DEADLINES,
    );

    for (const who of [alice, bob]) {
      await usdcToken.mint(who.address, usdc(1_000n));
      await usdcToken.connect(who).approve(await vault.getAddress(), ethers.MaxUint256);
    }

    return { usdcToken, govToken, vault, founder, governor, feeRecipient, alice, bob };
  }

  it('wires the minter role to the vault', async () => {
    const { govToken, vault } = await loadFixture(deploy);
    expect(await govToken.hasRole(MINTER_ROLE, await vault.getAddress())).to.equal(true);
  });

  it('pulls USDC and mints proportional voting power', async () => {
    const { usdcToken, govToken, vault, alice } = await loadFixture(deploy);
    await vault.connect(alice).contribute(usdc(100n));

    expect(await usdcToken.balanceOf(await vault.getAddress())).to.equal(usdc(100n));
    expect(await govToken.balanceOf(alice.address)).to.equal(usdc(100n));
    expect(await vault.totalRaised()).to.equal(usdc(100n));
  });

  it('rejects contributions after the funding deadline', async () => {
    const { vault, alice } = await loadFixture(deploy);
    await ethers.provider.send('evm_setNextBlockTimestamp', [Number(FUNDING_DEADLINE)]);
    await expect(vault.connect(alice).contribute(usdc(1n))).to.be.revertedWithCustomError(
      vault,
      'FundingClosed',
    );
  });

  it('releases a tranche to the founder net of fee, governor-only and in order', async () => {
    const { usdcToken, vault, founder, governor, feeRecipient, alice } = await loadFixture(deploy);
    await vault.connect(alice).contribute(usdc(100n));

    await expect(vault.connect(alice).releaseMilestone(0)).to.be.revertedWithCustomError(
      vault,
      'NotGovernor',
    );
    await expect(vault.connect(governor).releaseMilestone(1)).to.be.revertedWithCustomError(
      vault,
      'OutOfOrder',
    );

    await vault.connect(governor).releaseMilestone(0);
    const gross = usdc(50n); // 50% of 100
    const fee = (gross * FEE_BPS) / 10_000n;
    expect(await usdcToken.balanceOf(feeRecipient.address)).to.equal(fee);
    expect(await usdcToken.balanceOf(founder.address)).to.equal(gross - fee);
  });

  it('conserves funds across a full release: founder + fees == raised', async () => {
    const { usdcToken, vault, founder, governor, feeRecipient, alice, bob } =
      await loadFixture(deploy);
    await vault.connect(alice).contribute(usdc(60n));
    await vault.connect(bob).contribute(usdc(40n));

    await vault.connect(governor).releaseMilestone(0);
    await vault.connect(governor).releaseMilestone(1);

    const founderBal = await usdcToken.balanceOf(founder.address);
    const feeBal = await usdcToken.balanceOf(feeRecipient.address);
    expect(founderBal + feeBal).to.equal(usdc(100n));
    expect(await usdcToken.balanceOf(await vault.getAddress())).to.equal(0n);
  });

  it('opens pro-rata refunds on failure and burns shares', async () => {
    const { usdcToken, govToken, vault, governor, alice, bob } = await loadFixture(deploy);
    await vault.connect(alice).contribute(usdc(60n));
    await vault.connect(bob).contribute(usdc(40n));

    // first tranche releases, second fails -> refunds the remaining 50 USDC
    await vault.connect(governor).releaseMilestone(0);
    await vault.connect(governor).markFailed(1);

    await expect(vault.connect(alice).claimRefund())
      .to.emit(vault, 'Refunded')
      .withArgs(alice.address, usdc(30n)); // 60% of the 50 remaining
    expect(await govToken.balanceOf(alice.address)).to.equal(0n);

    await vault.connect(bob).claimRefund();
    expect(await usdcToken.balanceOf(bob.address)).to.equal(usdc(980n)); // 1000 - 40 + 20
    expect(await usdcToken.balanceOf(await vault.getAddress())).to.equal(0n);
  });

  it('blocks refunds before failure and double claims after', async () => {
    const { vault, governor, alice } = await loadFixture(deploy);
    await vault.connect(alice).contribute(usdc(100n));
    await expect(vault.connect(alice).claimRefund()).to.be.revertedWithCustomError(
      vault,
      'RefundsNotOpen',
    );

    await vault.connect(governor).markFailed(0);
    await vault.connect(alice).claimRefund();
    await expect(vault.connect(alice).claimRefund()).to.be.revertedWithCustomError(
      vault,
      'NothingToRefund',
    );
  });

  it('blocks releasing a milestone once the campaign has failed', async () => {
    const { vault, governor, alice } = await loadFixture(deploy);
    await vault.connect(alice).contribute(usdc(100n));
    await vault.connect(governor).markFailed(0);
    await expect(vault.connect(governor).releaseMilestone(1)).to.be.revertedWithCustomError(
      vault,
      'AlreadyFailed',
    );
  });

  it('rejects a second failure', async () => {
    const { vault, governor } = await loadFixture(deploy);
    await vault.connect(governor).markFailed(0);
    await expect(vault.connect(governor).markFailed(1)).to.be.revertedWithCustomError(
      vault,
      'AlreadyFailed',
    );
  });

  it('forceFail reverts before the milestone deadline', async () => {
    const { vault, alice } = await loadFixture(deploy);
    await vault.connect(alice).contribute(usdc(100n));
    await expect(vault.connect(alice).forceFail()).to.be.revertedWithCustomError(
      vault,
      'DeadlineNotReached',
    );
  });

  it('forceFail opens refunds for anyone once the deadline passes', async () => {
    const { vault, usdcToken, alice } = await loadFixture(deploy);
    await vault.connect(alice).contribute(usdc(100n));
    await ethers.provider.send('evm_setNextBlockTimestamp', [Number(DEADLINES[0]) + 1]);
    await vault.connect(alice).forceFail();

    expect(await vault.refundsOpen()).to.equal(true);
    await vault.connect(alice).claimRefund();
    expect(await usdcToken.balanceOf(alice.address)).to.equal(usdc(1_000n)); // full contribution back
  });
});
