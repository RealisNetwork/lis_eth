// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

// import "forge-std/Script.sol";
import "../../lib/forge-std/src/Script.sol";

import { ERC721SeaDrop } from "../NFT/ERC721SeaDrop/ERC721SeaDrop.sol";

import { ISeaDrop } from "../NFT/ERC721SeaDrop/interfaces/ISeaDrop.sol";

import { PublicDrop } from "../NFT/ERC721SeaDrop/lib/SeaDropStructs.sol";

contract DeployAndConfigureSeaDrop is Script {
    // Addresses

    address seadrop = 0x00005EA00Ac477B1030CE78506496e8C2dE24bf5;
    address creator = 0x7798dc46E620F948f94E79c0D9BB842c1E9E4DB3;
    address feeRecipient = 0x7798dc46E620F948f94E79c0D9BB842c1E9E4DB3;

    // Token config
    uint256 maxSupply = 100;

    // Drop config
    uint16 feeBps = 500; // 5%
    uint80 mintPrice = 0.0001 ether;
    uint16 maxTotalMintableByWallet = 5;

    event DropCreated(address indexed newDrop);

    function run() external {
        vm.startBroadcast();

        address[] memory allowedSeadrop = new address[](1);
        allowedSeadrop[0] = seadrop;

        // This example uses ERC721SeaDrop. For separate Owner and
        // Administrator privileges, use ERC721PartnerSeaDrop.
        ERC721SeaDrop token = new ERC721SeaDrop(
            "EggDrop",
            "ED",
            allowedSeadrop
        );

        // Configure the token.
        token.setMaxSupply(maxSupply);

        // Configure the drop parameters.
        token.updateCreatorPayoutAddress(seadrop, creator);
        token.updateAllowedFeeRecipient(seadrop, feeRecipient, true);
        token.updatePublicDrop(
            seadrop,
            PublicDrop(
                mintPrice,
                uint48(block.timestamp), // start time
                uint48(block.timestamp) + 1000, // end time
                maxTotalMintableByWallet,
                feeBps,
                true
            )
        );

        emit DropCreated(address(token));

        // ISeaDrop(seadrop).mintPublic{ value: mintPrice * 3 }(
        //     address(token),
        //     feeRecipient,
        //     address(0),
        //     3 // quantity
        // );
    }
}