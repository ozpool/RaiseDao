import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployImpls, cloneGovToken } from './helpers';

describe('GovToken', () => {
  async function deploy() {
    const [admin, minter, alice, bob] = await ethers.getSigners();
    const { govImpl, cloner } = await deployImpls();
    const token = await cloneGovToken(cloner, govImpl);
    await token.initialize('RaiseDAO Vote', 'rdVOTE', admin.address, minter.address);
    return { token, admin, minter, alice, bob };
  }

  it('cannot re-initialize a clone', async () => {
    const { token, admin, minter } = await deploy();
    await expect(
      token.initialize('x', 'x', admin.address, minter.address),
    ).to.be.revertedWithCustomError(token, 'InvalidInitialization');
  });

  it('mints only via MINTER_ROLE', async () => {
    const { token, minter, alice } = await deploy();
    await token.connect(minter).mint(alice.address, 100n);
    expect(await token.balanceOf(alice.address)).to.equal(100n);
    await expect(token.connect(alice).mint(alice.address, 1n)).to.be.revertedWithCustomError(
      token,
      'AccessControlUnauthorizedAccount',
    );
  });

  it('is soulbound: wallet-to-wallet transfers revert', async () => {
    const { token, minter, alice, bob } = await deploy();
    await token.connect(minter).mint(alice.address, 100n);
    await expect(token.connect(alice).transfer(bob.address, 1n)).to.be.revertedWithCustomError(
      token,
      'Soulbound',
    );
  });

  it('allows burn via MINTER_ROLE', async () => {
    const { token, minter, alice } = await deploy();
    await token.connect(minter).mint(alice.address, 100n);
    await token.connect(minter).burn(alice.address, 40n);
    expect(await token.balanceOf(alice.address)).to.equal(60n);
  });

  it('tracks voting power after self-delegation', async () => {
    const { token, minter, alice } = await deploy();
    await token.connect(minter).mint(alice.address, 100n);
    expect(await token.getVotes(alice.address)).to.equal(0n);
    await token.connect(alice).delegate(alice.address);
    expect(await token.getVotes(alice.address)).to.equal(100n);
  });
});
