import { ethers } from 'ethers';

/** Resolves the on-chain founder of a deployed vault, or null when it can't be
 *  determined (the address isn't a campaign vault, or the RPC is unreachable).
 *  The campaign-create route uses this to refuse persisting metadata for a vault
 *  the caller doesn't actually own — without it, anyone could claim-jack a vault
 *  address and squat its public page. */
export type FounderVerifier = (vault: string) => Promise<string | null>;

// Only the one getter we need; the vault exposes `founder` publicly.
const VAULT_ABI = ['function founder() view returns (address)'];

/** Production verifier: reads vault.founder() over JSON-RPC. Fails closed —
 *  any error (non-contract, decode failure, RPC down) resolves to null, so the
 *  route rejects rather than trusting client-supplied ownership. */
export function ethersFounderVerifier(rpcUrl: string): FounderVerifier {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return async (vault: string) => {
    try {
      const vaultContract = new ethers.Contract(vault, VAULT_ABI, provider);
      const founder = (await vaultContract.getFunction('founder')()) as string;
      if (!founder || founder === ethers.ZeroAddress) return null;
      return founder.toLowerCase();
    } catch {
      return null;
    }
  };
}
