// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PayrollTreasury.sol";
import "../src/PayrollBatcher.sol";
import "../src/EmployeeRegistry.sol";
import "../src/StreamVesting.sol";
import "../src/YieldRouter.sol";

contract Deploy is Script {
    // pathUSD TIP-20 on Tempo Moderato testnet
    address constant PATHUSD = 0x20C0000000000000000000000000000000000000;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. PayrollTreasury
        PayrollTreasury treasury = new PayrollTreasury(PATHUSD);
        console2.log("PayrollTreasury:", address(treasury));

        // 2. PayrollBatcher (depends on treasury)
        PayrollBatcher batcher = new PayrollBatcher(PATHUSD, address(treasury));
        console2.log("PayrollBatcher:", address(batcher));

        // 3. Wire batcher into treasury
        treasury.setBatcher(address(batcher));

        // 4. EmployeeRegistry
        EmployeeRegistry registry = new EmployeeRegistry();
        console2.log("EmployeeRegistry:", address(registry));

        // 5. StreamVesting
        StreamVesting vesting = new StreamVesting(PATHUSD);
        console2.log("StreamVesting:", address(vesting));

        // 6. YieldRouter
        YieldRouter yieldRouter = new YieldRouter(PATHUSD);
        console2.log("YieldRouter:", address(yieldRouter));

        vm.stopBroadcast();

        console2.log("\n=== Deployment Complete ===");
        console2.log("NEXT_PUBLIC_PAYROLL_TREASURY=", address(treasury));
        console2.log("NEXT_PUBLIC_PAYROLL_BATCHER=", address(batcher));
        console2.log("NEXT_PUBLIC_EMPLOYEE_REGISTRY=", address(registry));
        console2.log("NEXT_PUBLIC_STREAM_VESTING=", address(vesting));
        console2.log("NEXT_PUBLIC_YIELD_ROUTER=", address(yieldRouter));
    }
}
