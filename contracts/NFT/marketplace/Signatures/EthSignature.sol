// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { EthPurchase } from "../MarketplaceStructs.sol";
import "./SignatureBase.sol";

contract EthSignature is SignatureBase {
    function verifySignatureEth(
        EthPurchase calldata args,
        bytes memory signature,
        address receiver
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHashETH(args);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, signature) == receiver;
    }

    function getMessageHashETH(EthPurchase calldata args)
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