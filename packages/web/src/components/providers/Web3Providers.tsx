'use client';

import { useState, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { AuthSync } from './AuthSync';

/** Wallet + server-state context for the whole app. wagmi needs a React Query
 *  client; we hold it in state so it survives re-renders but is created once per
 *  client. Mounted at the root so any page can read the connected account. */
export function Web3Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthSync />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
