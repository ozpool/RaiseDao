import { Interface } from 'ethers';

/** Event-only ABIs for the contracts the indexer mirrors. Human-readable
 *  fragments keep this self-contained (no typechain/artifact dependency). */
export const factoryIface = new Interface([
  'event CampaignDeployed(uint256 indexed id, address vault, address token, address governor, address indexed founder)',
]);

export const vaultIface = new Interface([
  'event Contributed(address indexed investor, uint256 amount, uint256 votesMinted)',
  'event MilestoneReleased(uint256 indexed index, uint256 toFounder, uint256 fee)',
  'event MilestoneFailed(uint256 indexed index, uint256 refundPool)',
  'event Refunded(address indexed investor, uint256 amount)',
]);

export const governorIface = new Interface([
  'event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)',
  'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)',
  'event ProposalQueued(uint256 proposalId, uint256 etaSeconds)',
]);
