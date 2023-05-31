const { expect } = require('chai');
const { ethers } = require('hardhat');

const { BigNumber } = ethers;

const { expectRevert } = require('@openzeppelin/test-helpers')
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

describe('NFT', function () {
    let token;
    let owner;
    let addr1;
    let addr2;
    let signer;
    const signerPrivate = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const MAX_SUPPLY =  10;
    const RIGHT_TIME = 1685281800000;
    const TOKEN_NAME = 'LisNft';
    const TOKEN_SYMBOL = 'LNFT';
    // const nftHash = ethers.utils.hexZeroPad('0x6d795f76616c7565', 32);
    const nftHash = '0x0000000000000000000000000000000000000000000000006d795f76616c7565';
    const PROXY_REGISTRY = '0x58807baD0B376efc12F5AD86aAc70E78ed67deaE';
    const CONTRACT_URI = 'https://evm.realiscompany.com/';
    const BASE_URI = 'https://evm.realiscompany-base.com/';
  
    beforeEach(async function () {
      const ERC721Token = await ethers.getContractFactory('LisNft');
      [owner, addr1, addr2] = await ethers.getSigners();
      signer = owner;
  
      token = await ERC721Token.deploy(
        RIGHT_TIME,
        MAX_SUPPLY,
        TOKEN_NAME,
        TOKEN_SYMBOL,
        signer.address,
        PROXY_REGISTRY,
        BASE_URI,
        CONTRACT_URI,
      );
      await token.deployed();
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
            const filter = token.filters.Mint(null, null);
            const eventPromise = new Promise((resolve) => {
            token.on(filter, (owner, tokenId) => {
                resolve({ owner, tokenId });
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
  
    describe("Check with obsolete time", async function() {
      const OUT_OF_DATE_TIME = Math.round((Date.now() - 10 * 60 * 1000) / 1000);
  
      beforeEach(async function () {
          const ERC721Token = await ethers.getContractFactory('LisNft');
          [owner, addr1, addr2] = await ethers.getSigners();
      
          token = await ERC721Token.deploy(
            OUT_OF_DATE_TIME,
            MAX_SUPPLY,
            TOKEN_NAME,
            TOKEN_SYMBOL,
            signer.address,
            PROXY_REGISTRY,
            BASE_URI,
            CONTRACT_URI,
          );
          await token.deployed();
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
      const filter = token.filters.Mint(null, null);
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

  describe('Burn', async function () {
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
      await token.connect(owner).mint(owner.address, nftHash1);
      await token.connect(owner).mint(owner.address, nftHash2);
      await token.connect(owner).mint(owner.address, nftHash3);
      await token.connect(owner).mint(owner.address, nftHash4);

      for (let i = 0; i < tokenIds.length; i++) {
        expect(await token.ownerOf(tokenIds[0])).to.equal(owner.address);
        expect(await token.ownerOf(tokenIds[1])).to.equal(owner.address);
        expect(await token.ownerOf(tokenIds[2])).to.equal(owner.address);
        expect(await token.ownerOf(tokenIds[3])).to.equal(owner.address);
        expect(await token.ownerOf(tokenIds[4])).to.equal(owner.address); 
      }

      const txHash = await token.connect(owner).bulkBurn(tokenIds);
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

  describe('Check contract URIS', async function () {
    it('Contract URI == valut put in constructor', async () => {
      expect(await token.contractURI()).to.equal(CONTRACT_URI);
    })

    it('Token URI == baseUri + hash', async () => {
      await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
      await token.connect(owner).mint(owner.address, nftHash);
      const tokenId = 1;
      const res = await token.ownerOf(tokenId);
      console.log('Result = ', res);
      const uri = await token.tokenURI(tokenId);
      const hsh = await token.nftHashes(tokenId);
      console.log('NFT HASHES = ', hsh);
      console.log('Actuaal = ', uri);
      expect(uri).to.equal(`${BASE_URI}${nftHash}`);
    })
  })

    // describe('Check signed transfer', async function () {
    //   it('Signer can sign [transferWithSignature] transaction', async function () {
    //     await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
    //     await token.connect(owner).mint(addr1.address, nftHash);

    //     const tokenId = 1;
    //     const transferMessage = {
    //       from: owner.address,
    //       to: addr1.address,
    //       tokenId,
    //     };

    //     console.log(transferMessage);

    //     const signerWallet = new ethers.Wallet(signerPrivate, ethers.provider)
        
    //     const transferMessageHash = ethers.utils.keccak256(
    //       ethers.utils.defaultAbiCoder.encode(
    //         ['address', 'address', 'uint256'],
    //         [transferMessage.from, transferMessage.to, transferMessage.tokenId]
    //       )
    //     );

    //     const signature = await signerWallet.signMessage(ethers.utils.arrayify(transferMessageHash));
    //     const signatureComponents = ethers.utils.splitSignature(signature);

    //     // const signature = await signer.signMessage(ethers.utils.arrayify(transferMessageHash));
    //     // // Split the signature into its components (r, s, v)
    //     // const signatureComponents = ethers.utils.splitSignature(signature);

    //     // console.log('signer = ', signer);

    //     const transferTx = await token.transferWithSignature(
    //       transferMessage,
    //       signatureComponents.v,
    //       signatureComponents.r,
    //       signatureComponents.s
    //     );

    //     // Wait for the transaction to be mined
    //     await transferTx.wait();
    //     console.log(transferTx.hash);

    //   })
    // })

  });