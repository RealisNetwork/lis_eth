// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IListMarketplace {
    function placeOnMarketplace(uint256 amount) external;
}

import "@openzeppelin/contracts-ethereum-package/contracts/GSN/GSNRecipient.sol";

contract RelayMarketplace is GSNRecipient {
    bytes4 functionIdentifier = bytes4(keccak256("placeOnMarketplace(uint256)"));

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
}