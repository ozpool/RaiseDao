import { ethers } from 'hardhat';
import type { GovToken, RaiseVault, TestClones } from '../typechain-types';

/** Deploy the cloneable implementations plus the test cloning helper. */
export async function deployImpls() {
  const govImpl = await (await ethers.getContractFactory('GovToken')).deploy();
  const vaultImpl = await (await ethers.getContractFactory('RaiseVault')).deploy();
  const cloner = (await (
    await ethers.getContractFactory('TestClones')
  ).deploy()) as unknown as TestClones;
  return { govImpl, vaultImpl, cloner };
}

/** Clone an implementation through the EIP-1167 helper and return the proxy. */
async function cloneAddr(cloner: TestClones, impl: { getAddress: () => Promise<string> }) {
  await cloner.clone(await impl.getAddress());
  return cloner.last();
}

export async function cloneGovToken(
  cloner: TestClones,
  impl: { getAddress: () => Promise<string> },
) {
  return (await ethers.getContractAt(
    'GovToken',
    await cloneAddr(cloner, impl),
  )) as unknown as GovToken;
}

export async function cloneVault(cloner: TestClones, impl: { getAddress: () => Promise<string> }) {
  return (await ethers.getContractAt(
    'RaiseVault',
    await cloneAddr(cloner, impl),
  )) as unknown as RaiseVault;
}
