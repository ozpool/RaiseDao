import type { Abi, PublicClient } from 'viem';

/** Headroom on the gas *limit*. Arbitrum's gas has an L1 data component that
 *  wallets routinely under-estimate, which makes a tx "run out of gas". +30%
 *  absorbs that; you only pay for gas actually used, the limit is just a ceiling. */
const GAS_BUFFER_PCT = 130n;

/** Multiplier on the current base fee for maxFeePerGas. The base fee can tick up
 *  between estimate and submit; 2x base (+ tip) keeps the tx from being rejected
 *  with "max fee per gas less than block base fee" without overpaying — unused
 *  fee is refunded, you're only ever charged base + tip. */
const FEE_BASE_MULTIPLIER = 2n;

/** Overrides we hand the wallet so a transaction neither runs out of gas nor is
 *  rejected for an under-priced fee — set automatically, no manual bumping. */
export interface TxOverrides {
  gas?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

interface GasRequest {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}

/**
 * Compute gas-limit + fee overrides for a write, using the app's own RPC and live
 * network conditions, so transactions don't fail and you never bump gas by hand.
 *
 * Every field is best-effort: any failure (RPC hiccup, estimation revert) leaves
 * that field unset, so the caller spreads a partial/empty object and the wallet
 * falls back to its own estimate for whatever's missing. It can only help.
 */
export async function txOverrides(
  publicClient: PublicClient | undefined,
  account: `0x${string}` | undefined,
  req: GasRequest,
): Promise<TxOverrides> {
  const out: TxOverrides = {};
  if (!publicClient || !account) return out;

  // Gas limit: estimate + buffer so the tx never runs out of gas.
  try {
    const estimate = await publicClient.estimateContractGas({
      address: req.address,
      abi: req.abi,
      functionName: req.functionName,
      args: req.args,
      account,
      value: req.value,
    } as Parameters<PublicClient['estimateContractGas']>[0]);
    out.gas = (estimate * GAS_BUFFER_PCT) / 100n;
  } catch {
    // leave gas unset → wallet estimates the limit
  }

  // Gas fee: set maxFeePerGas comfortably above the current base fee so the node
  // never rejects it ("max fee per gas less than block base fee").
  try {
    const block = await publicClient.getBlock({ blockTag: 'latest' });
    const base = block.baseFeePerGas ?? 0n;
    if (base > 0n) {
      let priority = 0n;
      try {
        priority = await publicClient.estimateMaxPriorityFeePerGas();
      } catch {
        priority = 0n; // Arbitrum typically has no priority-fee market
      }
      out.maxPriorityFeePerGas = priority;
      out.maxFeePerGas = base * FEE_BASE_MULTIPLIER + priority;
    }
  } catch {
    // leave fees unset → wallet sets them from its own estimate
  }

  return out;
}
