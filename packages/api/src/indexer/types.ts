/** A single on-chain log, normalised from whatever provider produced it. */
export interface LogRecord {
  address: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  topics: string[];
  data: string;
}

export interface LogFilter {
  fromBlock: number;
  toBlock: number;
  address: string[];
}

/** The chain access the engine needs, behind an interface so tests can supply a
 *  fake source instead of a live RPC provider. */
export interface LogSource {
  getBlockNumber(): Promise<number>;
  getLogs(filter: LogFilter): Promise<LogRecord[]>;
}

export type EventSource = 'factory' | 'vault' | 'governor';

/** A decoded, source-tagged domain event ready to be persisted. */
export interface DecodedEvent {
  source: EventSource;
  type: string;
  address: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  campaignId: number;
  args: Record<string, string | number>;
}
