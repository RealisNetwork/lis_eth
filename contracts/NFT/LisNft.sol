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

    struct TransferMessage {
        address from;
        address to;
        uint256 tokenId;
    }

    /**
     * OZ Counter util to keep track of the next available ID.
     * We track the nextTokenId instead of the currentTokenId to save users on gas costs. 
     * Read more about it here: https://shiny.mirror.xyz/OUampBbIz9ebEicfGnQf5At_ReMHlZy0tB4glb9xQ0E
     */ 
    Counters.Counter private _nextTokenId;
    Counters.Counter private _totalBurned;
    
    uint256 private _mintTimestamp;
    uint256 private _maxSupply;
    string private _baseUri;
    string private _contractUri;

    event Mint(address indexed owner, uint256 indexed tokenId, string hash);
    event Burn(uint256 indexed tokenId);

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // mapping(uint256 => bytes32) public nftHashes;
    mapping(uint256 => string) public nftHashes;

    address public _proxyRegistryAddress;
    address public _signerWallet;

    constructor(
        uint256 mintTimestamp, 
        uint256 maxSupply, 
        string memory name, 
        string memory symbol,
        address signerWallet,
        address proxyRegistryAddress,
        string memory baseUri,
        string memory contractUri
        ) ERC721(name, symbol) {
        _mintTimestamp = mintTimestamp;
        _maxSupply = maxSupply;
        _signerWallet = signerWallet;
        _proxyRegistryAddress = proxyRegistryAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setBaseURI(baseUri);
        _setContractURI(contractUri);

        // nextTokenId is initialized to 1, since starting at 0 leads to higher gas cost for the first minter
        _nextTokenId.increment();
        _initializeEIP712(name);
    }

    // function mint(address receiver, bytes32 nftHash) external onlyRole(MINTER_ROLE) returns (uint256) {
        function mint(address receiver, string memory nftHash) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(totalSupply() < _maxSupply, "Collection limit has been exceeded.");
        require(block.timestamp <= _mintTimestamp, "Collection mint time has been exceeded.");

        uint256 newTokenId = _nextTokenId.current();
        _nextTokenId.increment();

        _safeMint(receiver, newTokenId);
        nftHashes[newTokenId] = nftHash;

        emit Mint(receiver, newTokenId, nftHash);

        return newTokenId;
    }

    /**
     * @dev Burns `tokenId`. See {ERC721-_burn}.
     *
     * Requirements:
     *
     * - The caller must own `tokenId` or be an approved operator.
     */
    function burn(uint256 tokenId) public virtual onlyRole(BURNER_ROLE) {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner or approved");
        _burn(tokenId);
        _totalBurned.increment();
        emit Burn(tokenId);
    }

    function bulkBurn(uint256[] calldata ids) external onlyRole(BURNER_ROLE) {
        for (uint256 i = 0; i < ids.length; ++i) {
            burn(ids[i]);
        }
    }

    function setSignerWallet(address newSigner) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        _signerWallet = newSigner;
        return true;
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
        return _nextTokenId.current() - 1 - _totalBurned.current();
    }

    function transferWithSignature(
        TransferMessage memory message,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(message.from == msg.sender, "Invalid sender");
        require(
            verifySignature(message, v, r, s),
            "Invalid signature"
        );

        _transfer(message.from, message.to, message.tokenId);
    }

    // In case of switching domain
    function setBaseURI(string memory newUri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setBaseURI(newUri);
    }

    // In case of switching domain
    function setContractURI(string memory newUri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setContractURI(newUri);
    }

    /**
     * @dev Uri for contract metadata
    */
    function contractURI() public view returns (string memory) {
        return _contractUri;
    }

    function _setBaseURI(string memory newUri) internal {
        _baseUri = newUri;
    }

    function _setContractURI(string memory newUri) internal {
        _contractUri = newUri;
    }

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overridden in child contracts.
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseUri;
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireMinted(tokenId);

        string memory baseURI = _baseURI();
        // bytes32 nftHash = nftHashes[tokenId];
        string memory nftHash = nftHashes[tokenId];
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, nftHash)) : "";
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

    function verifySignature(
        TransferMessage memory message,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view returns (bool) {
        bytes32 messageHash = getMessageHash(message);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        address recoveredSigner = ecrecover(ethSignedMessageHash, v, r, s);
        return recoveredSigner == _signerWallet;
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