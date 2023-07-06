// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


/**
 * @notice A struct defining arguments of purchaseByERC20.
 *         Designed to fit efficiently in one storage slot.
 * 
 * @param nftContract Address of nft contract
 * @param token Address of purchase currency: erc20 token or zero address if eth.
 * @param tokenId Id of nft from nftContract
 */
struct ERC20Purchase {
    address nftContract;
    address token;
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