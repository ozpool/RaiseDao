/** Web runtime config. Only NEXT_PUBLIC_* vars reach the browser, so the API
 *  base URL is inlined at build time with a dev-friendly default. The SIWE
 *  domain/uri are derived from window.location at sign-in (see lib/siwe), so
 *  they always match wherever the app is served — no extra env to keep in sync. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** The deployed RaiseFactory address for the active network. Unset until the
 *  contracts are deployed (see packages/contracts/scripts/deploy.ts); the deploy
 *  UI degrades to a clear "not configured" state rather than guessing. */
const rawFactory = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
export const FACTORY_ADDRESS: `0x${string}` | undefined =
  rawFactory && /^0x[0-9a-fA-F]{40}$/.test(rawFactory) ? (rawFactory as `0x${string}`) : undefined;

/** Arbiscan base for the active testnet — used to link transactions/addresses. */
export const EXPLORER_URL = 'https://sepolia.arbiscan.io';

/** Circle USDC on Arbitrum Sepolia (6 decimals) — the contribution currency. */
export const USDC_ADDRESS: `0x${string}` = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
export const USDC_DECIMALS = 6;
