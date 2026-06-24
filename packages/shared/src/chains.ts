/** Minimal chain configuration shared by api and web. */
export interface ChainConfig {
  readonly id: number;
  readonly name: string;
  readonly rpcUrl: string;
  readonly explorerUrl: string;
  /** Circle USDC on this chain. Verify before any deploy. */
  readonly usdc: `0x${string}`;
}

/** Arbitrum Sepolia testnet — the only supported network for now. */
export const arbitrumSepolia: ChainConfig = {
  id: 421614,
  name: 'Arbitrum Sepolia',
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  explorerUrl: 'https://sepolia.arbiscan.io',
  usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
};

/** Registry of supported chains, keyed by chain id. */
export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  [arbitrumSepolia.id]: arbitrumSepolia,
};

/** Look up a supported chain or throw if it is not configured. */
export function getChain(chainId: number): ChainConfig {
  const chain = SUPPORTED_CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chainId: ${chainId}`);
  return chain;
}
