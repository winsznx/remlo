// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ITIP20} from "./interfaces/ITIP20.sol";

/// @title YieldRouter
/// @notice Routes idle employer treasury funds to yield strategies (USDB/money market).
///         Manages per-employer yield model configuration and distributes accrued yield.
contract YieldRouter {
    enum YieldModel { EMPLOYER_KEEPS, EMPLOYEE_BONUS, SPLIT }

    struct YieldConfig {
        YieldModel model;
        uint16 employeeSplitBps; // basis points employee receives (e.g. 5000 = 50%)
        address yieldStrategy;
    }

    struct YieldPosition {
        uint256 deposited;
        uint256 yieldEarned;
        uint64 lastUpdated;
    }

    mapping(bytes32 => YieldConfig) public yieldConfig;
    mapping(bytes32 => YieldPosition) public positions;
    address[] public yieldSources;

    ITIP20 public immutable payToken;
    address public owner;

    // Hardcoded 3.7% APY (USDB yield from BlackRock MMF via Bridge)
    // Expressed as basis points per year: 370 bps = 3.70%
    uint256 public constant APY_BPS = 370;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    event YieldDeposited(bytes32 indexed employerId, uint256 amount);
    event YieldDistributed(bytes32 indexed employerId, uint256 employerShare, uint256 employeeShare);
    event YieldConfigUpdated(bytes32 indexed employerId, YieldModel model, uint16 employeeSplitBps);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _payToken) {
        payToken = ITIP20(_payToken);
        owner = msg.sender;
    }

    function addYieldSource(address source) external onlyOwner {
        yieldSources.push(source);
    }

    function setYieldConfig(
        bytes32 employerId,
        YieldModel model,
        uint16 employeeSplitBps,
        address strategy
    ) external {
        require(employeeSplitBps <= BPS_DENOMINATOR, "bps overflow");
        yieldConfig[employerId] = YieldConfig(model, employeeSplitBps, strategy);
        emit YieldConfigUpdated(employerId, model, employeeSplitBps);
    }

    function depositToYield(bytes32 employerId, uint256 amount) external {
        require(amount > 0, "zero amount");
        payToken.transferFrom(msg.sender, address(this), amount);

        YieldPosition storage pos = positions[employerId];
        // Accrue pending yield before updating deposit
        pos.yieldEarned += _accrued(pos);
        pos.deposited += amount;
        pos.lastUpdated = uint64(block.timestamp);

        emit YieldDeposited(employerId, amount);
    }

    function distributeYield(bytes32 employerId) external {
        YieldPosition storage pos = positions[employerId];
        uint256 accrued = _accrued(pos) + pos.yieldEarned;
        require(accrued > 0, "no yield");

        pos.yieldEarned = 0;
        pos.lastUpdated = uint64(block.timestamp);

        YieldConfig memory cfg = yieldConfig[employerId];
        uint256 employeeShare;
        uint256 employerShare;

        if (cfg.model == YieldModel.EMPLOYEE_BONUS) {
            employeeShare = accrued;
        } else if (cfg.model == YieldModel.SPLIT) {
            employeeShare = (accrued * cfg.employeeSplitBps) / BPS_DENOMINATOR;
            employerShare = accrued - employeeShare;
        } else {
            // EMPLOYER_KEEPS
            employerShare = accrued;
        }

        // Distribute — in production these go to treasury / employee wallets
        // For MVP, just emit event; wiring to treasury contract is done off-chain
        emit YieldDistributed(employerId, employerShare, employeeShare);
    }

    function getCurrentAPY() external pure returns (uint256) {
        return APY_BPS;
    }

    function getYieldSources() external view returns (address[] memory) {
        return yieldSources;
    }

    function getAllocation() external view returns (uint256[] memory allocations) {
        allocations = new uint256[](yieldSources.length);
        // Equal-weight allocation across all yield sources for MVP
        if (yieldSources.length > 0) {
            uint256 each = BPS_DENOMINATOR / yieldSources.length;
            for (uint256 i = 0; i < yieldSources.length; i++) {
                allocations[i] = each;
            }
        }
    }

    function rebalance(bytes32 employerId, uint256[] calldata targetAllocation) external {
        require(targetAllocation.length == yieldSources.length, "length mismatch");
        uint256 total;
        for (uint256 i = 0; i < targetAllocation.length; i++) {
            total += targetAllocation[i];
        }
        require(total == BPS_DENOMINATOR, "allocation must sum to 10000");
        // Rebalancing logic: update stored allocations
        // MVP: event emission only — actual fund movement requires yield strategy adapters
        emit Rebalanced(employerId, targetAllocation);
    }

    function getAccruedYield(bytes32 employerId) external view returns (uint256) {
        YieldPosition storage pos = positions[employerId];
        return _accrued(pos) + pos.yieldEarned;
    }

    function _accrued(YieldPosition storage pos) internal view returns (uint256) {
        if (pos.deposited == 0 || pos.lastUpdated == 0) return 0;
        uint256 elapsed = block.timestamp - pos.lastUpdated;
        return (pos.deposited * APY_BPS * elapsed) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
    }

    event Rebalanced(bytes32 indexed employerId, uint256[] targetAllocation);
}
