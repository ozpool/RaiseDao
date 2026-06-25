import { http, createConfig } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

/** wagmi config for the only supported network (Arbitrum Sepolia, 421614).
 *  Custom connect UI, so just the injected connector — no WalletConnect modal.
 *  ssr:true lets the App Router hydrate connection state without a mismatch. */
export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected()],
  transports: { [arbitrumSepolia.id]: http() },
  ssr: true,
});

// Make wagmi hooks fully typed against this config across the app.
declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
