// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ITIP403} from "./interfaces/ITIP403.sol";

/// @title EmployeeRegistry
/// @notice On-chain registry mapping employee IDs to wallet addresses.
///         Enforces TIP-403 compliance checks on registration.
contract EmployeeRegistry {
    struct Employee {
        address wallet;
        bytes32 employerId;
        uint64 policyId;
        bytes32 employeeIdHash;
        bool active;
    }

    struct EmployerConfig {
        uint64 policyId;
        address admin;
        bool active;
    }

    mapping(address => Employee) public employees;
    mapping(bytes32 => EmployerConfig) public employerConfigs;
    mapping(bytes32 => address[]) private employerWallets;

    address public tip403Registry = 0x403c000000000000000000000000000000000000;
    address public owner;

    event EmployeeRegistered(address indexed wallet, bytes32 indexed employerId, bytes32 employeeIdHash);
    event EmployeeDeactivated(address indexed wallet);
    event EmployerConfigured(bytes32 indexed employerId, address admin, uint64 policyId);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyEmployerAdmin(bytes32 employerId) {
        require(employerConfigs[employerId].admin == msg.sender, "not employer admin");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function configureEmployer(bytes32 employerId, address admin, uint64 policyId) external onlyOwner {
        employerConfigs[employerId] = EmployerConfig(policyId, admin, true);
        emit EmployerConfigured(employerId, admin, policyId);
    }

    function registerEmployee(
        address wallet,
        bytes32 employerId,
        bytes32 employeeIdHash
    ) external onlyEmployerAdmin(employerId) {
        EmployerConfig memory cfg = employerConfigs[employerId];
        require(cfg.active, "employer not configured");

        if (cfg.policyId > 0) {
            bool authorized = ITIP403(tip403Registry).isAuthorized(cfg.policyId, wallet);
            require(authorized, "wallet fails compliance check");
        }

        require(!employees[wallet].active, "wallet already registered");

        employees[wallet] = Employee(wallet, employerId, cfg.policyId, employeeIdHash, true);
        employerWallets[employerId].push(wallet);

        emit EmployeeRegistered(wallet, employerId, employeeIdHash);
    }

    function deactivateEmployee(address wallet) external {
        Employee storage emp = employees[wallet];
        require(emp.active, "not active");
        require(
            employerConfigs[emp.employerId].admin == msg.sender || msg.sender == owner,
            "not authorized"
        );
        emp.active = false;
        emit EmployeeDeactivated(wallet);
    }

    function getWallet(bytes32 employeeIdHash) external view returns (address) {
        // Linear scan — acceptable for MVP employee counts (<500 per employer)
        // In production, maintain a reverse mapping.
        address[] memory wallets = employerWallets[bytes32(0)]; // placeholder
        for (uint256 i = 0; i < wallets.length; i++) {
            if (employees[wallets[i]].employeeIdHash == employeeIdHash) {
                return wallets[i];
            }
        }
        return address(0);
    }

    function getEmployeeCount(bytes32 employerId) external view returns (uint256) {
        return employerWallets[employerId].length;
    }

    function getEmployerWallets(bytes32 employerId) external view returns (address[] memory) {
        return employerWallets[employerId];
    }

    function isRegistered(address wallet) external view returns (bool) {
        return employees[wallet].active;
    }
}
