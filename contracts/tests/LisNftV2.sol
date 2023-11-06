// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";

import "../NFT/common/meta-transactions/ContextMixin.sol";
import "../NFT/common/meta-transactions/NativeMetaTransaction.sol";

contract LisNftV2 is ERC721EnumerableUpgradeable, ContextMixin, NativeMetaTransaction, OwnableUpgradeable, AccessControl {
    using Counters for Counters.Counter;

    /**
     * OZ Counter util to keep track of the next available ID.
     * We track the nextTokenId instead of the currentTokenId to save users on gas costs. 
     * Read more about it here: https://shiny.mirror.xyz/OUampBbIz9ebEicfGnQf5At_ReMHlZy0tB4glb9xQ0E
     */ 
    Counters.Counter private _nextTokenId;
    
    uint256 public _mintTimestamp;
    uint256 private _maxSupply;
    string private _baseUri;
    string private _contractUri;

    event Mint(address indexed owner, uint256 indexed tokenId, string hash);
    event Burn(uint256 indexed tokenId);

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    mapping(uint256 => string) public nftHashes;

    address public _proxyRegistryAddress;
    address public _signerWallet;

    address payable public feeReceiver;
    uint256 public ethPrice;
    mapping(address => uint256) public tokensPrices;
    uint256 public newTestVariable;
    event NewTestVarSet(uint256 indexed newTestVariable);

    function setTestVar(uint256 _newTestVariable) external {
        newTestVariable = _newTestVariable;
        emit NewTestVarSet(_newTestVariable);
    }

    function initialize(
        uint256 mintTimestamp, 
        uint256 maxSupply, 
        string memory name, 
        string memory symbol,
        address signerWallet,
        address proxyRegistryAddress,
        address payable _feeReceiver,
        string memory baseUri,
        string memory contractUri
        ) external initializer {
        OwnableUpgradeable.__Ownable_init();
        ERC721EnumerableUpgradeable.__ERC721Enumerable_init();
        ERC721Upgradeable.__ERC721_init(name, symbol);
        _mintTimestamp = mintTimestamp;
        _maxSupply = maxSupply;
        _signerWallet = signerWallet;
        _proxyRegistryAddress = proxyRegistryAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setBaseURI(baseUri);
        _setContractURI(contractUri);
        setFeeReceiver(_feeReceiver);

        // nextTokenId is initialized to 1, since starting at 0 leads to higher gas cost for the first minter
        _nextTokenId.increment();
        _initializeEIP712(name);
        }

    function setFeeReceiver(address payable _feeReceiver) public onlyRole(DEFAULT_ADMIN_ROLE) {
        feeReceiver = _feeReceiver;
    }

    function setEthPrice(uint256 newPrice) external onlyRole(DEFAULT_ADMIN_ROLE) {
        ethPrice = newPrice;
    }

    function setTokenPrice(address token, uint256 price) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokensPrices[token] = price;
    }

    function mintByEth(address receiver, string memory nftHash) external payable returns (uint256) {
        require(ethPrice > 0, "There is no price set.");
        require(msg.value == ethPrice, "Wrong amount sent.");
        uint256 tokenId = _mint(receiver, nftHash);
        feeReceiver.transfer(msg.value);
        return tokenId;
    }

    function mintByToken(address receiver, string memory nftHash, address token) external returns (uint256) {
        require(tokensPrices[token] > 0, "This token not supported.");
        IERC20 erc20 = IERC20(token);
        require(
            erc20.allowance(msg.sender, address(this)) >= tokensPrices[token],
            "Insufficient allowance."
        );
        require(
            erc20.balanceOf(msg.sender) >= tokensPrices[token],
            "Insufficient balance."
        );
        uint256 tokenId = _mint(receiver, nftHash);
        erc20.transferFrom(msg.sender, feeReceiver, tokensPrices[token]);
        return tokenId;
    }

    function mint(address receiver, string memory nftHash) external onlyRole(MINTER_ROLE) returns (uint256) {
        return _mint(receiver, nftHash);
    }

    function _mint(address receiver, string memory nftHash) private returns (uint256) {
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
        // override(ERC721, IERC721)
        override(ERC721Upgradeable, IERC721Upgradeable)
        public
        view
        returns (bool)
    {
        // if OpenSea's ERC721 Proxy Address is detected, auto-return true
        if (operator == _proxyRegistryAddress) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, ERC721EnumerableUpgradeable) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            interfaceId == type(IAccessControl).interfaceId ||
            interfaceId == type(IERC721EnumerableUpgradeable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function transferWithSignature(
        address from,
        address to,
        uint256 tokenId,
        bytes memory signature
    ) external {
        require(from == msg.sender, "Invalid sender");
        require(
            verifySignature(from, to, tokenId, signature),
            "Invalid signature"
        );

        _transfer(from, to, tokenId);
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
        override(Context, ContextUpgradeable)
        view
        returns (address sender)
    {
        return ContextMixin.msgSender();
    }

    function _msgData() internal override(Context, ContextUpgradeable) view returns (bytes calldata) {
        return msg.data;
    }

    function verifySignature(
        address from,
        address to,
        uint256 tokenId,
        bytes memory signature
    ) public view returns (bool) {
        bytes32 messageHash = getMessageHash(from, to, tokenId);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, signature) == _signerWallet;
    }

    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(
        bytes memory sig
    ) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");

        assembly {
            /*
            First 32 bytes stores the length of the signature

            add(sig, 32) = pointer of sig + 32
            effectively, skips first 32 bytes of signature

            mload(p) loads next 32 bytes starting at the memory address p into memory
            */

            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        // implicitly return (r, s, v)
    }

    function getMessageHash(address from, address to, uint256 tokenId)
        public
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                from,
                to,
                tokenId
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