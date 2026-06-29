import { run, network } from 'hardhat';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Publish the deployed contracts' source to the block explorer (Arbiscan), so
 * anyone can read and check the code behind a campaign instead of trusting raw
 * bytecode. Reads the addresses this network's deploy wrote to
 * deployments/<network>.json and submits each one.
 *
 *   pnpm -F @raisedao/contracts verify:factory
 *
 * Requires ETHERSCAN_API_KEY (free from etherscan.io — one key works across all
 * chains via the Etherscan V2 API) in packages/contracts/.env.
 *
 * Note on the per-campaign contracts: the per-campaign Vault and GovToken are
 * EIP-1167 minimal-proxy CLONES of the implementations verified here, so once the
 * implementations are verified Arbiscan auto-marks every clone as a "Similar
 * Match" (verified) — no per-campaign step needed. The per-campaign Governor and
 * Timelock are full deployments with unique constructor args; verify those
 * individually with `hardhat verify <address> <args...>` if you want their source
 * shown too.
 */

interface Deployment {
  factory: string;
  usdc: string;
  feeRecipient: string;
  protocolFeeBps: number;
  govTokenImpl: string;
  vaultImpl: string;
  timelockDeployer: string;
  governorDeployer: string;
}

async function verify(address: string, constructorArguments: unknown[] = []) {
  try {
    await run('verify:verify', { address, constructorArguments });
    console.log(`✓ verified ${address}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // "Already Verified" is a success for our purposes, not a failure.
    if (/already verified/i.test(msg)) console.log(`• already verified ${address}`);
    else console.error(`✗ ${address}: ${msg}`);
  }
}

async function main() {
  const file = join(__dirname, '..', 'deployments', `${network.name}.json`);
  const d = JSON.parse(readFileSync(file, 'utf8')) as Deployment;

  console.log(`Verifying ${network.name} contracts from ${file}\n`);

  // Implementations + deployer helpers have no constructor arguments.
  await verify(d.govTokenImpl);
  await verify(d.vaultImpl);
  await verify(d.timelockDeployer);
  await verify(d.governorDeployer);

  // The factory's constructor args must match the deploy exactly, in order.
  await verify(d.factory, [
    d.usdc,
    d.feeRecipient,
    d.protocolFeeBps,
    d.govTokenImpl,
    d.vaultImpl,
    d.timelockDeployer,
    d.governorDeployer,
  ]);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
