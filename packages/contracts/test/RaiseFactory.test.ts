import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import type { MockUSDC, RaiseFactory, GovToken, RaiseVault } from '../typechain-types';

const usdc = (n: bigint) => n * 1_000_000n;
const MINTER_ROLE = ethers.id('MINTER_ROLE');
const FEE_BPS = 200; // 2%

function params(founder: string) {
  return {
    founder,
    fundingDeadline: 4_000_000_000n,
    pctBps: [10_000],
    deadlines: [4_000_100_000n],
    votingDelay: 1,
    votingPeriod: 50,
    proposalThreshold: 0,
    quorumNumerator: 30,
    timelockDelay: 2 * 24 * 3600,
    tokenName: 'RaiseDAO Vote',
    tokenSymbol: 'rdVOTE',
  };
}

describe('RaiseFactory', () => {
  async function deploy() {
    const [deployer, founder, feeRecipient, alice] = await ethers.getSigners();

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

    return { factory, usdcToken, deployer, founder, feeRecipient, alice };
  }

  /** Run factory.deploy and pull the addresses out of the CampaignDeployed event. */
  async function launch(factory: RaiseFactory, founder: string) {
    const tx = await factory.deploy(params(founder));
    const rc = await tx.wait();
    const ev = rc!.logs
      .map((l) => {
        try {
          return factory.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === 'CampaignDeployed');
    return {
      id: ev!.args.id as bigint,
      vault: (await ethers.getContractAt('RaiseVault', ev!.args.vault)) as unknown as RaiseVault,
      token: (await ethers.getContractAt('GovToken', ev!.args.token)) as unknown as GovToken,
      governor: ev!.args.governor as string,
    };
  }

  it('deploys a campaign and emits CampaignDeployed', async () => {
    const { factory, founder } = await loadFixture(deploy);
    const { id, vault, token, governor } = await launch(factory, founder.address);

    expect(id).to.equal(0n);
    expect(await vault.founder()).to.equal(founder.address);
    expect(await vault.govToken()).to.equal(await token.getAddress());
    expect(ethers.isAddress(governor)).to.equal(true);
    expect(await factory.campaignCount()).to.equal(1n);
  });

  it('wires roles so the vault mints and the timelock governs', async () => {
    const { factory, founder } = await loadFixture(deploy);
    const { vault, token } = await launch(factory, founder.address);

    expect(await token.hasRole(MINTER_ROLE, await vault.getAddress())).to.equal(true);
    expect(await token.hasRole(ethers.ZeroHash, founder.address)).to.equal(true); // admin
    expect(await vault.protocolFeeBps()).to.equal(FEE_BPS);
    // the vault's governor is the per-campaign timelock, not an EOA
    expect(await vault.governor()).to.not.equal(founder.address);
  });

  it('lets an investor contribute through a cloned campaign', async () => {
    const { factory, usdcToken, founder, alice } = await loadFixture(deploy);
    const { vault, token } = await launch(factory, founder.address);

    await usdcToken.mint(alice.address, usdc(500n));
    await usdcToken.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
    await vault.connect(alice).contribute(usdc(250n));

    expect(await usdcToken.balanceOf(await vault.getAddress())).to.equal(usdc(250n));
    expect(await token.balanceOf(alice.address)).to.equal(usdc(250n));
  });

  it('isolates campaigns: each gets distinct contracts', async () => {
    const { factory, founder } = await loadFixture(deploy);
    const a = await launch(factory, founder.address);
    const b = await launch(factory, founder.address);

    expect(b.id).to.equal(1n);
    expect(await a.vault.getAddress()).to.not.equal(await b.vault.getAddress());
    expect(await a.token.getAddress()).to.not.equal(await b.token.getAddress());
    expect(a.governor).to.not.equal(b.governor);
  });
});
