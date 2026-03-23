// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {MockTIP20} from "./mocks/MockTIP20.sol";
import {StreamVesting} from "../src/StreamVesting.sol";

contract StreamVestingTest is Test {
    MockTIP20 internal token;
    StreamVesting internal vesting;
    address internal employer = address(0xA11CE);
    address internal employee = address(0xB0B);

    function setUp() public {
        token = new MockTIP20();
        vesting = new StreamVesting(address(token));
        token.mint(employer, 20_000_000e6);
    }

    function testAccruedBalanceScalesLinearlyThroughTime() public {
        uint64 start = uint64(block.timestamp);
        uint64 end = start + 100 days;
        uint256 totalAmount = 12_000e6;

        vm.startPrank(employer);
        token.approve(address(vesting), totalAmount);
        vesting.createStream(employee, totalAmount, start, end, start, bytes32("memo"));
        vm.stopPrank();

        vm.warp(start + 50 days);

        uint256 accrued = vesting.getAccruedBalance(employee);
        assertEq(accrued, 6_000e6);
    }

    function testAccruedBalanceHandlesLargeAmountsWithoutOverflow() public {
        uint64 start = uint64(block.timestamp);
        uint64 end = start + 1 days;
        uint256 totalAmount = 10_000_000e6;

        vm.startPrank(employer);
        token.approve(address(vesting), totalAmount);
        vesting.createStream(employee, totalAmount, start, end, start, bytes32("memo"));
        vm.stopPrank();

        vm.warp(start + 12 hours);

        uint256 accrued = vesting.getAccruedBalance(employee);
        assertEq(accrued, 5_000_000e6);
    }
}
