// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract LisMarketplace is Ownable {
    using SafeMath for uint256;

    address payable public feeReceiver;
    // uint256 public ethPrice;
    mapping(address => uint256) public fees;
    mapping(address => mapping(address => mapping(uint256 => uint256))) public tokensPrices;

    event Purchase(address indexed seller, address indexed buyer, uint256 indexed fee, uint256 price);
    event List(address indexed seller, address indexed nftContract, uint256 indexed tokenId, address erc20, uint256 price);
    event FeeSet(address indexed token, uint256 indexed fee);

    function setFeeReceiver(address payable _feeReceiver) external onlyOwner {
        feeReceiver = _feeReceiver;
    }

    function setFee(address token, uint256 fee) external onlyOwner {
        fees[token] = fee;
        emit FeeSet(token, fee);
    }

    function placeOnMarketplaceByToken(address nftContract, address token, uint256 tokenId, uint256 price) external {
        IERC721 erc721 = IERC721(nftContract);
        require(
            erc721.getApproved(tokenId) == address(this),
            "Contract must be approved for nft transfer."
        );
        tokensPrices[nftContract][token][tokenId] = price;    
        emit List(msg.sender, nftContract, tokenId, token, price);
    }

    function placeOnMarketplaceByEth(address nftContract, uint256 tokenId, uint256 price) external {
        IERC721 erc721 = IERC721(nftContract);
        require(
            erc721.getApproved(tokenId) == address(this),
            "Contract must be approved for nft transfer."
        );
        tokensPrices[nftContract][address(0)][tokenId] = price;
        emit List(msg.sender, nftContract, tokenId, address(0), price);
    }

    function purchaseByERC20(address nftContract, address token, uint256 tokenId, address seller) external {
        require(tokensPrices[nftContract][token][tokenId] > 0, "This token is not supported for purchase.");
        IERC20 erc20 = IERC20(token);
        require(
            erc20.allowance(msg.sender, address(this)) >= tokensPrices[nftContract][token][tokenId],
            "Insufficient allowance."
        );
        require(
            erc20.balanceOf(msg.sender) >= tokensPrices[nftContract][token][tokenId],
            "Insufficient balance."
        );
        erc20.transferFrom(msg.sender, address(this), tokensPrices[nftContract][token][tokenId]);
        IERC721 erc721 = IERC721(nftContract);
        erc721.transferFrom(seller, msg.sender, tokenId);
        uint256 fee = tokensPrices[nftContract][token][tokenId].mul(fees[nftContract]).div(100);
        erc20.transfer(feeReceiver, fee);
        erc20.transfer(seller, tokensPrices[nftContract][token][tokenId].sub(fee));
        emit Purchase(
            seller,
            msg.sender,
            fee,
            tokensPrices[nftContract][token][tokenId]
        );
        tokensPrices[nftContract][token][tokenId] = 0xFFFFFFFF;
    }

    function purchaseByEth(address nftContract, uint256 tokenId, address payable seller) external payable {
        require(tokensPrices[nftContract][address(0)][tokenId] > 0, "This token is not supported for purchase.");
        require(msg.value == tokensPrices[nftContract][address(0)][tokenId], "Wrong amount sent.");
        IERC721 erc721 = IERC721(nftContract);
        erc721.transferFrom(seller, msg.sender, tokenId);
        uint256 fee = tokensPrices[nftContract][address(0)][tokenId].mul(fees[nftContract]).div(100);
        feeReceiver.transfer(fee);
        seller.transfer(msg.value.sub(fee));
        emit Purchase(
            seller,
            msg.sender,
            fee,
            tokensPrices[nftContract][address(0)][tokenId]
        );
        tokensPrices[nftContract][address(0)][tokenId] = 0xFFFFFFFF;
    }


}