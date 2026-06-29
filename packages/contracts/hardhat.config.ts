import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-verify';
import '@typechain/hardhat';
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.30',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'cancun',
      viaIR: true,
    },
  },
  typechain: {
    target: 'ethers-v6',
  },
  networks: {
    arbitrumSepolia: {
      url: process.env.RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  // Source verification via the Etherscan V2 multichain API. Arbiscan's own
  // standalone API keys were deprecated in 2025, so one Etherscan key now covers
  // every chain (Arbitrum Sepolia included). Get a free key at etherscan.io and
  // set ETHERSCAN_API_KEY in packages/contracts/.env, then `pnpm verify:factory`.
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY ?? '',
  },
  sourcify: { enabled: false },
};

export default config;
