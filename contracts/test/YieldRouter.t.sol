// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {MockTIP20} from "./mocks/MockTIP20.sol";
import {YieldRouter} from "../src/YieldRouter.sol";

contract YieldRouterTest is Test {
    MockTIP20 internal token;
    YieldRouter internal router;
    address internal employer = address(0xA11CE);
    bytes32 internal employerId = keccak256("acme");

    function setUp() public {
        token = new MockTIP20();
        router = new YieldRouter(address(token));
        token.mint(employer, 1_000_000e6);
        router.addYieldSource(address(0x1111));
        router.addYieldSource(address(0x2222));
    }

    function testAccruedYieldAdvancesOverTime() public {
        vm.startPrank(employer);
        token.approve(address(router), 100_000e6);
        router.depositToYield(employerId, 100_000e6);
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);

        uint256 accrued = router.getAccruedYield(employerId);
        assertGt(accrued, 0);
    }

    function testRebalanceRequiresExactBasisPointSum() public {
        uint256[] memory invalidAllocation = new uint256[](2);
        invalidAllocation[0] = 7000;
        invalidAllocation[1] = 2000;

        vm.expectRevert("allocation must sum to 10000");
        router.rebalance(employerId, invalidAllocation);
    }
}
