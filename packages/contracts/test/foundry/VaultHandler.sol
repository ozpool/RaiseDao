// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {RaiseVault} from "../../contracts/RaiseVault.sol";
import {MockUSDC} from "../../contracts/mocks/MockUSDC.sol";

/**
 * @dev Invariant actor. It is the campaign's governor and sole investor, so it can
 *      drive every state transition (contribute, release, fail, refund) with fuzzed
 *      sequences while tracking ghost totals the invariant checks fund conservation
 *      against. Reverting branches are swallowed so the run keeps exploring.
 */
contract VaultHandler {
    uint256 private constant BPS = 10_000;

    RaiseVault public immutable vault;
    MockUSDC public immutable usdc;

    uint256 public totalReleasedGross; // USDC paid out to founder + fee on releases
    uint256 public refundsClaimed; // USDC paid back to investors on refunds

    constructor(RaiseVault vault_, MockUSDC usdc_) {
        vault = vault_;
        usdc = usdc_;
    }

    function contribute(uint256 amount) external {
        if (vault.refundsOpen()) return;
        amount = (amount % 1_000_000e6) + 1; // 1 wei .. 1M USDC
        usdc.mint(address(this), amount);
        usdc.approve(address(vault), amount);
        try vault.contribute(amount) {} catch {}
    }

    function release() external {
        if (vault.refundsOpen()) return;
        uint256 i = vault.currentMilestone();
        if (i >= vault.milestoneCount()) return;
        (uint16 pct,,) = vault.milestones(i);
        uint256 gross = (vault.totalRaised() * pct) / BPS;
        try vault.releaseMilestone(i) {
            totalReleasedGross += gross;
        } catch {}
    }

    function fail() external {
        if (vault.refundsOpen()) return;
        uint256 i = vault.currentMilestone();
        if (i >= vault.milestoneCount()) return;
        try vault.markFailed(i) {} catch {}
    }

    function claim() external {
        if (!vault.refundsOpen()) return;
        uint256 balBefore = usdc.balanceOf(address(this));
        try vault.claimRefund() {
            refundsClaimed += usdc.balanceOf(address(this)) - balBefore;
        } catch {}
    }
}
