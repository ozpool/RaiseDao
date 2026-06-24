// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

/// @dev Test-only helper: clones an implementation so unit tests can exercise the
///      same EIP-1167 proxy path the factory uses. Returns the clone via `last`.
contract TestClones {
    using Clones for address;

    address public last;

    function clone(address impl) external returns (address c) {
        c = impl.clone();
        last = c;
    }
}
