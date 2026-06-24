// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {GovToken} from "../../contracts/GovToken.sol";
import {RaiseVault, IGovToken} from "../../contracts/RaiseVault.sol";
import {MockUSDC} from "../../contracts/mocks/MockUSDC.sol";

/// @dev Shared setup for the Foundry suites: clone a token + vault the same way
///      the factory does, with a two-tranche (50/50) schedule and open funding.
abstract contract VaultTestBase is Test {
    address internal constant FOUNDER = address(0xF00D);
    address internal constant FEE_RECIPIENT = address(0xFEE5);

    function _deployCampaign(uint16 feeBps, address governor)
        internal
        returns (RaiseVault vault, GovToken token, MockUSDC usdc)
    {
        usdc = new MockUSDC();
        token = GovToken(Clones.clone(address(new GovToken())));
        vault = RaiseVault(Clones.clone(address(new RaiseVault())));

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
            FOUNDER,
            governor,
            FEE_RECIPIENT,
            feeBps,
            type(uint64).max,
            pct,
            deadlines
        );
    }

    function _contribute(RaiseVault vault, MockUSDC usdc, address who, uint256 amount) internal {
        usdc.mint(who, amount);
        vm.startPrank(who);
        usdc.approve(address(vault), amount);
        vault.contribute(amount);
        vm.stopPrank();
    }
}
