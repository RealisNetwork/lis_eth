// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./ERC721SeaDrop/ERC721SeaDrop.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./common/meta-transactions/ContextMixin.sol";
import "./common/meta-transactions/NativeMetaTransaction.sol";

contract EggNft is ERC721SeaDrop, Ownable, ContextMixin, NativeMetaTransaction, AccessControl {
    using Counters for Counters.Counter;

    /**
     * OZ Counter util to keep track of the next available ID.
     * We track the nextTokenId instead of the currentTokenId to save users on gas costs. 
     * Read more about it here: https://shiny.mirror.xyz/OUampBbIz9ebEicfGnQf5At_ReMHlZy0tB4glb9xQ0E
    */ 
    Counters.Counter private _nextTokenId;
    Counters.Counter private _totalBurned;

    string private _baseUri;
    string private _contractUri;

    event Mint(address indexed owner, uint256 indexed tokenId);
    event Burn(uint256 indexed tokenId, address indexed from);

    uint256 public burnTime;
    address public proxyRegistryAddress;
    
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    constructor(
        string memory name, 
        string memory symbol,
        string memory baseUri,
        string memory contractUri,
        uint256 _burnTime,
        address _proxyRegistryAddress
    ) ERC721(name, symbol) {
        burnTime = _burnTime;
        proxyRegistryAddress = _proxyRegistryAddress;
        setBaseURI(baseUri);
        setContractURI(contractUri);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // nextTokenId is initialized to 1, since starting at 0 leads to higher gas cost for the first minter
        _nextTokenId.increment();
        _initializeEIP712(name);
    }

    function mint(address receiver) external returns (uint256) {
        uint256 newTokenId = _nextTokenId.current();
        _nextTokenId.increment();

        _safeMint(receiver, newTokenId);

        emit Mint(receiver, newTokenId);

        return newTokenId;
    }

    /**
     * 
     * Will use burn when owner is rewarded.
     */
    function burn(uint256 tokenId) public onlyRole(BURNER_ROLE) {
        require(block.timestamp >= burnTime);
        address owner = ownerOf(tokenId);
        _burn(tokenId);
        _totalBurned.increment();
        emit Burn(tokenId, owner);
    }

    function bulkBurn(uint256[] calldata ids) external onlyRole(BURNER_ROLE) {
        for (uint8 i = 0; i < ids.length; ++i) {
            burn(ids[i]);
        }
    }

    // In case of switching domain
    function setBaseURI(string memory uri) public onlyOwner {
        _baseUri = uri;
    }

    // In case of switching domain
    function setContractURI(string memory uri) public onlyOwner {
        _contractUri = uri;
    }

    function totalSupply() public view returns (uint256) {
        return _nextTokenId.current() - 1 - _totalBurned.current();
    }

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
}