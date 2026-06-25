import { formatUnits } from 'viem';

/** Format a raw USDC uint256 string (6 decimals) as a human-readable dollar
 *  amount. The indexer stores raw on-chain values; 1_000_000 → "$1.00". */
export function fmtUSDC(raw: string): string {
  const n = Number(formatUnits(BigInt(raw), 6));
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

/** Format a raw governance token uint256 string (18 decimals) for display. */
export function fmtGov(raw: string): string {
  const n = Number(formatUnits(BigInt(raw), 18));
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(4);
}

/** Numeric USDC value for Recharts data arrays (6 decimals → JS number). */
export function toUSDCNum(raw: string): number {
  return Number(formatUnits(BigInt(raw), 6));
}
