// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@opengsn/contracts/src/ERC2771Recipient.sol";

contract RelayMarketplace is Ownable, ERC2771Recipient {
    address public trustedForwarder;
    bytes4 private functionIdentifier = bytes4(keccak256("placeOnMarketplace(uint256)"));

    constructor(address _trustedForwarder) {
        trustedForwarder = _trustedForwarder;
    }

    function setTrustedForwarder(address _trustedForwarder) external onlyOwner {
        trustedForwarder = _trustedForwarder;
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

    function _postRelayedCall(
        bytes memory context,
        bool success,
        uint256 actualCharge,
        bytes32 preRetVal
    ) internal {
        // Если у контракта недостаточно средств для оплаты, вернуть ошибку.
        require(address(this).balance >= actualCharge, "Not enough Matic to pay relayed transaction");
    }


    function acceptRelayedCall(
        address relay,
        address from,
        bytes calldata encodedFunction,
        uint256 transactionFee,
        uint256 gasPrice,
        uint256 gasLimit,
        uint256 nonce,
        bytes calldata approvalData,
        uint256 maxPossibleCharge
    ) external view returns (uint256, bytes memory) {
        bytes4 receivedFunctionIndentifier = abi.decode(encodedFunction[:4], (bytes4));

        if (receivedFunctionIndentifier == functionIdentifier) {
            return _approveRelayedCall();
        } else {
            return _rejectRelayedCall();
        }
    }

    function _approveRelayedCall() internal pure returns (uint256, bytes memory) {
        return (0, '');
    }

    function _rejectRelayedCall() internal pure returns (uint256, bytes memory) {
        return (1, 'Method is not supported by relayed contract.');
    }

    // We won't do any pre or post processing, so leave _preRelayedCall and _postRelayedCall empty
    function _preRelayedCall(bytes memory context) internal returns (bytes32) {
    }

    receive() external payable {}
}