// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {GovToken} from "../../contracts/GovToken.sol";
import {RaiseVault, IGovToken} from "../../contracts/RaiseVault.sol";
import {MockUSDC} from "../../contracts/mocks/MockUSDC.sol";
import {VaultHandler} from "./VaultHandler.sol";

/// @dev Fund conservation must hold after any fuzzed sequence of campaign actions.
contract RaiseVaultInvariant is Test {
    RaiseVault internal vault;
    MockUSDC internal usdc;
    VaultHandler internal handler;

    function setUp() public {
        usdc = new MockUSDC();
        GovToken token = GovToken(Clones.clone(address(new GovToken())));
        vault = RaiseVault(Clones.clone(address(new RaiseVault())));

        // The handler is the sole investor and the governor, so it can drive every
        // transition. It must exist before initialize() sets it as governor.
        handler = new VaultHandler(vault, usdc);

        token.initialize("RaiseDAO Vote", "rdVOTE", address(this), address(vault));

        uint16[] memory pct = new uint16[](2);
        pct[0] = 5_000;
        pct[1] = 5_000;
        uint64[] memory deadlines = new uint64[](2);
        deadlines[0] = type(uint64).max;
        deadlines[1] = type(uint64).max;

        vault.initialize(
            IERC20(address(usdc)),
            IGovToken(address(token)),
            address(0xF00D), // founder
            address(handler), // governor
            address(0xFEE5), // fee recipient
            200, // 2% protocol fee
            type(uint64).max, // funding open
            pct,
            deadlines
        );

        targetContract(address(handler));
    }

    /// @notice totalReleased + remaining == totalRaised - refundsClaimed.
    function invariant_fundsAreConserved() public view {
        assertEq(
            usdc.balanceOf(address(vault)),
            vault.totalRaised() - handler.totalReleasedGross() - handler.refundsClaimed()
        );
    }
}
