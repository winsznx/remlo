// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal reentrancy guard for Tempo-compatible Remlo contracts.
abstract contract ReentrancyGuard {
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status = NOT_ENTERED;

    modifier nonReentrant() {
        require(_status == NOT_ENTERED, "reentrant call");
        _status = ENTERED;
        _;
        _status = NOT_ENTERED;
    }
}
