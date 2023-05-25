// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./common/meta-transactions/ContextMixin.sol";
import "./common/meta-transactions/NativeMetaTransaction.sol";

contract LisNft is ERC721, ContextMixin, NativeMetaTransaction, Ownable, AccessControl {
    using Counters for Counters.Counter;
    /**
     * OZ Counter util to keep track of the next available ID.
     * We track the nextTokenId instead of the currentTokenId to save users on gas costs. 
     * Read more about it here: https://shiny.mirror.xyz/OUampBbIz9ebEicfGnQf5At_ReMHlZy0tB4glb9xQ0E
     */ 
    Counters.Counter private _nextTokenId;
    
    uint256 private _mintTimestamp;
    uint256 private _maxSupply;

    event Mint(address indexed owner, uint256 indexed tokenId, bytes32 indexed hash);

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    mapping(uint256 => bytes32) public nftHashes;

    address public _proxyRegistryAddress;

    constructor(
        uint256 mintTimestamp, 
        uint256 maxSupply, 
        string memory name, 
        string memory symbol,
        address proxyRegistryAddress
        ) ERC721(name, symbol) {
        _mintTimestamp = mintTimestamp;
        _maxSupply = maxSupply;
        _proxyRegistryAddress = proxyRegistryAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // nextTokenId is initialized to 1, since starting at 0 leads to higher gas cost for the first minter
        _nextTokenId.increment();
        _initializeEIP712(name);
    }

    // function mint(address recipient, string memory tokenURI) external onlyOwner returns (uint256) {
    function mint(address receiver, bytes32 nftHash) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(totalSupply() < _maxSupply, "Collection limit has been exceeded.");
        require(block.timestamp <= _mintTimestamp, "Collection mint time has been exceeded.");

        uint256 newTokenId = _nextTokenId.current();
        _nextTokenId.increment();

        _safeMint(receiver, newTokenId);
        nftHashes[newTokenId] = nftHash;
        // _setTokenURI(newTokenId, tokenURI);

        emit Mint(receiver, newTokenId, nftHash);

        return newTokenId;
    }

    //https://www.topaz.so/cdn-cgi/image/width=512,quality=90,fit=scale-down,anim=true,onerror=redirect/https://ipfs.topaz.so//ipfs/bafybeibm3kp3ci3h2vfbq3ktlmlf2ujxrzofy2nugbuq2wjeec47q6aiva/5169.jpeg

   /**
     * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-less listings.
     */
    function isApprovedForAll(address owner, address operator)
        override
        public
        view
        returns (bool)
    {
        // if OpenSea's ERC721 Proxy Address is detected, auto-return true
        if (operator == address(0x58807baD0B376efc12F5AD86aAc70E78ed67deaE)) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, ERC721) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            interfaceId == type(IAccessControl).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
        @dev Returns the total tokens minted so far.
     */
    function totalSupply() public view returns (uint256) {
        return _nextTokenId.current() - 1;
    }

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overridden in child contracts.
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return "https://www.topaz.so/cdn-cgi/image/width=512,quality=90,fit=scale-down,anim=true,onerror=redirect/https://ipfs.topaz.so//ipfs/bafybeibm3kp3ci3h2vfbq3ktlmlf2ujxrzofy2nugbuq2wjeec47q6aiva/";
    }

    /**
     * @dev Uri for contract metadata
    */
    function contractURI() public pure returns (string memory) {
        return "https://metadata-url.com/my-metadata";
    }

    /**
     * This is used instead of msg.sender as transactions won't be sent by the original token owner, but by OpenSea.
     */
    function _msgSender()
        internal
        override
        view
        returns (address sender)
    {
        return ContextMixin.msgSender();
    }

    function getIPFSHash(uint256 tokenId) public view returns (bytes32) {
        return nftHashes[tokenId];
    }
}