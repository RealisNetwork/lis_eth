// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


/**
 * @notice A struct defining arguments of purchaseByERC20.
 *         Designed to fit efficiently in one storage slot.
 * 
 * @param nftContract Address of nft contract
 * @param tokenId Id of nft from nftContract
 */
struct ERC20Purchase {
    address nftContract;
    uint256 tokenId;
}

/**
 * @notice A struct defining arguments of purchaseByEth.
 *         Designed to fit efficiently in one storage slot.
 * 
 * @param nftContract Address of nft contract
 * @param tokenId Id of nft from nftContract
 */
struct EthPurchase {
    address nftContract;
    uint256 tokenId;
}

struct Product {
    address currency;
    uint256 price;
}