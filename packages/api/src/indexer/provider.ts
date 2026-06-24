import { type JsonRpcProvider, type Log } from 'ethers';
import type { LogSource, LogFilter, LogRecord } from './types.js';

/** LogSource backed by an ethers JSON-RPC provider. */
export class EthersLogSource implements LogSource {
  constructor(private readonly provider: JsonRpcProvider) {}

  getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  async getLogs(filter: LogFilter): Promise<LogRecord[]> {
    const logs = await this.provider.getLogs({
      fromBlock: filter.fromBlock,
      toBlock: filter.toBlock,
      address: filter.address,
    });
    return logs.map(toRecord);
  }
}

function toRecord(log: Log): LogRecord {
  return {
    address: log.address,
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex: log.index,
    topics: [...log.topics],
    data: log.data,
  };
}
