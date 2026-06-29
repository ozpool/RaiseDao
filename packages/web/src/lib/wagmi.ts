import { http, createConfig, type Config } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

/** wagmi config for the only supported network (Arbitrum Sepolia, 421614). We run
 *  a custom connect menu (no third-party modal), so we register the injected
 *  connector directly; every other installed wallet (MetaMask, Brave, Rabby,
 *  Coinbase extension…) is added automatically by wagmi's EIP-6963 discovery,
 *  which is on by default. We deliberately omit the Coinbase mobile SDK connector
 *  — it eagerly loads an analytics client that spams the console (and is blocked
 *  by ad-blockers) without adding anything the 6963 extension path doesn't cover.
 *  ssr:true lets the App Router hydrate connection state without a mismatch. */
export const wagmiConfig: Config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected()],
  // A dedicated RPC (set NEXT_PUBLIC_RPC_URL) makes the app's own gas estimation
  // reliable; http(undefined) falls back to the public endpoint when unset.
  transports: { [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL) },
  ssr: true,
});

// Make wagmi hooks fully typed against this config across the app.
declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
