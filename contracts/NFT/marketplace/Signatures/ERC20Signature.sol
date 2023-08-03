// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { PurchaseArgs } from "../MarketplaceStructs.sol";
import "./SignatureBase.sol";

contract ERC20Signature is SignatureBase {

    function verifySignatureERC20(
        PurchaseArgs calldata args,
        bytes memory signature,
        address receiver
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHashERC20(args);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, signature) == receiver;
    }

    function getMessageHashERC20(PurchaseArgs calldata args)
        public
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                args.nftContract,
                args.tokenId
            )
        );
    }
}