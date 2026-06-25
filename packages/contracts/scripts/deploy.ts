import { ethers, network } from 'hardhat';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Deploy the RaiseFactory and the shared pieces it needs (the cloneable GovToken
 * and RaiseVault implementations, plus the timelock/governor deployer helpers).
 * Per-campaign contracts are cloned later by the factory at deploy() time.
 *
 *   pnpm -F @raisedao/contracts deploy:factory   (uses the arbitrumSepolia network)
 *
 * Requires DEPLOYER_PRIVATE_KEY (a funded testnet key) and optionally RPC_URL in
 * packages/contracts/.env. The factory address it prints goes into the web and
 * api env as NEXT_PUBLIC_FACTORY_ADDRESS / FACTORY_ADDRESS.
 */

// Circle USDC on Arbitrum Sepolia. Override with USDC_ADDRESS for other networks.
const DEFAULT_USDC = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';

async function deployContract(name: string, ...args: unknown[]) {
  const contract = await (await ethers.getContractFactory(name)).deploy(...args);
  await contract.waitForDeployment();
  return contract.getAddress();
}

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error('No signer — set DEPLOYER_PRIVATE_KEY in packages/contracts/.env');

  const usdc = process.env.USDC_ADDRESS ?? DEFAULT_USDC;
  const feeRecipient = process.env.FEE_RECIPIENT ?? deployer.address;
  const protocolFeeBps = Number(process.env.PROTOCOL_FEE_BPS ?? 200);

  console.log(`Deploying on ${network.name} from ${deployer.address}`);
  console.log(`USDC ${usdc} · feeRecipient ${feeRecipient} · fee ${protocolFeeBps}bps`);

  const govTokenImpl = await deployContract('GovToken');
  const vaultImpl = await deployContract('RaiseVault');
  const timelockDeployer = await deployContract('TimelockDeployer');
  const governorDeployer = await deployContract('GovernorDeployer');
  const factory = await deployContract(
    'RaiseFactory',
    usdc,
    feeRecipient,
    protocolFeeBps,
    govTokenImpl,
    vaultImpl,
    timelockDeployer,
    governorDeployer,
  );

  const record = {
    network: network.name,
    factory,
    usdc,
    feeRecipient,
    protocolFeeBps,
    govTokenImpl,
    vaultImpl,
    timelockDeployer,
    governorDeployer,
  };

  const dir = join(__dirname, '..', 'deployments');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${network.name}.json`), `${JSON.stringify(record, null, 2)}\n`);

  console.table(record);
  console.log('\nAdd to packages/web/.env.local:');
  console.log(`  NEXT_PUBLIC_FACTORY_ADDRESS=${factory}`);
  console.log('Add to packages/api/.env:');
  console.log(`  FACTORY_ADDRESS=${factory}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
