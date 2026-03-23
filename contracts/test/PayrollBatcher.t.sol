// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {MockTIP20} from "./mocks/MockTIP20.sol";
import {PayrollTreasury} from "../src/PayrollTreasury.sol";
import {PayrollBatcher} from "../src/PayrollBatcher.sol";

contract PayrollBatcherTest is Test {
    MockTIP20 internal token;
    PayrollTreasury internal treasury;
    PayrollBatcher internal batcher;
    address internal employer = address(0xA11CE);
    address internal employeeOne = address(0xB0B);
    address internal employeeTwo = address(0xCAFE);

    function setUp() public {
        token = new MockTIP20();
        treasury = new PayrollTreasury(address(token));
        batcher = new PayrollBatcher(address(token), address(treasury));
        treasury.setBatcher(address(batcher));

        token.mint(employer, 5_000_000e6);

        vm.startPrank(employer);
        token.approve(address(treasury), type(uint256).max);
        treasury.deposit(1_000_000e6, bytes32("funding"));
        vm.stopPrank();
    }

    function testExecuteBatchPayrollReleasesFundsAtomically() public {
        bytes32 employerId = keccak256(abi.encodePacked(employer));

        address[] memory recipients = new address[](2);
        recipients[0] = employeeOne;
        recipients[1] = employeeTwo;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100_000e6;
        amounts[1] = 50_000e6;

        bytes32[] memory memos = new bytes32[](2);
        memos[0] = bytes32("salary-one");
        memos[1] = bytes32("salary-two");

        batcher.executeBatchPayroll(recipients, amounts, memos, employerId);

        assertEq(token.balanceOf(employeeOne), 100_000e6);
        assertEq(token.balanceOf(employeeTwo), 50_000e6);
        assertEq(treasury.getAvailableBalance(employerId), 850_000e6);
        assertEq(treasury.getLockedBalance(employerId), 0);
    }

    function testUnauthorizedAgentCannotExecuteBatch() public {
        bytes32 employerId = keccak256(abi.encodePacked(employer));

        address[] memory recipients = new address[](1);
        recipients[0] = employeeOne;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100_000e6;

        bytes32[] memory memos = new bytes32[](1);
        memos[0] = bytes32("salary");

        vm.prank(address(0xBAD));
        vm.expectRevert("not authorized agent");
        batcher.executeBatchPayroll(recipients, amounts, memos, employerId);
    }
}
