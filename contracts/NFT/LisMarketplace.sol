// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { ERC20Purchase, EthPurchase } from "./marketplace/MarketplaceStructs.sol";
import "./marketplace/Signatures/ERC20Signature.sol";
import "./marketplace/Signatures/EthSignature.sol";


contract LisMarketplace is Ownable, ERC20Signature, EthSignature {
    using SafeMath for uint256;

    address public adminBuyer;
    address public admin;
    address payable public feeReceiver;
    /**
     * @dev Stores fee percents of nft contracts: fees[nftContract][fee]
     */
    mapping(address => uint256) public fees;

    /**
     * @dev Stores listed nft prices: tokensPrices[nftContract][token][tokenId]
     */
    mapping(address => mapping(address => mapping(uint256 => uint256))) public tokensPrices;

    event Purchase(address indexed seller, address indexed buyer, address nftContract, uint256 tokenId, address currency, uint256 indexed fee, uint256 price);
    event List(address indexed seller, address indexed nftContract, uint256 indexed tokenId, address currency, uint256 price);
    event Unlist(address indexed nftContract, address indexed currency, uint256 indexed tokenId);
    event FeeSet(address indexed token, uint256 indexed fee);

    constructor(address _adminBuyer, address payable _feeReceiver) {
        setAdminBuyer(_adminBuyer);
        setFeeReceiver(_feeReceiver);
    }

    function setFeeReceiver(address payable _feeReceiver) public onlyOwner {
        feeReceiver = _feeReceiver;
    }

    /** @notice Admin - wallet which can unlist tokens from marketplace
     * 
     */
    function setAdmin(address newAdmin) external onlyOwner {
        admin = newAdmin;
    }

    /**
     * @dev Set fee on every purchase on nft contract.
     */
    function setFee(address nftContract, uint256 fee) external onlyOwner {
        fees[nftContract] = fee;
        emit FeeSet(nftContract, fee);
    }

    function setAdminBuyer(address newBuyer) public onlyOwner {
        adminBuyer = newBuyer;
    }

    function placeOnMarketplace(address nftContract, address token, uint256 tokenId, uint256 price) external {
        IERC721 erc721 = IERC721(nftContract);
        require(
            erc721.getApproved(tokenId) == address(this),
            "Contract must be approved for nft transfer."
        );
        tokensPrices[nftContract][token][tokenId] = price;    
        emit List(msg.sender, nftContract, tokenId, token, price);
    }

    function unlistFromMarketplace(address nftContract, address token, uint256 tokenId) external {
        IERC721 erc721 = IERC721(nftContract);
        require(
            msg.sender == admin || erc721.ownerOf(tokenId) == msg.sender,
            "Invalid sender."
            );
        tokensPrices[nftContract][token][tokenId] = 0;
        emit Unlist(nftContract, token, tokenId);
    }

    function purchaseByERC20(ERC20Purchase calldata args) external {
        _purchaseByERC20(args, msg.sender, msg.sender);
    }

    function _purchaseByERC20(ERC20Purchase calldata args, address buyer, address receiver) private {
        require(tokensPrices[args.nftContract][args.token][args.tokenId] > 0, "This token is not supported for purchase.");
        IERC20 erc20 = IERC20(args.token);
        require(
            erc20.allowance(buyer, address(this)) >= tokensPrices[args.nftContract][args.token][args.tokenId],
            "Insufficient allowance."
        );
        require(
            erc20.balanceOf(buyer) >= tokensPrices[args.nftContract][args.token][args.tokenId],
            "Insufficient balance."
        );
        erc20.transferFrom(buyer, address(this), tokensPrices[args.nftContract][args.token][args.tokenId]);
        IERC721 erc721 = IERC721(args.nftContract);
        address seller = erc721.ownerOf(args.tokenId);
        erc721.transferFrom(seller, receiver, args.tokenId);
        uint256 fee = tokensPrices[args.nftContract][args.token][args.tokenId].mul(fees[args.nftContract]).div(100);
        erc20.transfer(feeReceiver, fee);
        erc20.transfer(seller, tokensPrices[args.nftContract][args.token][args.tokenId].sub(fee));
        emit Purchase(
            seller,
            receiver,
            args.nftContract,
            args.tokenId,
            args.token,
            fee,
            tokensPrices[args.nftContract][args.token][args.tokenId]
        );
        tokensPrices[args.nftContract][args.token][args.tokenId] = 0;
    }

    function purchaseByEth(EthPurchase calldata args) external payable {
        _purchaseByEth(args, msg.sender);
    }

    function _purchaseByEth(EthPurchase calldata args, address receiver) private {
        require(tokensPrices[args.nftContract][address(0)][args.tokenId] > 0, "This token is not supported for purchase.");
        require(msg.value == tokensPrices[args.nftContract][address(0)][args.tokenId], "Wrong amount sent.");
        IERC721 erc721 = IERC721(args.nftContract);
        address payable seller = payable(erc721.ownerOf(args.tokenId));
        erc721.transferFrom(seller, receiver, args.tokenId);
        uint256 fee = tokensPrices[args.nftContract][address(0)][args.tokenId].mul(fees[args.nftContract]).div(100);
        feeReceiver.transfer(fee);
        seller.transfer(msg.value.sub(fee));
        emit Purchase(
            seller,
            receiver,
            args.nftContract,
            args.tokenId,
            address(0),
            fee,
            tokensPrices[args.nftContract][address(0)][args.tokenId]
        );
        tokensPrices[args.nftContract][address(0)][args.tokenId] = 0;
    }

    /**
     * @dev Using for pay for purchase for another wallet by ERC20 tokens.
     *
     * @param args The arguments struct.
     * @param signature Signature from wallet 'buyer', who need to be payed for.
     * @param receiver Address of wallet who need to be payed for.
     */
    function purchaseByERC20WithSignature(ERC20Purchase calldata args, bytes memory signature, address receiver) external {
        require(msg.sender == adminBuyer, "Invalid sender.");
        require(verifySignatureERC20(args, signature, receiver), "Invalid signature.");
        _purchaseByERC20(args, msg.sender, receiver);
    }

    /**
     * @dev Using for pay for purchase for another wallet by ETH.
     *
     * @param args The arguments struct.
     * @param signature Signature from wallet 'buyer', who need to be payed for.
     * @param receiver Address of wallet who need to be payed for.
     */
    function purchaseByEthWithSignature(EthPurchase calldata args, bytes memory signature, address receiver) external payable {
        require(msg.sender == adminBuyer, "Invalid sender.");
        require(verifySignatureEth(args, signature, receiver), "Invalid signature.");
        _purchaseByEth(args, receiver);
    }
}