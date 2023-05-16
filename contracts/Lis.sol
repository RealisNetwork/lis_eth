// contracts/Lis.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Lis is ERC20, AccessControl, Ownable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    constructor(uint256 initialSupply) ERC20("Realis", "LIS") {
        _mint(msg.sender, initialSupply);
        // Grant the contract deployer the default admin role: it will be able
        // to grant and revoke any roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(msg.sender, amount);
    }

    function burn(uint256 amount) public onlyRole(BURNER_ROLE) {
        _burn(msg.sender, amount);
    }
}