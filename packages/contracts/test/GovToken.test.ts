import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { GovToken } from '../typechain-types';

describe('GovToken', () => {
  async function deploy() {
    const [admin, minter, alice, bob] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('GovToken');
    const token = (await factory.deploy(
      'RaiseDAO Vote',
      'rdVOTE',
      admin.address,
      minter.address,
    )) as unknown as GovToken;
    return { token, admin, minter, alice, bob };
  }

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
