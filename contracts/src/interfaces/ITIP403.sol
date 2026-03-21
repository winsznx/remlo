// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal TIP-403 compliance registry interface.
/// The precompile at 0x403c000000000000000000000000000000000000 implements this.
interface ITIP403 {
    function isAuthorized(uint64 policyId, address wallet) external view returns (bool);
    function createPolicy(address admin, bytes calldata rules) external returns (uint64 policyId);
    function updatePolicy(uint64 policyId, bytes calldata rules) external;
    function getPolicyAdmin(uint64 policyId) external view returns (address);
}
