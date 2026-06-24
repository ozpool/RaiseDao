import { type LogDescription } from 'ethers';
import { factoryIface, vaultIface, governorIface } from './abis.js';
import type { LogRecord, DecodedEvent, EventSource } from './types.js';

const lower = (s: string): string => s.toLowerCase();

/** Decode a raw log into a domain event, or null if it is not one we track.
 *  `watched` maps a campaign contract address to its campaign id. */
export function decodeLog(
  log: LogRecord,
  factoryAddress: string,
  watched: Map<string, number>,
): DecodedEvent | null {
  const address = lower(log.address);
  if (address === lower(factoryAddress)) return decodeFactory(log);

  const campaignId = watched.get(address);
  if (campaignId === undefined) return null;
  return decodeCampaign(log, campaignId);
}

function decodeFactory(log: LogRecord): DecodedEvent | null {
  const parsed = tryParse(factoryIface, log);
  if (!parsed || parsed.name !== 'CampaignDeployed') return null;
  return {
    source: 'factory',
    type: 'CampaignDeployed',
    ...identity(log),
    campaignId: Number(parsed.args.id),
    args: {
      id: Number(parsed.args.id),
      vault: lower(parsed.args.vault),
      token: lower(parsed.args.token),
      governor: lower(parsed.args.governor),
      founder: lower(parsed.args.founder),
    },
  };
}

function decodeCampaign(log: LogRecord, campaignId: number): DecodedEvent | null {
  const candidates: [typeof vaultIface, EventSource][] = [
    [vaultIface, 'vault'],
    [governorIface, 'governor'],
  ];
  for (const [iface, source] of candidates) {
    const parsed = tryParse(iface, log);
    if (parsed) {
      return {
        source,
        type: parsed.name,
        ...identity(log),
        campaignId,
        args: normaliseArgs(parsed),
      };
    }
  }
  return null;
}

function tryParse(iface: typeof vaultIface, log: LogRecord): LogDescription | null {
  try {
    return iface.parseLog({ topics: log.topics, data: log.data });
  } catch {
    return null;
  }
}

function identity(log: LogRecord) {
  return {
    address: lower(log.address),
    txHash: lower(log.transactionHash),
    logIndex: log.logIndex,
    blockNumber: log.blockNumber,
  };
}

function normaliseArgs(parsed: LogDescription): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const input of parsed.fragment.inputs) {
    if (input.type.endsWith(']')) continue; // skip array params (calldata, targets…)
    const value = parsed.args[input.name];
    if (input.type === 'address') out[input.name] = String(value).toLowerCase();
    else if (typeof value === 'bigint') out[input.name] = value.toString();
    else out[input.name] = typeof value === 'number' ? value : String(value);
  }
  return out;
}
