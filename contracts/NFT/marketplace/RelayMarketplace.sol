// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@opengsn/contracts/src/ERC2771Recipient.sol";

contract RelayMarketplace is OwnableUpgradeable, ERC2771Recipient {
    // bytes4 private functionIdentifier = bytes4(keccak256("placeOnMarketplace(uint256)"));

    // constructor(address _trustedForwarder) {
    //     _setTrustedForwarder(_trustedForwarder);
    // }

    function initialize(address _trustedForwarder) internal {
        _setTrustedForwarder(_trustedForwarder);
    }

    function setTrustedForwarder(address _trustedForwarder) external onlyOwner {
        _setTrustedForwarder(_trustedForwarder);
    }

    function _msgSender() internal virtual override(ERC2771Recipient, ContextUpgradeable) view returns (address) {
        return super._msgSender();
    }

    function _msgData() internal virtual override(ERC2771Recipient, ContextUpgradeable) view returns (bytes calldata) {
        return super._msgData();
    }

    function versionRecipient() external pure returns (string memory) {
        return "2.2.0";
    }

    receive() external payable {}
}