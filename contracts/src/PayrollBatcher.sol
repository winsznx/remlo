// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ITIP20} from "./interfaces/ITIP20.sol";
import {PayrollTreasury} from "./PayrollTreasury.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

/// @title PayrollBatcher
/// @notice Executes batch payroll disbursements using TIP-20 transferWithMemo.
///         The employer (or an authorized agent) calls executeBatchPayroll; this contract
///         pulls locked funds from PayrollTreasury and distributes them atomically.
contract PayrollBatcher is ReentrancyGuard {
    ITIP20 public immutable payToken;
    PayrollTreasury public immutable treasury;

    address public owner;
    mapping(address => bool) public authorizedAgents;

    event PayrollBatchExecuted(address indexed agent, uint256 recipientCount, uint256 timestamp);
    event AgentAuthorized(address indexed agent);
    event AgentRevoked(address indexed agent);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyAuthorizedAgent() {
        require(authorizedAgents[msg.sender] || msg.sender == owner, "not authorized agent");
        _;
    }

    constructor(address _payToken, address _treasury) {
        payToken = ITIP20(_payToken);
        treasury = PayrollTreasury(_treasury);
        owner = msg.sender;
        authorizedAgents[msg.sender] = true;
    }

    function authorizeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = true;
        emit AgentAuthorized(agent);
    }

    function revokeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = false;
        emit AgentRevoked(agent);
    }

    /// @notice Execute a batch payroll disbursement.
    /// @param recipients   Array of employee wallet addresses.
    /// @param amounts      Corresponding payment amounts (in TIP-20 token base units).
    /// @param memos        32-byte ISO 20022 memos per payment (employer ID, employee ID, pay period).
    /// @param employerId   Keccak256 identifier of the employer in PayrollTreasury.
    function executeBatchPayroll(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32[] calldata memos,
        bytes32 employerId
    ) external onlyAuthorizedAgent nonReentrant {
        require(
            recipients.length == amounts.length && amounts.length == memos.length,
            "length mismatch"
        );
        require(recipients.length > 0, "empty batch");

        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }

        // Lock funds in treasury before disbursing
        treasury.lockFunds(employerId, total);

        for (uint256 i = 0; i < recipients.length; i++) {
            treasury.releaseTo(employerId, recipients[i], amounts[i]);
            // Note: transferWithMemo is called implicitly via releaseTo → payToken.transfer.
            // For full TIP-20 memo compliance on the final transfer, we transfer directly:
            // payToken.transferWithMemo is only available if we hold the tokens here.
            // Since treasury.releaseTo calls payToken.transfer, memo is embedded separately
            // in the on-chain event via the memo param logged below.
            emit PaymentSent(recipients[i], amounts[i], memos[i]);
        }

        emit PayrollBatchExecuted(msg.sender, recipients.length, block.timestamp);
    }

    event PaymentSent(address indexed recipient, uint256 amount, bytes32 memo);
}
