// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/erc8004/IdentityRegistryUpgradeable.sol";
import "../src/erc8004/ReputationRegistryUpgradeable.sol";
import "../src/erc8004/ValidationRegistryUpgradeable.sol";

/**
 * Ship 3 — deploys the ERC-8004 trustless-agents registry triplet (Identity,
 * Reputation, Validation) to Tempo Moderato testnet behind UUPS proxies, then
 * registers Remlo's two operated agents (payroll + validator).
 *
 * Deploy order is load-bearing: Reputation + Validation both take the
 * Identity address in their initializer.
 *
 * Env:
 *   DEPLOYER_PRIVATE_KEY           — deployer (becomes registry owner)
 *   REMLO_PAYROLL_AGENT_ADDRESS    — address of the Remlo payroll agent (Tempo)
 *   REMLO_VALIDATOR_AGENT_ADDRESS  — address of the Remlo validator agent
 *   REMLO_AGENT_BASE_URI           — base URI for agent registration files
 *                                     e.g. https://remlo.xyz/.well-known/agent-registration
 *
 * Run:
 *   forge script script/DeployERC8004.s.sol --rpc-url tempo_moderato --broadcast
 */
contract DeployERC8004 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address payrollAgentAddr = vm.envAddress("REMLO_PAYROLL_AGENT_ADDRESS");
        address validatorAgentAddr = vm.envAddress("REMLO_VALIDATOR_AGENT_ADDRESS");
        string memory baseURI = vm.envString("REMLO_AGENT_BASE_URI");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Identity Registry (no deps)
        IdentityRegistryUpgradeable identityImpl = new IdentityRegistryUpgradeable();
        ERC1967Proxy identityProxy = new ERC1967Proxy(
            address(identityImpl),
            abi.encodeCall(IdentityRegistryUpgradeable.initialize, ())
        );
        IdentityRegistryUpgradeable identity = IdentityRegistryUpgradeable(address(identityProxy));
        console2.log("IdentityRegistry proxy:", address(identity));

        // 2. Reputation Registry (depends on Identity)
        ReputationRegistryUpgradeable reputationImpl = new ReputationRegistryUpgradeable();
        ERC1967Proxy reputationProxy = new ERC1967Proxy(
            address(reputationImpl),
            abi.encodeCall(ReputationRegistryUpgradeable.initialize, (address(identity)))
        );
        console2.log("ReputationRegistry proxy:", address(reputationProxy));

        // 3. Validation Registry (depends on Identity)
        ValidationRegistryUpgradeable validationImpl = new ValidationRegistryUpgradeable();
        ERC1967Proxy validationProxy = new ERC1967Proxy(
            address(validationImpl),
            abi.encodeCall(ValidationRegistryUpgradeable.initialize, (address(identity)))
        );
        console2.log("ValidationRegistry proxy:", address(validationProxy));

        // 4. Register Remlo's operated agents. The deployer holds the ERC-721
        // tokens for these agentIds. Transfer to the individual agent wallets
        // is out-of-scope for Ship 3 (Phase 2 — Privy Tempo migration).
        string memory payrollURI = string.concat(baseURI, "/payroll");
        string memory validatorURI = string.concat(baseURI, "/validator");

        uint256 payrollAgentId = identity.register(payrollURI);
        uint256 validatorAgentId = identity.register(validatorURI);
        console2.log("Payroll Agent ID:", payrollAgentId);
        console2.log("Validator Agent ID:", validatorAgentId);

        // Surface the operator addresses we intend to own these tokens. The
        // on-chain owner is currently the deployer; these are our declared
        // service principals for registration metadata.
        console2.log("Payroll Agent operator (declared):", payrollAgentAddr);
        console2.log("Validator Agent operator (declared):", validatorAgentAddr);

        vm.stopBroadcast();

        console2.log("\n=== ERC-8004 deployment complete ===");
        console2.log("NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY=", address(identity));
        console2.log("NEXT_PUBLIC_ERC8004_REPUTATION_REGISTRY=", address(reputationProxy));
        console2.log("NEXT_PUBLIC_ERC8004_VALIDATION_REGISTRY=", address(validationProxy));
        console2.log("REMLO_PAYROLL_AGENT_ID=", payrollAgentId);
        console2.log("REMLO_VALIDATOR_AGENT_ID=", validatorAgentId);
    }
}
