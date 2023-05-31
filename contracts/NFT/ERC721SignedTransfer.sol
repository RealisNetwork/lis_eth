// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ERC721SignedTransfer {
    struct TransferMessage {
        address from;
        address to;
        uint256 tokenId;
    }

    mapping(address => uint256) public nonces;

    address public adminWallet;

    constructor(address _adminWallet) {
        adminWallet = _adminWallet;
    }

    function verifySignature(
        TransferMessage memory message,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view returns (bool) {
        bytes32 messageHash = getMessageHash(message);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        address recoveredSigner = ecrecover(ethSignedMessageHash, v, r, s);
        return recoveredSigner == adminWallet;
    }

    function getMessageHash(TransferMessage memory message)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                message.from,
                message.to,
                message.tokenId
            )
        );
    }

    function getEthSignedMessageHash(bytes32 messageHash)
        internal
        pure
        returns (bytes32)
    {
        bytes32 ethMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        return ethMessageHash;
    }
}