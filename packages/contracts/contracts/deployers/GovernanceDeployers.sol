// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {MilestoneGovernor} from "../MilestoneGovernor.sol";

/**
 * @dev The Governor and Timelock are large contracts. Deploying them with `new`
 *      directly inside RaiseFactory would embed their creation code and push the
 *      factory past the 24 KB runtime limit. Each deployer below embeds exactly
 *      one child's creation code, keeping every contract comfortably under EIP-170.
 */
contract TimelockDeployer {
    /// @notice Deploy a timelock whose admin is the caller (the factory wires roles).
    function deploy(uint256 minDelay, address admin) external returns (address) {
        address[] memory none = new address[](0);
        return address(new TimelockController(minDelay, none, none, admin));
    }
}

contract GovernorDeployer {
    function deploy(
        IVotes token,
        TimelockController timelock,
        address founder,
        uint48 votingDelay,
        uint32 votingPeriod,
        uint256 proposalThreshold,
        uint256 quorumNumerator
    ) external returns (address) {
        return address(
            new MilestoneGovernor(
                token, timelock, founder, votingDelay, votingPeriod, proposalThreshold, quorumNumerator
            )
        );
    }
}
