// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { PurchaseArgs, Product } from "./MarketplaceStructs.sol";
import "./RelayMarketplace.sol";
import "./Signatures/ERC20Signature.sol";
import "./Signatures/EthSignature.sol";


contract LisMarketplace is Ownable, ERC20Signature, EthSignature, RelayMarketplace {
    using SafeMath for uint256;

    address public adminBuyer;
    address public admin;
    address payable public feeReceiver;
    /**
     * @dev Stores fee percents of nft contracts: fees[nftContract][fee]
     */
    mapping(address => uint256) public fees;

    mapping(address => uint256) public minLimits;

    /**
     * @dev Stores listed nft prices: products[nftContract][tokenId]
     */
    mapping(address => mapping(uint256 => Product)) public products;

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

    function setMinLimit(address currency, uint256 newLimit) public onlyOwner {
        minLimits[currency] = newLimit;
    }

    function placeOnMarketplace(address nftContract, address currency, uint256 tokenId, uint256 price) external {
        IERC721 erc721 = IERC721(nftContract);
        require(fees[nftContract] > 0, "Marketplace doesn't serve this nft contract.");
        require(price >= minLimits[currency], "Price lower than minimum limit.");
        require(
            erc721.getApproved(tokenId) == address(this) || erc721.isApprovedForAll(msg.sender, address(this)),
            "Contract must be approved for nft transfer."
        );
        products[nftContract][tokenId] = Product(currency, price);
        emit List(msg.sender, nftContract, tokenId, currency, price);
    }

    function unlistFromMarketplace(address nftContract, uint256 tokenId) external {
        IERC721 erc721 = IERC721(nftContract);
        require(
            msg.sender == admin || erc721.ownerOf(tokenId) == msg.sender,
            "Invalid sender."
            );
        emit Unlist(nftContract, products[nftContract][tokenId].currency, tokenId);
        delete products[nftContract][tokenId];
    }

    function purchaseByERC20(PurchaseArgs calldata args) external {
        _purchaseByERC20(args, msg.sender, msg.sender);
    }

    function _purchaseByERC20(PurchaseArgs calldata args, address buyer, address nftReceiver) private {
        uint256 price = products[args.nftContract][args.tokenId].price;
        address currency = products[args.nftContract][args.tokenId].currency;
        require(fees[args.nftContract] > 0, "This NFT contract has not been listed.");
        require(price > 0, "This token is not supported for purchase.");
        require(currency != address(0), "Currency must be ERC20 token.");
        IERC20 erc20 = IERC20(currency);
        IERC721 erc721 = IERC721(args.nftContract);
        address seller = erc721.ownerOf(args.tokenId);
        require(
            erc721.getApproved(args.tokenId) == address(this) || erc721.isApprovedForAll(seller, address(this)),
            "Insufficient nft allowance."
        );
        require(
            erc20.allowance(buyer, address(this)) >= price,
            "Insufficient allowance."
        );
        require(
            erc20.balanceOf(buyer) >= price,
            "Insufficient balance."
        );
        uint256 fee = price.mul(fees[args.nftContract]).div(100);
        erc20.transferFrom(buyer, address(this), price);
        erc721.transferFrom(seller, nftReceiver, args.tokenId);
        erc20.transfer(feeReceiver, fee);
        erc20.transfer(seller, price.sub(fee));
        emit Purchase(
            seller,
            nftReceiver,
            args.nftContract,
            args.tokenId,
            currency,
            fee,
            price
        );
        delete products[args.nftContract][args.tokenId];
    }

    function purchaseByEth(PurchaseArgs calldata args) external payable {
        _purchaseByEth(args, msg.sender);
    }

    function _purchaseByEth(PurchaseArgs calldata args, address receiver) private {
        require(fees[args.nftContract] > 0, "This NFT contract has not been listed.");
        require(products[args.nftContract][args.tokenId].price > 0, "This token is not supported for purchase.");
        require(products[args.nftContract][args.tokenId].currency == address(0), "Currency must be zero address.");
        IERC721 erc721 = IERC721(args.nftContract);
        address payable seller = payable(erc721.ownerOf(args.tokenId));
        require(
            erc721.getApproved(args.tokenId) == address(this) || erc721.isApprovedForAll(seller, address(this)),
            "Insufficient nft allowance."
        );
        require(msg.value == products[args.nftContract][args.tokenId].price, "Wrong amount sent.");
        uint256 fee = products[args.nftContract][args.tokenId].price.mul(fees[args.nftContract]).div(100);
        erc721.transferFrom(seller, receiver, args.tokenId);
        feeReceiver.transfer(fee);
        seller.transfer(msg.value.sub(fee));
        emit Purchase(
            seller,
            receiver,
            args.nftContract,
            args.tokenId,
            products[args.nftContract][args.tokenId].currency,
            fee,
            products[args.nftContract][args.tokenId].price
        );
        delete products[args.nftContract][args.tokenId];
    }

    function purchaseCex(PurchaseArgs calldata args, bytes memory signature, address receiver) external {
        require(msg.sender == adminBuyer, "Invalid sender.");
        require(verifySignatureERC20(args, signature, receiver), "Invalid signature.");

        require(fees[args.nftContract] > 0, "This NFT contract has not been listed.");
        require(products[args.nftContract][args.tokenId].price > 0, "This token is not supported for purchase.");
        IERC721 erc721 = IERC721(args.nftContract);
        address seller = erc721.ownerOf(args.tokenId);
        require(
            erc721.getApproved(args.tokenId) == address(this) || erc721.isApprovedForAll(seller, address(this)),
            "Insufficient nft allowance."
        );
        uint256 fee = products[args.nftContract][args.tokenId].price.mul(fees[args.nftContract]).div(100);
        erc721.transferFrom(seller, receiver, args.tokenId);
        emit Purchase(
            seller,
            receiver,
            args.nftContract,
            args.tokenId,
            products[args.nftContract][args.tokenId].currency,
            fee,
            products[args.nftContract][args.tokenId].price
        );
        delete products[args.nftContract][args.tokenId];
    }

    /**
     * @dev Using for pay for purchase for another wallet by ERC20 tokens.
     *
     * @param args The arguments struct.
     * @param signature Signature from wallet 'buyer', who need to be payed for.
     * @param nftReceiver Address of wallet who need to be payed for.
     */
    function purchaseByERC20WithSignatureDex(PurchaseArgs calldata args, bytes memory signature, address nftReceiver) external {
        require(msg.sender == adminBuyer, "Invalid sender.");
        require(verifySignatureERC20(args, signature, nftReceiver), "Invalid signature.");
        _purchaseByERC20(args, msg.sender, nftReceiver);
    }

   /**
     * @dev Using for pay for purchase for another wallet by ETH.
     *
     * @param args The arguments struct.
     * @param signature Signature from wallet 'buyer', who need to be payed for.
     * @param receiver Address of wallet who need to be payed for.
     */
    function purchaseByEthWithSignatureDex(PurchaseArgs calldata args, bytes memory signature, address receiver) external payable {
        require(msg.sender == adminBuyer, "Invalid sender.");
        require(verifySignatureEth(args, signature, receiver), "Invalid signature.");
        _purchaseByEth(args, receiver);
    }
}