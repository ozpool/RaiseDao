/**
 * Minimal RaiseFactory ABI — just what the deploy flow needs: the
 * `deploy(CampaignParams)` entrypoint and the `CampaignDeployed` event (parsed
 * for the vault/token/governor addresses). Kept local to web and self-contained,
 * matching how the API keeps its own event ABIs (no artifact/typechain
 * dependency). `as const` so viem/wagmi infer argument and return types.
 */
export const raiseFactoryAbi = [
  {
    type: 'function',
    name: 'deploy',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'p',
        type: 'tuple',
        components: [
          { name: 'founder', type: 'address' },
          { name: 'fundingDeadline', type: 'uint64' },
          { name: 'pctBps', type: 'uint16[]' },
          { name: 'deadlines', type: 'uint64[]' },
          { name: 'votingDelay', type: 'uint48' },
          { name: 'votingPeriod', type: 'uint32' },
          { name: 'proposalThreshold', type: 'uint256' },
          { name: 'quorumNumerator', type: 'uint256' },
          { name: 'timelockDelay', type: 'uint256' },
          { name: 'tokenName', type: 'string' },
          { name: 'tokenSymbol', type: 'string' },
        ],
      },
    ],
    outputs: [
      { name: 'vault', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'governor', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'CampaignDeployed',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'vault', type: 'address', indexed: false },
      { name: 'token', type: 'address', indexed: false },
      { name: 'governor', type: 'address', indexed: false },
      { name: 'founder', type: 'address', indexed: true },
    ],
  },
] as const;

/** Minimal ERC-20 — the USDC reads/writes the contribute flow needs. */
export const erc20Abi = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

/** Minimal RaiseVault ABI — contribute plus the event carrying minted votes. */
export const raiseVaultAbi = [
  {
    type: 'function',
    name: 'contribute',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Contributed',
    inputs: [
      { name: 'investor', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'votesMinted', type: 'uint256', indexed: false },
    ],
  },
] as const;
