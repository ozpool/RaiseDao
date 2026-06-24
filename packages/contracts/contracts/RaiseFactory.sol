// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {GovToken} from "./GovToken.sol";
import {RaiseVault, IGovToken} from "./RaiseVault.sol";
import {TimelockDeployer, GovernorDeployer} from "./deployers/GovernanceDeployers.sol";

/**
 * @title RaiseFactory
 * @notice Launches an isolated campaign per call: a cloned GovToken and RaiseVault
 *         (EIP-1167 minimal proxies of shared implementations) plus a fresh
 *         MilestoneGovernor and TimelockController, with all roles wired so the
 *         timelock governs the vault and one campaign cannot affect another.
 */
contract RaiseFactory {
    using Clones for address;

    IERC20 public immutable usdc;
    address public immutable feeRecipient;
    uint16 public immutable protocolFeeBps;
    address public immutable govTokenImpl;
    address public immutable vaultImpl;
    TimelockDeployer public immutable timelockDeployer;
    GovernorDeployer public immutable governorDeployer;

    uint256 public campaignCount;

    struct CampaignParams {
        address founder;
        uint64 fundingDeadline;
        uint16[] pctBps;
        uint64[] deadlines;
        uint48 votingDelay;
        uint32 votingPeriod;
        uint256 proposalThreshold;
        uint256 quorumNumerator;
        uint256 timelockDelay;
        string tokenName;
        string tokenSymbol;
    }

    event CampaignDeployed(
        uint256 indexed id, address vault, address token, address governor, address indexed founder
    );

    constructor(
        IERC20 usdc_,
        address feeRecipient_,
        uint16 protocolFeeBps_,
        address govTokenImpl_,
        address vaultImpl_,
        TimelockDeployer timelockDeployer_,
        GovernorDeployer governorDeployer_
    ) {
        usdc = usdc_;
        feeRecipient = feeRecipient_;
        protocolFeeBps = protocolFeeBps_;
        govTokenImpl = govTokenImpl_;
        vaultImpl = vaultImpl_;
        timelockDeployer = timelockDeployer_;
        governorDeployer = governorDeployer_;
    }

    function deploy(CampaignParams calldata p)
        external
        returns (address vault, address token, address governor)
    {
        token = govTokenImpl.clone();
        vault = vaultImpl.clone();

        TimelockController timelock =
            TimelockController(payable(timelockDeployer.deploy(p.timelockDelay, address(this))));
        governor = governorDeployer.deploy(
            IVotes(token),
            timelock,
            p.founder,
            p.votingDelay,
            p.votingPeriod,
            p.proposalThreshold,
            p.quorumNumerator
        );

        // The vault is the only minter; the timelock acts as the vault's governor.
        GovToken(token).initialize(p.tokenName, p.tokenSymbol, p.founder, vault);
        RaiseVault(vault).initialize(
            usdc,
            IGovToken(token),
            p.founder,
            address(timelock),
            feeRecipient,
            protocolFeeBps,
            p.fundingDeadline,
            p.pctBps,
            p.deadlines
        );

        // Governor proposes/cancels, anyone executes, factory drops its admin.
        timelock.grantRole(timelock.PROPOSER_ROLE(), governor);
        timelock.grantRole(timelock.CANCELLER_ROLE(), governor);
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0));
        timelock.renounceRole(timelock.DEFAULT_ADMIN_ROLE(), address(this));

        uint256 id = campaignCount++;
        emit CampaignDeployed(id, vault, token, governor, p.founder);
    }
}
