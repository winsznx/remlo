// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ITIP20} from "../../src/interfaces/ITIP20.sol";

contract MockTIP20 is ITIP20 {
    string public constant name = "Mock pathUSD";
    string public constant symbol = "mPATH";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;
    uint256 private _totalSupply;

    function mint(address to, uint256 amount) external {
        balances[to] += amount;
        _totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        uint256 allowed = allowances[from][msg.sender];
        if (msg.sender != from && allowed != type(uint256).max) {
            require(allowed >= amount, "insufficient allowance");
            allowances[from][msg.sender] = allowed - amount;
        }

        _move(from, to, amount);
        return true;
    }

    function transferWithMemo(address to, uint256 amount, bytes32) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFromWithMemo(address from, address to, uint256 amount, bytes32) external returns (bool) {
        return transferFrom(from, to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowances[msg.sender][spender] = amount;
        return true;
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return allowances[owner][spender];
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function _move(address from, address to, uint256 amount) internal {
        require(balances[from] >= amount, "insufficient balance");
        balances[from] -= amount;
        balances[to] += amount;
    }
}
