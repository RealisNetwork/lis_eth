const { expect } = require('chai');
const { ethers } = require('hardhat');

const { BigNumber } = ethers;

const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers')
const { 
    makeAccessControleErrorStr, 
    revokeRoleErrorStr,
    transferFromErrorStr,
    nftMaxSupplyErrorStr,
    nftMintTimeErrorStr,
    nftNoOwnerErrorStr,
} = require('./utils/errors-strings');

const ONE_GWEI = 1_000_000_000;
const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
const BURNER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BURNER_ROLE"));
const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;

async function deployNft(nftArgs) {
  const ERC721Token = await ethers.getContractFactory('LisNft');
  const token = await ERC721Token.deploy(
    nftArgs.timestamp,
    nftArgs.maxSupply,
    nftArgs.tokenName,
    nftArgs.symbol,
    nftArgs.signer,
    nftArgs.proxyRegistry,
    nftArgs.feeReceiver,
    nftArgs.baseUri,
    nftArgs.contractUri,
  );
  await token.deployed();
  return token;
}

async function deployLisErc20(args) {
  const ERC20Token = await ethers.getContractFactory('Lis');
  const erc20 = await ERC20Token.deploy();
  await erc20.deployed();
  return erc20;
}

describe('NFT', function () {
    let token;
    let owner;
    let addr1;
    let addr2;
    let signer;
    const signerPrivate = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const MAX_SUPPLY =  1000;
    const RIGHT_TIME = 1685281800000;
    const TOKEN_NAME = 'LisNft';
    const TOKEN_SYMBOL = 'LNFT';
    // const nftHash = ethers.utils.hexZeroPad('0x6d795f76616c7565', 32);
    const nftHash = 'x6d795f76616c7565';
    const PROXY_REGISTRY = '0x58807baD0B376efc12F5AD86aAc70E78ed67deaE';
    const CONTRACT_URI = 'https://evm.realiscompany.com/';
    const BASE_URI = 'https://evm.realiscompany-base.com/';
    const feeReceiver = '0x2546BcD3c84621e976D8185a91A922aE77ECEc30';
  
    beforeEach(async function () {
      [owner, addr1, addr2] = await ethers.getSigners();
      signer = owner;
      const nftArgs = {
        timestamp: RIGHT_TIME,
        maxSupply: MAX_SUPPLY,
        tokenName: TOKEN_NAME,
        symbol: TOKEN_SYMBOL,
        signer: signer.address,
        proxyRegistry: PROXY_REGISTRY,
        feeReceiver,
        baseUri: BASE_URI,
        contractUri: CONTRACT_URI,
      };
  
      token = await deployNft(nftArgs);
    });

    describe('Roles, ownership', () => {
        it('Should set the right owner', async () => {
            expect(await token.owner()).to.equal(owner.address);
          });

        it('Default admin must be same wallet that made deploy', async () => {
            expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
        })

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

        it('Not admin can not grant MINTER roles to others', async () => {
            await expectRevert(
              token.connect(addr1).grantRole(MINTER_ROLE, addr2.address),
                makeAccessControleErrorStr(addr1.address, DEFAULT_ADMIN_ROLE)
            );
        })

        it(`Root by default doesn't have MINTER role`, async () => {
            expect(await token.hasRole(MINTER_ROLE, owner.address)).to.equal(false);
        })

        it(`Admin can't call mint with no MINTER role`, async () => {
            await expectRevert(
                token.connect(owner).mint(owner.address, nftHash),
                makeAccessControleErrorStr(owner.address, MINTER_ROLE)
            );
        })

        it(`Admin can't call BURN with no BURNER_ROLE`, async () => {
          await expectRevert(
            token.connect(owner).burn(1),
            makeAccessControleErrorStr(owner.address, BURNER_ROLE)
          );
        })

        it('Admin should be able to give MINTER role', async function() {
          await token.connect(owner).grantRole(MINTER_ROLE, addr1.address);
          expect(await token.hasRole(MINTER_ROLE, addr1.address)).to.equal(true);
      });

        it('Admin should be able to set BURNER_ROLE to another', async () => {
          await token.connect(owner).grantRole(BURNER_ROLE, addr1.address);
          expect(await token.hasRole(BURNER_ROLE, addr1.address)).to.equal(true);
        })

        it('Root by default should not have BURNER_ROLE', async () => {
          expect(await token.hasRole(BURNER_ROLE, owner.address)).to.equal(false);
        })
    })

    describe('Token transfer and mint', () => {
        it('should mint a new token', async function () {
            await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
            await token.connect(owner).mint(addr1.address, nftHash);
            const ownerOfToken = await token.ownerOf(1);
        
            expect(ownerOfToken).to.equal(addr1.address);
          });
        
          it('should not allow minting from non-MINTER accounts', async function () {
            await expectRevert(
              token.connect(addr1).mint(addr2.address, nftHash),
              makeAccessControleErrorStr(addr1.address, MINTER_ROLE)
            );
          });
        
          it('should transfer a token from one account to another', async function () {
            await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
            await token.connect(owner).mint(addr1.address, nftHash);
            const tokenId = 1;
        
            await token.connect(addr1).transferFrom(addr1.address, addr2.address, tokenId);
        
            const ownerOfToken = await token.ownerOf(tokenId);
            expect(ownerOfToken).to.equal(addr2.address);
          });
        
          it('should not allow transferring a token without approval', async function () {
            await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
            await token.connect(owner).mint(addr1.address, nftHash);
            const tokenId = 1;

            await expectRevert(
              token.connect(addr2).transferFrom(addr1.address, addr2.address, tokenId),
              transferFromErrorStr,
            );
            // await expect(token.connect(addr2).transferFrom(addr1.address, addr2.address, tokenId))
                  // .to.be.rejectedWith(transferFromErrorStr);
          });

          it('should allow transferring a token with approval', async function () {
            await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
            await token.connect(owner).mint(addr1.address, nftHash);
            const tokenId = 1;
            await token.connect(addr1).approve(addr2.address, tokenId);

            await token.connect(addr2).transferFrom(addr1.address, addr2.address, tokenId);

            const tokenOwner = await token.ownerOf(tokenId);
            expect(tokenOwner).to.equal(addr2.address);
          });

          it('should be able to handle Mint event', async function () {
            // Subscribe to the Transfer event
            const filter = token.filters.Mint(null, null, null);
            const eventPromise = new Promise((resolve) => {
            token.on(filter, (owner, tokenId, hash) => {
                resolve({ owner, tokenId, hash });
            });
            });

            await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
            await token.connect(owner).mint(addr1.address, nftHash);

            // Wait for the event to be emitted
            const event = await eventPromise;

            expect(event.owner).to.equal(addr1.address);
            expect(event.tokenId).to.equal(1);
          });

          it('Total supply shows right value', async function () {
            await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
            const totalSupply0 = await token.totalSupply();
            expect(totalSupply0).to.equal(0);
            await token.connect(owner).mint(addr1.address, nftHash);
            const totalSupply1 = await token.totalSupply();
            expect(totalSupply1).to.equal(1);

            await token.connect(owner).mint(addr1.address, nftHash);
            const totalSupply2 = await token.totalSupply();
            expect(totalSupply2).to.equal(2);

            await token.connect(owner).mint(addr1.address, nftHash);
            const totalSupply3 = await token.totalSupply();
            expect(totalSupply3).to.equal(3);
          })
    })
  
    describe('Check restrictions', () => {
        it("Can't mint more than maxSupply", async function() {
            await token.connect(owner).grantRole(MINTER_ROLE, owner.address);

            for(let i = 0; i < MAX_SUPPLY; ++i) {
                await token.connect(owner).mint(addr1.address, nftHash);
            }

            await expectRevert(
                token.connect(owner).mint(addr1.address, nftHash),
                nftMaxSupplyErrorStr
            );
        })
    });
  
    describe("Check with obsolete time", function() {
      const OUT_OF_DATE_TIME = Math.round((Date.now() - 10 * 60 * 1000) / 1000);
  
      beforeEach(async function () {
        const nftArgs = {
          timestamp: OUT_OF_DATE_TIME,
          maxSupply: MAX_SUPPLY,
          tokenName: TOKEN_NAME,
          symbol: TOKEN_SYMBOL,
          signer: signer.address,
          proxyRegistry: PROXY_REGISTRY,
          feeReceiver,
          baseUri: BASE_URI,
          contractUri: CONTRACT_URI,
        };
          token = await deployNft(nftArgs);
        });
  
      it("Can't mint when time is over", async function() {
          await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
  
          await expectRevert(
              token.connect(owner).mint(addr1.address, nftHash),
              nftMintTimeErrorStr
          );
      })
  })
  
  describe("Try to mint with max supply = 1", async function() {
    beforeEach(async function () {
      const ERC721Token = await ethers.getContractFactory('LisNft');
      [owner, addr1, addr2] = await ethers.getSigners();
  
      token = await ERC721Token.deploy(
        RIGHT_TIME,
        1,
        TOKEN_NAME,
        TOKEN_SYMBOL,
        signer.address,
        PROXY_REGISTRY,
        BASE_URI,
        CONTRACT_URI,
      );
      await token.deployed();
    });
  
    await token.connect(owner).grantRole(MINTER_ROLE, owner.address);

    it('Try to mint with max supply = 1', async function () {
      const filter = token.filters.Mint(null, null, null);
      const eventPromise = new Promise((resolve) => {
        token.on(filter, (owner, tokenId, hash) => {
          resolve({ owner, tokenId, hash });
        });
      });
  
  
      await token.connect(owner).mint(owner.address, nftHash);
      const event = await eventPromise;
  
      expect(event.owner).to.equal(owner.address);
      expect(event.tokenId).to.equal(1);
      expect(event.hash).to.equal(nftHash);
    })
  })

  describe('Burn', function () {
    const nftHash1 = ethers.utils.hexZeroPad('0x6d795f76616c7564', 32);
    const nftHash2 = ethers.utils.hexZeroPad('0x6d795f76616c7566', 32);
    const nftHash3 = ethers.utils.hexZeroPad('0x6d795f76616c7567', 32);
    const nftHash4 = ethers.utils.hexZeroPad('0x6d795f76616c7568', 32);

    it('Burner should be able to burn token', async () => {
      await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
      await token.connect(owner).mint(owner.address, nftHash);
      const tokenId = 1;
      await token.connect(owner).grantRole(BURNER_ROLE, owner.address);
      
      const filter = token.filters.Burn(null);
      const eventPromise = new Promise((resolve) => {
        token.on(filter, (tokenId) => {
            resolve({ tokenId });
          });
        });
      await token.connect(owner).burn(tokenId);

      const event = await eventPromise;

      expect(event.tokenId).to.equal(tokenId);
    })
    //TODO: Check on length >= 256
    it('Burner should be able to bulk burn tokens', async () => {
      await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
      await token.connect(owner).grantRole(BURNER_ROLE, owner.address);
      const tokenIds = [1, 2, 3, 4, 5];
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(1);
      await token.connect(owner).mint(owner.address, nftHash1);
      expect(await token.totalSupply()).to.equal(2);
      await token.connect(owner).mint(owner.address, nftHash2);
      expect(await token.totalSupply()).to.equal(3);
      await token.connect(owner).mint(owner.address, nftHash3);
      expect(await token.totalSupply()).to.equal(4);
      await token.connect(owner).mint(owner.address, nftHash4);
      expect(await token.totalSupply()).to.equal(5);

      for (let i = 0; i < tokenIds.length; i++) {
        expect(await token.ownerOf(tokenIds[0])).to.equal(owner.address);
        expect(await token.ownerOf(tokenIds[1])).to.equal(owner.address);
        expect(await token.ownerOf(tokenIds[2])).to.equal(owner.address);
        expect(await token.ownerOf(tokenIds[3])).to.equal(owner.address);
        expect(await token.ownerOf(tokenIds[4])).to.equal(owner.address); 
      }

      const txHash = await token.connect(owner).bulkBurn(tokenIds);
      expect(await token.totalSupply()).to.equal(0);
      const receipt = await txHash.wait();
      const burnEvents = receipt.events.filter((event) => event.event === 'Burn');

      const burnedTokenIds = burnEvents.map((e) => e.args.tokenId.toNumber());
      expect(burnEvents).to.have.lengthOf(tokenIds.length);
      expect(burnedTokenIds).to.have.members(tokenIds);

      for (let i = 0; i < tokenIds.length; i++) {
        await expectRevert(
          token.ownerOf(tokenIds[i]),
          nftNoOwnerErrorStr
        )
      }
    })

    it('Check bulk burn with array of 256 elements', async function () {
      await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
      await token.connect(owner).grantRole(BURNER_ROLE, owner.address);
      const tokenIds = [];
      for(let i = 1; i <= 256; ++i) {
        tokenIds.push(i);
        await token.connect(owner).mint(owner.address, nftHash);
      }

      const txHash = await token.connect(owner).bulkBurn(tokenIds);

      expect(await token.totalSupply()).to.equal(0);
      const receipt = await txHash.wait();
      const burnEvents = receipt.events.filter((event) => event.event === 'Burn');

      const burnedTokenIds = burnEvents.map((e) => e.args.tokenId.toNumber());
      expect(burnEvents).to.have.lengthOf(tokenIds.length);
      expect(burnedTokenIds).to.have.members(tokenIds);

      for (let i = 0; i < tokenIds.length; i++) {
        await expectRevert(
          token.ownerOf(tokenIds[i]),
          nftNoOwnerErrorStr
        )
      }
    })
  })

  describe('Check contract URIS', function () {
    it('Contract URI == valut put in constructor', async () => {
      expect(await token.contractURI()).to.equal(CONTRACT_URI);
    })

    it('Token URI == baseUri + hash', async () => {
      await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
      await token.connect(owner).mint(owner.address, nftHash);
      const tokenId = 1;
      const uri = await token.tokenURI(tokenId);
      expect(uri).to.equal(`${BASE_URI}${nftHash}`);
    })
  })

  //TODO: check totalSupply on burn

  describe('Check mint payments', function () {
    let lis;
    beforeEach(async function () {
      const nftArgs = {
        timestamp: RIGHT_TIME,
        maxSupply: MAX_SUPPLY,
        tokenName: TOKEN_NAME,
        symbol: TOKEN_SYMBOL,
        signer: signer.address,
        proxyRegistry: PROXY_REGISTRY,
        feeReceiver,
        baseUri: BASE_URI,
        contractUri: CONTRACT_URI,
      };
  
      await deployNft(nftArgs);
      lis = await deployLisErc20();
    })

    it('Fee receiver can not be set by wallet with no admin role', async function () {
      await expectRevert(
        token.connect(addr1).setFeeReceiver(feeReceiver),
        makeAccessControleErrorStr(addr1.address, DEFAULT_ADMIN_ROLE)
      );
    })

    it('Admin can set fee receiver', async function () {
      const newReceiver = addr2.address;
      expect(await token.feeReceiver()).to.equal(feeReceiver);
      await token.connect(owner).setFeeReceiver(newReceiver);
      expect(await token.feeReceiver()).to.equal(newReceiver);
    })

    it('Eth price can not be set by wallet with no admin role', async function () {
      await expectRevert(
        token.connect(addr1).setEthPrice(ONE_GWEI),
        makeAccessControleErrorStr(addr1.address, DEFAULT_ADMIN_ROLE)
      );
    })

    it('Admin can set eth price', async function () {
      expect(await token.ethPrice()).to.equal(0);
      await token.connect(owner).setEthPrice(ONE_GWEI);
      expect(await token.ethPrice()).to.equal(ONE_GWEI);
    })

    it('Token price can not be set by wallet with no admin role', async function () {
      await expectRevert(
        token.connect(addr1).setTokenPrice(lis.address, ONE_GWEI),
        makeAccessControleErrorStr(addr1.address, DEFAULT_ADMIN_ROLE),
      );
    })

    it('Admin can set tokens price', async function () {
      expect(await token.tokensPrices(lis.address)).to.equal(0);
      await token.connect(owner).setTokenPrice(lis.address, ONE_GWEI);
      expect(await token.tokensPrices(lis.address)).to.equal(ONE_GWEI);
    })

    it('NFT can not be minted if eth price == 0', async function () {
      await expectRevert(
        token.connect(addr1).mintByEth(addr1.address, nftHash, { value: ONE_GWEI }),
        'There is no price set.'
      );
    })

    it('NFT can not be minted if value that has been sent !== eth price', async function () {
      await token.connect(owner).setEthPrice(ONE_GWEI);
      await expectRevert(
        token.connect(addr1).mintByEth(addr1.address, nftHash, { value: ONE_GWEI - 1 }),
        'Wrong amount sent.'
      );
      await expectRevert(
        token.connect(addr1).mintByEth(addr1.address, nftHash, { value: ONE_GWEI + 1 }),
        'Wrong amount sent.'
      );
    })

    it('NFT can be minted by any wallet if sent value == eth price', async function () {
      await token.connect(owner).setEthPrice(ONE_GWEI);
      const filter = token.filters.Mint(null, null, null);
            const eventPromise = new Promise((resolve) => {
            token.on(filter, (owner, tokenId, hash) => {
                resolve({ owner, tokenId, hash });
              });
            });


      const feeReceiverBalanceBefore = await ethers.provider.getBalance(feeReceiver);
      await token.connect(owner).setFeeReceiver(feeReceiver);
      await token.connect(addr1).mintByEth(addr1.address, nftHash, { value: ONE_GWEI });
      const event = await eventPromise;
      expect(event.tokenId).to.equal(1);
      expect(event.owner).to.equal(addr1.address);
      expect(await token.ownerOf(1)).to.equal(addr1.address);
      expect(await ethers.provider.getBalance(feeReceiver)).to.equal(feeReceiverBalanceBefore.add(ONE_GWEI));
    })

    it('NFT can not be minter if ERC20 token does not have approval', async function () {
      await token.connect(owner).setTokenPrice(lis.address, ONE_GWEI);
      await expectRevert(
        token.connect(addr1).mintByToken(addr1.address, nftHash, lis.address),
        'Insufficient allowance.'
      );
    })

    it('NFT can not be minter if ERC20 token === zero price', async function () {
      await expectRevert(
        token.connect(addr1).mintByToken(addr1.address, nftHash, lis.address),
        'This token not supported.'
      );
    })

    it('NFT can not be minted if sender does not have enough ERC20 balance', async function () {
      await token.connect(owner).setTokenPrice(lis.address, ONE_GWEI);
      await lis.connect(addr1).approve(token.address, ONE_GWEI);
      await expectRevert(
        token.connect(addr1).mintByToken(addr1.address, nftHash, lis.address),
        'Insufficient balance.'
      );
    })

    it('NFT can be minted if conditions are true', async function () {
      await token.connect(owner).setTokenPrice(lis.address, ONE_GWEI);
      await lis.connect(addr1).approve(token.address, ONE_GWEI);
      await lis.connect(owner).grantRole(MINTER_ROLE, owner.address);
      await lis.connect(owner).mint(ONE_GWEI);
      await lis.connect(owner).transfer(addr1.address, ONE_GWEI);
      const balanceBefore = await lis.balanceOf(feeReceiver);

      const filter = token.filters.Mint(null, null, null);
            const eventPromise = new Promise((resolve) => {
            token.on(filter, (owner, tokenId, hash) => {
                resolve({ owner, tokenId, hash });
              });
            });

      
      await token.connect(addr1).mintByToken(addr1.address, nftHash, lis.address);
      const event = await eventPromise;
      expect(event.tokenId).to.equal(1);
      expect(event.owner).to.equal(addr1.address);
      expect(await token.ownerOf(1)).to.equal(addr1.address);
      expect(await lis.balanceOf(feeReceiver)).to.equal(balanceBefore.add(ONE_GWEI));
    })
  })

  describe('Other', function () {
    it('Handle of string hash', async function () {
      await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
      token.on('Mint', (owner, tokenId, hash) => {
        expect(hash).to.equal(nftHash);
      });
      await token.connect(owner).mint(owner.address, nftHash);
    }) 
  })

    describe('Check signed transfer', async function () {
      it('Signer can sign [transferWithSignature] transaction', async function () {
        await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
        await token.connect(owner).mint(addr1.address, nftHash);

        const tokenId = 1;
        const transferMessage = {
          from: addr1.address,
          to: addr2.address,
          tokenId,
        };

        const hash = await token.getMessageHash(transferMessage.from, transferMessage.to, transferMessage.tokenId);
        const sig = await signer.signMessage(ethers.utils.arrayify(hash));

        const filter = token.filters.Transfer(null, null, null);
        const eventPromise = new Promise((resolve) => {
          token.on(filter, (from, to, tokenId) => {
              resolve({ from, to, tokenId });
            });
          });

        await token.connect(addr1).transferWithSignature(
          transferMessage.from,
          transferMessage.to,
          transferMessage.tokenId,
          sig
        );

        const event = await eventPromise;
        expect(event.from).to.equal(transferMessage.from);
        expect(event.to).to.equal(transferMessage.to);
        expect(event.tokenId).to.equal(transferMessage.tokenId);
        expect(await token.ownerOf(transferMessage.tokenId)).to.equal(transferMessage.to);
      })

      it('Not Signer can not sign [transferWithSignature] transaction', async function () {
        await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
        await token.connect(owner).mint(addr1.address, nftHash);

        const tokenId = 1;
        const transferMessage = {
          from: addr1.address,
          to: addr2.address,
          tokenId,
        };

        const hash = await token.getMessageHash(transferMessage.from, transferMessage.to, transferMessage.tokenId);
        const sig = await addr2.signMessage(ethers.utils.arrayify(hash));

        await expectRevert(
          token.connect(addr1).transferWithSignature(
            transferMessage.from,
            transferMessage.to,
            transferMessage.tokenId,
            sig
          ),
          'Invalid signature'
        );
      })

      it('Only sender can call transferWithSignature', async function () {
        await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
        await token.connect(owner).mint(addr1.address, nftHash);
  
        const tokenId = 1;
        const transferMessage = {
          from: addr1.address,
          to: addr2.address,
          tokenId,
        };
  
        const hash = await token.getMessageHash(transferMessage.from, transferMessage.to, transferMessage.tokenId);
        const sig = await addr2.signMessage(ethers.utils.arrayify(hash));
  
        await expectRevert(
          token.connect(addr2).transferWithSignature(
            transferMessage.from,
            transferMessage.to,
            transferMessage.tokenId,
            sig
          ),
          'Invalid sender'
        );
      })
    })

    describe('Check ERC721Enumerable', function () {
      it('Returned tokens ids are right when burned element from middle.', async function () {
      await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
      await token.connect(owner).grantRole(BURNER_ROLE, owner.address);
      const tokenIds = [1, 2, 3, 4, 5];
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(1);
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(2);
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(3);
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(4);
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(5);

      const balanceOf = +(await token.balanceOf(owner.address));

      for (let i = 0; i < balanceOf; i++) {
        expect(await token.tokenOfOwnerByIndex(owner.address, i)).to.equal(tokenIds[i]);
      }

      expect(await token.totalSupply()).to.equal(tokenIds.length);

      const filter = token.filters.Burn(null);
      const eventPromise = new Promise((resolve) => {
        token.on(filter, (tokenId) => {
            resolve({ tokenId });
          });
        });
      const burnedTokenId = tokenIds[2];
      await token.connect(owner).burn(burnedTokenId);
      const removedIndex = tokenIds.indexOf(burnedTokenId);
      const tokenIdsBurned = tokenIds.filter((el) => el !== burnedTokenId);
      tokenIdsBurned.splice(removedIndex, 0, tokenIds[tokenIds.length - 1]);
      tokenIdsBurned.pop();
      const event = await eventPromise;
      expect(event.tokenId).to.equal(burnedTokenId);
      const balanceOfAfter = +(await token.balanceOf(owner.address));
      for (let i = 0; i < balanceOfAfter; i++) {
        expect(await token.tokenOfOwnerByIndex(owner.address, i)).to.equal(tokenIdsBurned[i]);
      }
      })

      it('Returned tokens ids are right when burned element from begining.', async function () {
      await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
      await token.connect(owner).grantRole(BURNER_ROLE, owner.address);
      const tokenIds = [1, 2, 3, 4, 5];
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(1);
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(2);
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(3);
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(4);
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(5);

      const balanceOf = +(await token.balanceOf(owner.address));

      for (let i = 0; i < balanceOf; i++) {
        expect(await token.tokenOfOwnerByIndex(owner.address, i)).to.equal(tokenIds[i]);
      }

      expect(await token.totalSupply()).to.equal(tokenIds.length);

      const filter = token.filters.Burn(null);
      const eventPromise = new Promise((resolve) => {
        token.on(filter, (tokenId) => {
            resolve({ tokenId });
          });
        });
      const burnedTokenId = tokenIds[0];
      await token.connect(owner).burn(burnedTokenId);
      const tokenIdsBurned = [...tokenIds];
      tokenIdsBurned.shift();
      tokenIdsBurned.splice(0, 0, tokenIds[tokenIds.length - 1]);
      tokenIdsBurned.pop();
      const event = await eventPromise;
      expect(event.tokenId).to.equal(burnedTokenId);
      const balanceOfAfter = +(await token.balanceOf(owner.address));
      for (let i = 0; i < balanceOfAfter; i++) {
        expect(await token.tokenOfOwnerByIndex(owner.address, i)).to.equal(tokenIdsBurned[i]);
      }
      })

      it('Returned tokens ids are right when burned element from end.', async function () {
      await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
      await token.connect(owner).grantRole(BURNER_ROLE, owner.address);
      const tokenIds = [1, 2, 3, 4, 5];
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(1);
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(2);
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(3);
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(4);
      await token.connect(owner).mint(owner.address, nftHash);
      expect(await token.totalSupply()).to.equal(5);

      const balanceOf = +(await token.balanceOf(owner.address));

      for (let i = 0; i < balanceOf; i++) {
        expect(await token.tokenOfOwnerByIndex(owner.address, i)).to.equal(tokenIds[i]);
      }

      expect(await token.totalSupply()).to.equal(tokenIds.length);

      const filter = token.filters.Burn(null);
      const eventPromise = new Promise((resolve) => {
        token.on(filter, (tokenId) => {
            resolve({ tokenId });
          });
        });
      const burnedTokenId = tokenIds[tokenIds.length - 1];
      await token.connect(owner).burn(burnedTokenId);
      const tokenIdsBurned = [...tokenIds];
      tokenIdsBurned.pop();
      const event = await eventPromise;
      expect(event.tokenId).to.equal(burnedTokenId);
      const balanceOfAfter = +(await token.balanceOf(owner.address));
      for (let i = 0; i < balanceOfAfter; i++) {
        expect(await token.tokenOfOwnerByIndex(owner.address, i)).to.equal(tokenIdsBurned[i]);
      }
      })
    })

  })