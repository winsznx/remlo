// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ITIP20} from "./interfaces/ITIP20.sol";

/// @title StreamVesting
/// @notice Continuous salary streaming via linear vesting streams.
///         Employees accrue balance per second; they can claim at any time after cliff.
contract StreamVesting {
    struct VestingStream {
        address employer;
        address employee;
        uint256 totalAmount;
        uint256 released;
        uint64 startTime;
        uint64 endTime;
        uint64 cliffEnd;
        bytes32 payrollMemo;
        bool active;
    }

    mapping(uint256 => VestingStream) public streams;
    mapping(address => uint256[]) private employeeStreams;

    uint256 public nextStreamId;
    ITIP20 public immutable payToken;
    address public owner;

    event StreamCreated(
        uint256 indexed streamId,
        address indexed employer,
        address indexed employee,
        uint256 totalAmount,
        uint64 startTime,
        uint64 endTime
    );
    event StreamReleased(uint256 indexed streamId, address indexed employee, uint256 amount);
    event StreamCancelled(uint256 indexed streamId);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _payToken) {
        payToken = ITIP20(_payToken);
        owner = msg.sender;
    }

    function createStream(
        address employee,
        uint256 totalAmount,
        uint64 startTime,
        uint64 endTime,
        uint64 cliffEnd,
        bytes32 payrollMemo
    ) external returns (uint256 streamId) {
        require(endTime > startTime, "invalid period");
        require(cliffEnd >= startTime, "cliff before start");
        require(totalAmount > 0, "zero amount");

        payToken.transferFrom(msg.sender, address(this), totalAmount);

        streamId = nextStreamId++;
        streams[streamId] = VestingStream({
            employer: msg.sender,
            employee: employee,
            totalAmount: totalAmount,
            released: 0,
            startTime: startTime,
            endTime: endTime,
            cliffEnd: cliffEnd,
            payrollMemo: payrollMemo,
            active: true
        });
        employeeStreams[employee].push(streamId);

        emit StreamCreated(streamId, msg.sender, employee, totalAmount, startTime, endTime);
    }

    function release(uint256 streamId) external {
        VestingStream storage s = streams[streamId];
        require(s.active, "stream not active");
        require(block.timestamp >= s.cliffEnd, "cliff not reached");

        uint256 releasable = _releasable(s);
        require(releasable > 0, "nothing to release");

        s.released += releasable;
        payToken.transferWithMemo(s.employee, releasable, s.payrollMemo);

        emit StreamReleased(streamId, s.employee, releasable);
    }

    function claimAccrued(address employee) external returns (bytes32 txHash) {
        uint256[] memory ids = employeeStreams[employee];
        uint256 totalReleasable;

        for (uint256 i = 0; i < ids.length; i++) {
            VestingStream storage s = streams[ids[i]];
            if (!s.active || block.timestamp < s.cliffEnd) continue;

            uint256 releasable = _releasable(s);
            if (releasable == 0) continue;

            s.released += releasable;
            totalReleasable += releasable;
        }

        require(totalReleasable > 0, "nothing to claim");
        payToken.transfer(employee, totalReleasable);

        // Return a synthetic receipt hash for the caller
        txHash = keccak256(abi.encodePacked(employee, totalReleasable, block.timestamp));
    }

    function getAccruedBalance(address employee) external view returns (uint256 total) {
        uint256[] memory ids = employeeStreams[employee];
        for (uint256 i = 0; i < ids.length; i++) {
            VestingStream storage s = streams[ids[i]];
            if (!s.active || block.timestamp < s.cliffEnd) continue;
            total += _releasable(s);
        }
    }

    function cancelStream(uint256 streamId) external {
        VestingStream storage s = streams[streamId];
        require(s.active, "not active");
        require(s.employer == msg.sender || msg.sender == owner, "not authorized");

        uint256 releasable = _releasable(s);
        uint256 remaining = s.totalAmount - s.released - releasable;

        s.active = false;

        if (releasable > 0) {
            s.released += releasable;
            payToken.transferWithMemo(s.employee, releasable, s.payrollMemo);
        }
        if (remaining > 0) {
            payToken.transfer(s.employer, remaining);
        }

        emit StreamCancelled(streamId);
    }

    function getStreamsByEmployee(address employee) external view returns (uint256[] memory) {
        return employeeStreams[employee];
    }

    function _releasable(VestingStream storage s) internal view returns (uint256) {
        if (block.timestamp < s.cliffEnd) return 0;
        uint256 elapsed = block.timestamp >= s.endTime
            ? s.endTime - s.startTime
            : block.timestamp - s.startTime;
        uint256 vested = (s.totalAmount * elapsed) / (s.endTime - s.startTime);
        return vested > s.released ? vested - s.released : 0;
    }
}
