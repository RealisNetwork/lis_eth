// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@opengsn/contracts/src/ERC2771Recipient.sol";

contract RelayMarketplace is Ownable, ERC2771Recipient {
    bytes4 private functionIdentifier = bytes4(keccak256("placeOnMarketplace(uint256)"));

    constructor(address _trustedForwarder) {
        _setTrustedForwarder(_trustedForwarder);
    }

    function setTrustedForwarder(address _trustedForwarder) external onlyOwner {
        _setTrustedForwarder(_trustedForwarder);
    }

    function _msgSender() internal virtual override(ERC2771Recipient, Context) view returns (address) {
        return super._msgSender();
    }

    function _msgData() internal virtual override(ERC2771Recipient, Context) view returns (bytes calldata) {
        return super._msgData();
    }

    function versionRecipient() external view returns (string memory) {
        return "2.2.0";
    }

    receive() external payable {}
}