const { expect } = require('chai');
const { ethers } = require('hardhat');
const { notOwnerErrorStr, makeAccessControleErrorStr } = require('./utils/errors-strings');
const { expectRevert } = require('@openzeppelin/test-helpers')

const ONE_GWEI = 1_000_000_000;
const BURNER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BURNER_ROLE"));
const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
const newUri = 'https://www.google.com.ua/';

async function deployNft(args) {
    const ERC721Token = await ethers.getContractFactory('EggNft');
    const token = await ERC721Token.deploy(
        args.name,
        args.symbol,
        args.baseUri,
        args.contractUri,
        args.burnTime,
        args.proxyRegistry,
    );
    await token.deployed();
    return token;
}

describe('EggNft', function() {
    let token;
    let owner;
    let addr1, addr2;

    const TOKEN_NAME = 'MeowgonEgg';
    const TOKEN_SYMBOL = 'MEGG';
    const CONTRACT_URI = 'https://evm.realiscompany.com/';
    const BASE_URI = 'https://evm.realiscompany-base.com/';
    const PROXY_REGISTRY = '0x58807baD0B376efc12F5AD86aAc70E78ed67deaE';
    const BURN_TIME = 1696597447;
    const BURN_OUTDATED = 1675688647;
    
    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const nftArgs = {
            name: TOKEN_NAME,
            symbol: TOKEN_SYMBOL,
            baseUri: BASE_URI,
            contractUri: CONTRACT_URI,
            burnTime: BURN_TIME,
            proxyRegistry: PROXY_REGISTRY,
        };

        token = await deployNft(nftArgs);
    })

    describe('Ownership', function() {
        it('Should set the right owner', async () => {
            expect(await token.owner()).to.equal(owner.address);
        });
    })

    describe('Roles', function() {
        it('Default admin should can give admin role to another wallet', async () => {
            await token.connect(owner).grantRole(DEFAULT_ADMIN_ROLE, addr1.address);
            expect(await token.hasRole(DEFAULT_ADMIN_ROLE, addr1.address)).to.equal(true);
            //To check that owner doesn't lose his admin role (made give, not transfer)
            expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
        })
  
          it('Wallet that just got adming role can give role to another wallet', async () => {
              await token.connect(owner).grantRole(DEFAULT_ADMIN_ROLE, addr1.address);
              await token.connect(addr1).grantRole(DEFAULT_ADMIN_ROLE, addr2.address);
              expect(await token.hasRole(DEFAULT_ADMIN_ROLE, addr2.address)).to.equal(true);
          })
  
          it('Admin can revoke admin roles on another wallets', async () => {
              await token.connect(owner).revokeRole(DEFAULT_ADMIN_ROLE, addr1.address);
              await token.connect(owner).revokeRole(DEFAULT_ADMIN_ROLE, addr2.address);
              expect(await token.hasRole(DEFAULT_ADMIN_ROLE, addr1.address)).to.equal(false);
              expect(await token.hasRole(DEFAULT_ADMIN_ROLE, addr2.address)).to.equal(false);
          })
  
          it(`Admin can't call BURN with no BURNER_ROLE`, async () => {
            await expectRevert(
              token.connect(owner).burn(1),
              makeAccessControleErrorStr(owner.address, BURNER_ROLE)
            );
          })
  
          it('Admin should be able to set BURNER_ROLE to another', async () => {
            await token.connect(owner).grantRole(BURNER_ROLE, addr1.address);
            expect(await token.hasRole(BURNER_ROLE, addr1.address)).to.equal(true);
          })
  
          it('Root by default should not have BURNER_ROLE', async () => {
            expect(await token.hasRole(BURNER_ROLE, owner.address)).to.equal(false);
          })
    })

    describe('Set URIs', function() {
        it('Not owner can not set base URI', async function() {
            await expectRevert(
                token.connect(addr1).setBaseURI(newUri),
                notOwnerErrorStr,
            );
        })

        it('Not owner can not set base URI', async function() {
            await expectRevert(
                token.connect(addr1).setBaseURI(newUri),
                notOwnerErrorStr,
            );
        })
    })

    describe('Mint', function() {
        it('Mint works, total supply counts rights', async function() {
            const filter = token.filters.Mint(null, null);
            const eventPromise = new Promise((resolve) => {
            token.on(filter, (owner, tokenId) => {
                resolve({ owner, tokenId });
                });
            });
            expect(await token.totalSupply()).to.equal(0);
            await token.mint(addr1.address);
            const event = await eventPromise;
            expect(event.owner).to.equal(addr1.address);
            expect(await token.totalSupply()).to.equal(1);
            await token.mint(addr2.address);
            expect(await token.totalSupply()).to.equal(2);
            expect(await token.ownerOf(1)).to.equal(addr1.address);
            expect(await token.ownerOf(2)).to.equal(addr2.address);
        })
    })

    describe('Can not burn', function() {
        it('Can not burn because current time < burnTime', async function() {
            await token.connect(owner).mint(owner.address);
            await expectRevert(
                token.connect(owner).burn(1),
                makeAccessControleErrorStr(owner.address, BURNER_ROLE)
            );
        })
    })
})