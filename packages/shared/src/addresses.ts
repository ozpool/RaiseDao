/** Deployed contract addresses resolved at runtime from validated env. */
export interface ContractAddresses {
  /** The RaiseFactory that deploys per-campaign contract trios (issue #9). */
  readonly factory: `0x${string}`;
}

/**
 * Build the address registry from a validated factory address. Per-campaign
 * vault/token/governor addresses are discovered from chain events by the indexer
 * (issue #14), not hard-coded here.
 */
export function getContractAddresses(factory: `0x${string}`): ContractAddresses {
  return { factory };
}
