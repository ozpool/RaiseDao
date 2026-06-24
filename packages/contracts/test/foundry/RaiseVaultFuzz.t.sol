// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {VaultTestBase} from "./VaultTestBase.sol";
import {RaiseVault} from "../../contracts/RaiseVault.sol";
import {GovToken} from "../../contracts/GovToken.sol";
import {MockUSDC} from "../../contracts/mocks/MockUSDC.sol";

contract RaiseVaultFuzz is VaultTestBase {
    address internal constant ALICE = address(0xA11CE);
    address internal constant BOB = address(0xB0B);

    /// @dev A release pays the founder the tranche net of the protocol fee.
    function testFuzz_releaseSplit(uint256 amount, uint16 feeBps) public {
        feeBps = uint16(bound(feeBps, 0, 1_000)); // up to 10%
        amount = bound(amount, 1e6, 1_000_000e6);

        (RaiseVault vault,, MockUSDC usdc) = _deployCampaign(feeBps, address(this));
        _contribute(vault, usdc, ALICE, amount);

        vault.releaseMilestone(0);

        uint256 gross = (amount * 5_000) / 10_000;
        uint256 fee = (gross * feeBps) / 10_000;
        assertEq(usdc.balanceOf(FEE_RECIPIENT), fee);
        assertEq(usdc.balanceOf(FOUNDER), gross - fee);
    }

    /// @dev After a failed milestone each investor is refunded pro-rata of the rest.
    function testFuzz_refundProRata(uint256 c1, uint256 c2) public {
        c1 = bound(c1, 1e6, 1_000_000e6);
        c2 = bound(c2, 1e6, 1_000_000e6);

        (RaiseVault vault,, MockUSDC usdc) = _deployCampaign(0, address(this));
        _contribute(vault, usdc, ALICE, c1);
        _contribute(vault, usdc, BOB, c2);

        uint256 raised = c1 + c2;
        vault.releaseMilestone(0); // pays out half
        uint256 pool = usdc.balanceOf(address(vault));
        vault.markFailed(1); // snapshots the remainder for refunds

        vm.prank(ALICE);
        vault.claimRefund();
        vm.prank(BOB);
        vault.claimRefund();

        assertEq(usdc.balanceOf(ALICE), (pool * c1) / raised);
        assertEq(usdc.balanceOf(BOB), (pool * c2) / raised);
    }
}
