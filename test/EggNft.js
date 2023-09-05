const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber, utils } = require('ethers');
const { expectRevert } = require('@openzeppelin/test-helpers')
const { allowedSeaDropParams, allowedSeaDropParamsAsObj } = require('./utils/allowedSeaDropParams');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { 
    makeAccessControleErrorStr, 
    revokeRoleErrorStr,
    transferFromErrorStr,
    nftMaxSupplyErrorStr,
    nftMintTimeErrorStr,
    nftNoOwnerErrorStr,
} = require('./utils/errors-strings');

const ONE_GWEI = 1_000_000_000;
const BURNER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BURNER_ROLE"));
const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
const newUri = 'https://www.google.com.ua/';
const feeRecipient = '0x0000a26b00c1F0DF003000390027140000fAa719';

const seaDrops = ['0x00005EA00Ac477B1030CE78506496e8C2dE24bf5'];

async function deployEggDrop(args) {
    const ERC721Token = await ethers.getContractFactory('EggNft');
    const token = await ERC721Token.deploy(
        args.name,
        args.symbol,
        args.burnTime,
        args.proxyRegistryAddress,
        args.allowedSeaDrop,
    );
    await token.deployed();
    return token;
}

async function deploySeaDrop() {
    const SeaDropArt = await ethers.getContractFactory('SeaDrop');
    const drop = await SeaDropArt.deploy();
    await drop.deployed();
    return drop;
}

function changeSeaDropAddressToLocal(seaDropParams, seaDropParamsObj, seaDropContract) {
    seaDropParams[3] = seaDropContract.address;
    seaDrops[0] = seaDropContract.address;
    seaDropParamsObj.seaDropImpl = seaDropContract.address;
}

async function configureDrop(token, owner, allowedSeaDropParams) {
    await token.connect(owner).updateAllowedSeaDrop(seaDrops);
    await token.connect(owner).multiConfigure(allowedSeaDropParams, { gasLimit: 500000 });
}

// async function configureDropSetLateBurnTime(token, owner, allowedSeaDropParams) {
//     const modifiedParams = [...allowedSeaDropParams];
//     modifiedParams[4] = [...modifiedParams[4]];
//     modifiedParams[4][1] = 1701413343;
//     modifiedParams[4][2] = 1701758943;
//     await token.connect(owner).updateAllowedSeaDrop(seaDrops);
//     await token.connect(owner).multiConfigure(modifiedParams, { gasLimit: 500000 });
//     console.log('multi modified configure called');
// }

describe('EggNft', function() {
    let token;
    let owner;
    let addr1, addr2;
    let seaDrop;

    const TOKEN_NAME = 'MeowgonEgg';
    const TOKEN_SYMBOL = 'MEGG';
    const CONTRACT_URI = 'https://evm.realiscompany.com/';
    const BASE_URI = 'https://evm.realiscompany-base.com/';
    const PROXY_REGISTRY = '0x58807baD0B376efc12F5AD86aAc70E78ed67deaE';
    const BURN_TIME = 1693396189;
    const BURN_TIME_LATE = 1701413343;
    const BURN_OUTDATED = 1675688647;
    
    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const nftArgs = {
            name: TOKEN_NAME,
            symbol: TOKEN_SYMBOL,
            baseUri: BASE_URI,
            contractUri: CONTRACT_URI,
            burnTime: BURN_TIME,
            proxyRegistryAddress: PROXY_REGISTRY,
            allowedSeaDrop: seaDrops,
        };

        token = await deployEggDrop(nftArgs);
        seaDrop = await deploySeaDrop();
        changeSeaDropAddressToLocal(allowedSeaDropParams, allowedSeaDropParamsAsObj, seaDrop);
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
  
        //   it(`Admin can't call BURN with no BURNER_ROLE`, async () => {
        //     await expectRevert(
        //       token.connect(owner).burn(1),
        //       makeAccessControleErrorStr(owner.address, BURNER_ROLE)
        //     );
        //   })
  
          it('Admin should be able to set BURNER_ROLE to another', async () => {
            await token.connect(owner).grantRole(BURNER_ROLE, addr1.address);
            expect(await token.hasRole(BURNER_ROLE, addr1.address)).to.equal(true);
          })
  
          it('Root by default should not have BURNER_ROLE', async () => {
            expect(await token.hasRole(BURNER_ROLE, owner.address)).to.equal(false);
          })
    })

    describe('Contract initialization.', function() {
        it('Update allowed Sea Drop', async function() {
            const filter = token.filters.AllowedSeaDropUpdated(null);
            const eventPromise = new Promise((resolve) => {
                token.on(filter, (allowedSeaDrop) => {
                    resolve({ allowedSeaDrop });
                });
            });

            await token.connect(owner).updateAllowedSeaDrop(seaDrops);
            const event = await eventPromise;
            expect(event.allowedSeaDrop).to.deep.equal(seaDrops);
        })

        it('Multi Configure set data works right.', async function() {
            // this.timeout(600000);

            await token.connect(owner).updateAllowedSeaDrop(seaDrops);

            const maxSupplyFilter = token.filters.MaxSupplyUpdated(null);
            const maxSupplyEventPromise = new Promise((resolve) => {
                token.on(maxSupplyFilter, (newMaxSupply) => {
                    resolve({ newMaxSupply });
                });
            });

            const contractUriFilter = token.filters.ContractURIUpdated(null);
            const contractUriEventPromise = new Promise((resolve) => {
                token.on(contractUriFilter, (newContractURI) => {
                    resolve({ newContractURI });
                });
            });

            const publicDropFilter = seaDrop.filters.PublicDropUpdated(null, null);
            const publicDropEventPromise = new Promise((resolve) => {
                seaDrop.on(publicDropFilter, (nftContract, publicDrop) => {
                    resolve({ nftContract, publicDrop });
                });
            });

            const dropUriFilter = seaDrop.filters.DropURIUpdated(null, null);
            const dropUriEventPromise = new Promise((resolve) => {
                seaDrop.on(dropUriFilter, (nftContract, newDropURI) => {
                    resolve({ nftContract, newDropURI });
                });
            });

            const allowListFilter = seaDrop.filters.AllowListUpdated(null, null, null, null, null);
            const allowListPromise = new Promise((resolve) => {
                seaDrop.on(allowListFilter, (nftContract, previousMerkleRoot, newMerkleRoot, publicKeyURI, allowListURI) => {
                    resolve({ nftContract, previousMerkleRoot, newMerkleRoot, publicKeyURI, allowListURI });
                });
            });

            const payoutAddressFilter = seaDrop.filters.CreatorPayoutAddressUpdated(null, null);
            const payoutAddressPromise = new Promise((resolve) => {
                seaDrop.on(payoutAddressFilter, (nftContract, newPayoutAddress) => {
                    resolve({ nftContract, newPayoutAddress });
                });
            });

            // const provenanceHashFilter = seaDrop.filters.ProvenanceHashUpdated(null, null);
            // const provenanceHashPromise = new Promise((resolve) => {
            //     seaDrop.on(provenanceHashFilter, (previousHash, newHash) => {
            //         resolve({ previousHash, newHash });
            //     });
            // });
            const allowedFeeRecepientFilter = seaDrop.filters.AllowedFeeRecipientUpdated(null, null, null);
            const allowedFeeRecepientPromise = new Promise((resolve) => {
                seaDrop.on(allowedFeeRecepientFilter, (nftContract, feeRecipient, allowed) => {
                    resolve({ nftContract, feeRecipient, allowed });
                });
            });

            const payerFilter = seaDrop.filters.PayerUpdated(null, null, null);
            const payerPromise = new Promise((resolve) => {
                seaDrop.on(payerFilter, (nftContract, payer, allowed) => {
                    resolve({ nftContract, payer, allowed });
                });
            });

            const tokenGatedDropFilter = seaDrop.filters.TokenGatedDropStageUpdated(null, null, null);
            const tokenGatedDropPromise = new Promise((resolve) => {
                seaDrop.on(tokenGatedDropFilter, (nftContract, allowedNftToken, dropStage) => {
                    resolve({ nftContract, allowedNftToken, dropStage });
                });
            });

            const signedMintValidationFilter = seaDrop.filters.SignedMintValidationParamsUpdated(null, null, null);
            const signedMintValidationPromise = new Promise((resolve) => {
                seaDrop.on(signedMintValidationFilter, (nftContract, signer, signedMintValidationParams) => {
                    resolve({ nftContract, signer, signedMintValidationParams });
                });
            });

            await token.connect(owner).multiConfigure(allowedSeaDropParams, { gasLimit: 500000 });
            const [
                maxSupplyEvent,
                contractUriEvent,
                publicDropEvent,
                dropUriEvent,
                // allowListEvent,
                payoutAddressEvent,
                // provenanceHashEvent,
                allowedFeeRecipientEvent,
                payerEvent,
                // tokenGatedDropEvent,
                // signedMintValidationEvent,
            ] = await Promise.all([
                maxSupplyEventPromise,
                contractUriEventPromise,
                publicDropEventPromise,
                dropUriEventPromise,
                // allowListPromise,
                payoutAddressPromise,
                // provenanceHashPromise,
                allowedFeeRecepientPromise,
                payerPromise,
                // tokenGatedDropPromise,
                // signedMintValidationPromise,
            ]);

            expect(maxSupplyEvent.newMaxSupply).to.equal(allowedSeaDropParamsAsObj.maxSupply);
            expect(contractUriEvent.newContractURI).to.equal(allowedSeaDropParamsAsObj.contractURI);
            expect(publicDropEvent.nftContract).to.equal(token.address);
            const publicDropTupple = allowedSeaDropParams[4];
            expect(publicDropEvent.publicDrop).to.deep.equal(publicDropTupple);
            expect(dropUriEvent.newDropURI).to.equal(allowedSeaDropParamsAsObj.dropURI);
            expect(payoutAddressEvent.nftContract).to.equal(token.address);
            expect(payoutAddressEvent.newPayoutAddress).to.equal(allowedSeaDropParamsAsObj.creatorPayoutAddress);
            expect(allowedFeeRecipientEvent.nftContract).to.equal(token.address);
            // First element because contracts iterates through recipients and throw event every time. 
            // Event variable handles only first event.
            expect(allowedFeeRecipientEvent.feeRecipient).to.equal(allowedSeaDropParamsAsObj.allowedFeeRecipients[0]);
            // 'true' because contract put true as hardcode value.
            expect(allowedFeeRecipientEvent.allowed).to.equal(true);
            expect(payerEvent.nftContract).to.equal(token.address);
            // The same.
            expect(payerEvent.payer).to.equal(allowedSeaDropParamsAsObj.allowedPayers[0]);
            expect(payerEvent.allowed).to.equal(true);;

        })
    })

    describe('Update data', function() {
        beforeEach(async function() {
            await configureDrop(token, owner, allowedSeaDropParams);
        });

        it('Update allow list.', async function() {
            const allowedListFilter = seaDrop.filters.AllowListUpdated(null, null, null, null, null);
            const allowedListPromise = new Promise((resolve) => {
                seaDrop.on(allowedListFilter, (nftContract, previousMerkleRoot, newMerkleRoot, publicKeyURI, allowListURI) => {
                    resolve({ nftContract, previousMerkleRoot, newMerkleRoot, publicKeyURI, allowListURI });
                });
            });

            const allowListData = allowedSeaDropParams[6];
            await token.connect(owner).updateAllowList(seaDrops[0], allowListData);
            const allowListEvent = await allowedListPromise;
            expect(allowListEvent.nftContract).to.equal(token.address);
            expect(allowListEvent.previousMerkleRoot).to.equal(allowedSeaDropParamsAsObj.allowListData.merkleRoot);
            expect(allowListEvent.newMerkleRoot).to.equal(allowedSeaDropParamsAsObj.allowListData.merkleRoot);
            expect(allowListEvent.publicKeyURI).to.deep.equal(allowedSeaDropParamsAsObj.allowListData.publicKeyURIs);
            expect(allowListEvent.allowListURI).to.equal(allowedSeaDropParamsAsObj.allowListData.allowListURI);
        })

        // it('Update token Gated Drop', async function() {
        //     const tokenGatedDropFilter = seaDrop.filters.TokenGatedDropStageUpdated(null, null, null);
        //     const tokenGatedDropPromise = new Promise((resolve) => {
        //         seaDrop.on(tokenGatedDropFilter, (nftContract, allowedNftToken, dropStage) => {
        //             resolve({ nftContract, allowedNftToken, dropStage });
        //         });
        //     });
        //     const tokenGatedDropStage = 
        // })

        it('Update drop URI', async function() {
            const dropUriFilter = seaDrop.filters.DropURIUpdated(null, null);
            const dropUriEventPromise = new Promise((resolve) => {
                seaDrop.on(dropUriFilter, (nftContract, newDropURI) => {
                    resolve({ nftContract, newDropURI });
                });
            });
            await token.connect(owner).updateDropURI(seaDrop.address, allowedSeaDropParamsAsObj.dropURI);
            const dropUriEvent = await dropUriEventPromise;
            expect(dropUriEvent.nftContract).to.equal(token.address);
            expect(dropUriEvent.newDropURI).to.equal(allowedSeaDropParamsAsObj.dropURI);
        })

        // it('Update signed mint validation param', async function() {
        //     const signedMintValidationFilter = seaDrop.filters.SignedMintValidationParamsUpdated(null, null, null);
        //     const signedMintValidationPromise = new Promise((resolve) => {
        //         seaDrop.on(signedMintValidationFilter, (nftContract, signer, signedMintValidationParams) => {
        //             resolve({ nftContract, signer, signedMintValidationParams });
        //         });
        //     });
        //     const signers = allowedSeaDropParams[16];
        //     const signedMintValidationParams = allowedSeaDropParams[17];
        //     console.log(1);
        //     console.log(seaDrop.address);
        //     console.log('signers = ', signers);
        //     console.log('signedMintValidationParams = ', signedMintValidationParams);
        //     await token.connect(owner).updateSignedMintValidationParams(seaDrop.address, signers, signedMintValidationParams);
        //     console.log(2);
        //     const signedMintValidationEvent = await signedMintValidationPromise;
        //     console.log('Signed Mint event = ', signedMintValidationEvent);
        //     expect(signedMintValidationEvent.nftContract).to.equal(token.address);
        //     expect(signedMintValidationEvent.signer).to.equal(signers[0] ? signers[0] : ZERO_ADDRESS);
        //     expect(signedMintValidationEvent.signedMintValidationParams).to.equal(signedMintValidationParams[0] ? signedMintValidationParams[0] : ZERO_ADDRESS);
        // })

        it('Update payer.', async function() {
            const payerFilter = seaDrop.filters.PayerUpdated(null, null, null);
            const payerPromise = new Promise((resolve) => {
                seaDrop.on(payerFilter, (nftContract, payer, allowed) => {
                    resolve({ nftContract, payer, allowed });
                });
            });

            const payer = addr1.address;
            const allowed = true;
            await token.connect(owner).updatePayer(seaDrop.address, payer, allowed);
            const payerEvent = await payerPromise;
            expect(payerEvent.nftContract).to.equal(token.address);
            expect(payerEvent.payer).to.equal(payer);
            expect(payerEvent.allowed).to.equal(allowed);
        })

        it('Mint.', async function() {
            const mintFilter = seaDrop.filters.SeaDropMint(null, null, null, null, null, null, null, null);
            const mintPromise = new Promise((resolve) => {
                seaDrop.on(mintFilter, (nftContract, minter, feeRecipient, payer, quantityMinted, unitMintPrice, feeBps, dropStageIndex) => {
                    resolve({ nftContract, minter, feeRecipient, payer, quantityMinted, unitMintPrice, feeBps, dropStageIndex });
                });
            });
            const minterIfNotPayer = '0x0000000000000000000000000000000000000000';
            const quantity = 1;
            const mintPrice = allowedSeaDropParamsAsObj.publicDrop.mintPrice;
            const minter = owner;
            const totalSupplyBefore = await token.totalSupply();
            await seaDrop.connect(minter).mintPublic(token.address, feeRecipient, minterIfNotPayer, quantity, {value: mintPrice});
            const totalSupplyAfter = await token.totalSupply();
            const mintEvent = await mintPromise;
            const ownerOf = await token.ownerOf(1);
            expect(mintEvent.nftContract).to.equal(token.address);
            expect(mintEvent.minter).to.equal(minter.address);
            expect(mintEvent.feeRecipient).to.equal(feeRecipient);
            expect(mintEvent.payer).to.equal(minter.address);
            expect(mintEvent.quantityMinted).to.equal(1);
            expect(mintEvent.unitMintPrice).to.equal(mintPrice);
            expect(mintEvent.feeBps).to.equal(1000); //TODO: Calculate
            expect(mintEvent.dropStageIndex).to.equal(0); //TODO: Calculate
            expect(ownerOf).to.equal(minter.address);
            expect(totalSupplyBefore).to.equal(0);
            expect(totalSupplyAfter).to.equal(quantity);
        })

        it('Burn', async function() {
            const burnFilter = token.filters.Burn(null, null);
            const burnPromise = new Promise((resolve) => {
                token.on(burnFilter, (tokenId, from) => {
                    resolve({ tokenId, from });
                });
            });
            const minterIfNotPayer = '0x0000000000000000000000000000000000000000';
            const quantity = 1;
            const mintPrice = allowedSeaDropParamsAsObj.publicDrop.mintPrice;
            const minter = owner;
            const burner = owner;
            await seaDrop.connect(minter).mintPublic(token.address, feeRecipient, minterIfNotPayer, quantity, {value: mintPrice});
            await token.connect(owner).grantRole(BURNER_ROLE, owner.address);
            const totalSupplyBefore = await token.totalSupply();
            await token.connect(burner).burn(1);
            const totalSupplyAfter = await token.totalSupply();
            const burnEvent = await burnPromise;
            expect(burnEvent.tokenId).to.equal(1);
            expect(burnEvent.from).to.equal(burner.address);
            expect(totalSupplyBefore).to.equal(1);
            expect(totalSupplyAfter).to.equal(0);
        })

        it('Burner should be able to bulk burn tokens', async () => {
            const quantity = 1;
            const mintPrice = allowedSeaDropParamsAsObj.publicDrop.mintPrice;
            const minter = owner;
            const burner = owner;
            const minterIfNotPayer = '0x0000000000000000000000000000000000000000';
            const tokenIds = [1, 2, 3, 4, 5];
            await token.connect(owner).grantRole(BURNER_ROLE, burner.address);

            await seaDrop.connect(minter).mintPublic(token.address, feeRecipient, minterIfNotPayer, quantity, {value: mintPrice});
            expect(await token.totalSupply()).to.equal(1);
            await seaDrop.connect(minter).mintPublic(token.address, feeRecipient, minterIfNotPayer, quantity, {value: mintPrice});
            expect(await token.totalSupply()).to.equal(2);
            await seaDrop.connect(minter).mintPublic(token.address, feeRecipient, minterIfNotPayer, 3, {value: BigNumber.from(mintPrice).mul(3)});
            expect(await token.totalSupply()).to.equal(5);

            for (let i = 0; i < tokenIds.length; i++) {
              expect(await token.ownerOf(tokenIds[0])).to.equal(minter.address);
              expect(await token.ownerOf(tokenIds[1])).to.equal(minter.address);
              expect(await token.ownerOf(tokenIds[2])).to.equal(minter.address);
              expect(await token.ownerOf(tokenIds[3])).to.equal(minter.address);
              expect(await token.ownerOf(tokenIds[4])).to.equal(minter.address); 
            }
            
            const txHash = await token.connect(burner).bulkBurn(tokenIds);
            expect(await token.totalSupply()).to.equal(0);
            const receipt = await txHash.wait();
            const burnEvents = receipt.events.filter((event) => event.event === 'Burn');
      
            const burnedTokenIds = burnEvents.map((e) => e.args.tokenId.toNumber());
            expect(burnEvents).to.have.lengthOf(tokenIds.length);
            expect(burnedTokenIds).to.have.members(tokenIds);
      
            for (let i = 0; i < tokenIds.length; i++) {
              await expectRevert(
                token.ownerOf(tokenIds[i]),
                'OwnerQueryForNonexistentToken'
              )
            }
          })
    })

    describe('Burn time has not been come.', function() {
        beforeEach(async function() {
            const nftArgs = {
                name: TOKEN_NAME,
                symbol: TOKEN_SYMBOL,
                baseUri: BASE_URI,
                contractUri: CONTRACT_URI,
                burnTime: BURN_TIME_LATE,
                proxyRegistryAddress: PROXY_REGISTRY,
                allowedSeaDrop: seaDrops,
            };
    
            token = await deployEggDrop(nftArgs);
            await configureDrop(token, owner, allowedSeaDropParams);
        });

        it(`Can't burn if burn time has not been come.`, async function() {
            await token.connect(owner).grantRole(BURNER_ROLE, owner.address);
            const minterIfNotPayer = '0x0000000000000000000000000000000000000000';
            const quantity = 1;
            const mintPrice = allowedSeaDropParamsAsObj.publicDrop.mintPrice;
            const minter = owner;
            const burner = owner;
            await seaDrop.connect(minter).mintPublic(token.address, feeRecipient, minterIfNotPayer, quantity, {value: mintPrice});
            await expectRevert(
                token.connect(burner).burn(1),
                'Burn time has not been come.'
            );
            expect(await token.ownerOf(1)).to.equal(minter.address);
        })

        it(`Can't bulk burn if time has not been come.`, async function() {
            await token.connect(owner).grantRole(BURNER_ROLE, owner.address);
            const minterIfNotPayer = '0x0000000000000000000000000000000000000000';
            const quantity = 3;
            const mintPrice = allowedSeaDropParamsAsObj.publicDrop.mintPrice;
            const minter = owner;
            const burner = owner;
            const tokensIds = [1, 2, 3];
            await seaDrop.connect(minter).mintPublic(token.address, feeRecipient, minterIfNotPayer, quantity, {value: BigNumber.from(mintPrice).mul(quantity)});
            await expectRevert(
                token.connect(burner).bulkBurn(tokensIds),
                'Burn time has not been come.'
            );
            for (let i = 0; i < tokensIds.length; ++i) {
                expect(await token.ownerOf(tokensIds[i])).to.equal(minter.address);
            }
        })
    })
})