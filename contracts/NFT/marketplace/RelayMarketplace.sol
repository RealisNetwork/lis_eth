// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@opengsn/contracts/src/BaseRelayRecipient.sol";

contract RelayMarketplace is BaseRelayRecipient {
    address public owner;
    bytes4 private functionIdentifier = bytes4(keccak256("placeOnMarketplace(uint256)"));

    constructor(address _trustedForwarder) {
        trustedForwarder = _trustedForwarder;
        owner = _msgSender();
    }

    function setTrustedForwarder(address _trustedForwarder) external {
        require(msg.sender == owner, "Only the owner can set the trusted forwarder");
        trustedForwarder = _trustedForwarder;
    }

    function _msgSender() internal override(BaseRelayRecipient) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal override(BaseRelayRecipient) view returns (bytes memory) {
        return BaseRelayRecipient._msgData();
    }

    function versionRecipient() external override view returns (string memory) {
        return "2.2.0";
    }

    function _postRelayedCall(
        bytes memory context,
        bool success,
        uint256 actualCharge,
        bytes32 preRetVal
    ) internal override {
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
        bytes64 receivedFunctionIndentifier = bytes4(encodedFunction[0]) |
            (bytes4(encodedFunction[1]) >> 8 ) | 
            (bytes4(encodedFunction[2]) >> 16 ) | 
            (bytes4(encodedFunction[3]) >> 24);

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

    function _postRelayedCall(bytes memory context, bool, uint256 actualCharge, bytes32) internal {
    }

    receive() external payable {}
}