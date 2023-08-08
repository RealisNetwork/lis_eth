const { expect } = require('chai');
const { ethers } = require('hardhat');
const { expectRevert } = require('@openzeppelin/test-helpers')
const { onlyOwnerErrorStr } = require('./utils/errors-strings');

const ONE_GWEI = 1_000_000_000;
const nftHash = 'x6d795f76616c7565';
const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
const FEE = 4;
const ZERO_ADDRESS = ethers.constants.AddressZero;

async function deployMarketplace(adminBuyerAddr, feeReceiverAddr) {
    const MarketplaceArt = await ethers.getContractFactory('LisMarketplace');
    const marketplace = await MarketplaceArt.deploy(
        adminBuyerAddr,
        feeReceiverAddr,
    );
    await marketplace.deployed();
    return marketplace;
}

async function initializeMarketplace(owner, marketplaceContract, args) {
    await marketplaceContract.connect(owner).setFeeReceiver(args.feeReceiver);
    await marketplaceContract.connect(owner).setFee(args.token, args.fee);
}

async function deployLisErc20() {
    const ERC20Token = await ethers.getContractFactory('Lis');
    const erc20 = await ERC20Token.deploy();
    await erc20.deployed();
    return erc20;
}

async function mintLis(lis, owner) {
    await lis.connect(owner).grantRole(MINTER_ROLE, owner.address);
    await lis.connect(owner).mint(ethers.utils.parseEther('100000'));
}

async function deployLisErc721() {
    const nftArgs = {
        timestamp: 1685281800000,
        maxSupply: 1000,
        tokenName: 'LisNft',
        symbol: 'LNFT',
        signer: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
        proxyRegistry: '0x58807baD0B376efc12F5AD86aAc70E78ed67deaE',
        feeReceiver: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
        baseUri: 'https://evm.realiscompany-base.com/',
        contractUri: 'https://evm.realiscompany-base.com/',
      };
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

describe('Marketplace', function() {
    let marketplace;
    let owner;
    let addr1, addr2, addr3;
    let feeReceiver;
    let erc20Lis;
    let erc721;

    async function globalBeforeEach() {
        [owner, addr1, addr2, addr3, feeReceiver, adminBuyer] = await ethers.getSigners();
            marketplace = await deployMarketplace(adminBuyer.address, feeReceiver.address);
            erc20Lis = await deployLisErc20();
            erc721 = await deployLisErc721();
            await erc721.connect(owner).grantRole(MINTER_ROLE, owner.address);
    }

    beforeEach(async function() {
        await globalBeforeEach();
    })

    describe('Ownership', function() {
        it('Owner must be wallet that deployed contract', async function() {
            expect(await marketplace.owner()).to.equal(owner.address);
        });

        it('Owner must have have possibility to transfer ownership.', async function() {
            await marketplace.connect(owner).transferOwnership(addr1.address);
            expect(await marketplace.owner()).to.equal(addr1.address);
        })

        it('Only owner can set fee receiver.', async function() {
            await expectRevert(
                marketplace.connect(addr1).setFeeReceiver(addr1.address),
                onlyOwnerErrorStr
            );

            await marketplace.connect(owner).setFeeReceiver(addr1.address);
            expect(await marketplace.feeReceiver()).to.equal(addr1.address);
        })

        it('Only owner can set fee.', async function() {
            const token = erc721.address;
            const fee = FEE;

            await expectRevert(
                marketplace.connect(addr1).setFee(token, fee),
                onlyOwnerErrorStr
            );
            
            const filter = marketplace.filters.FeeSet(null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (token, fee) => {
                resolve({ token, fee });
              });
            });

            await marketplace.connect(owner).setFee(token, fee);
            const event = await eventPromise;
            expect(event.token).to.equal(token);
            expect(event.fee).to.equal(fee);
            expect(await marketplace.fees(token)).to.equal(fee);
        })

        it('Only owner can set admin.', async function() {
            await expectRevert(
                marketplace.connect(addr1).setAdmin(addr1.address),
                onlyOwnerErrorStr
            );

            await marketplace.connect(owner).setAdmin(addr1.address);
            expect(await marketplace.admin()).to.equal(addr1.address);
        })

        it('Only owner can set minimum limit.', async function() {
            await expectRevert(
                marketplace.connect(addr1).setMinLimit(ZERO_ADDRESS, ONE_GWEI),
                onlyOwnerErrorStr
            );

            await marketplace.connect(owner).setMinLimit(ZERO_ADDRESS, ONE_GWEI);
            expect(await marketplace.minLimits(ZERO_ADDRESS)).to.equal(ONE_GWEI);
        })
    })
    describe('ERC20: List, Purchase', function() {
        beforeEach(async function() {
            await globalBeforeEach();
            const initializeArgs = {
                feeReceiver: feeReceiver.address,
                fee: FEE,
                token: erc721.address
            };
            await initializeMarketplace(owner, marketplace, initializeArgs);
        })

        it(`Can't purchase if nft token has not been listed.`, async function() {
            await erc721.connect(owner).mint(addr1.address, nftHash);
            await mintLis(erc20Lis, owner);
            await expectRevert(
                marketplace.connect(addr1).purchaseByERC20([erc721.address, 1]),
                'This token is not supported for purchase.'
            );
        })

        it('Throw error if trying to list by ETH and buy by ERC20.', async function() {
            await erc721.connect(owner).mint(owner.address, nftHash);
            await mintLis(erc20Lis, owner);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await erc20Lis.connect(owner).transfer(addr1.address, ONE_GWEI);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, ONE_GWEI);
            await erc20Lis.connect(addr1).approve(marketplace.address, ONE_GWEI);
            await expectRevert(
                marketplace.connect(addr1).purchaseByERC20([erc721.address, 1]),
                'Currency must be ERC20 token.'
            );
        })

        it(`Can't place NFT on marketplace if not give approve to contract`, async function() {
            await erc721.connect(owner).mint(owner.address, nftHash);
            await mintLis(erc20Lis, owner);
            await expectRevert(
                marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, ONE_GWEI),
                'Contract must be approved for nft transfer.'
            );
        })

        it(`Can't purchase if erc 20 didn't approve enough. Nft listed.`, async function() {
            await erc721.connect(owner).mint(owner.address, nftHash);
            await mintLis(erc20Lis, owner);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, ONE_GWEI);
            await expectRevert(
                marketplace.connect(addr1).purchaseByERC20([erc721.address, 1]),
                'Insufficient allowance.'
            );
        })

        it(`Can't purchase if wallet doesn't have enough balance.`, async function() {
            await erc721.connect(owner).mint(owner.address, nftHash);
            await mintLis(erc20Lis, owner);
            await erc721.connect(owner).approve(marketplace.address, 1);
            const buyerBalance = Math.floor(ONE_GWEI / 2);
            await erc20Lis.connect(owner).transfer(addr1.address, buyerBalance);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, ONE_GWEI);
            await erc20Lis.connect(addr1).approve(marketplace.address, ONE_GWEI);

            await expectRevert(
                marketplace.connect(addr1).purchaseByERC20([erc721.address, 1]),
                'Insufficient balance.'
            );
        })

        it('List works right.', async function() {
            const nftPrice = ONE_GWEI;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).setApprovalForAll(marketplace.address, true);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await erc721.connect(owner).approve(marketplace.address, 2);

            const filter = marketplace.filters.List(null, null, null, null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (seller, nftContract, tokenId, currency, price) => {
                resolve({ seller, nftContract, tokenId, currency, price });
              });
            });

            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, nftPrice);
            const event = await eventPromise;
            expect(event.seller).to.equal(owner.address);
            expect(event.nftContract).to.equal(erc721.address);
            expect(event.tokenId).to.equal(1);
            expect(event.currency).to.equal(erc20Lis.address);
            expect(event.price).to.equal(nftPrice);
            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);

            const secondNftPrice = nftPrice * 2;
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 2, secondNftPrice);
            expect((await marketplace.products(erc721.address, 2)).price).to.equal(secondNftPrice);
        })

        it('Purchase works right.', async function() {
            const nftPrice = ONE_GWEI;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).mint(owner.address, nftHash);
            await mintLis(erc20Lis, owner);
            await erc721.connect(owner).setApprovalForAll(marketplace.address, true);
            await erc20Lis.connect(owner).transfer(addr1.address, nftPrice * 2);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, nftPrice);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 2, nftPrice);
            await erc20Lis.connect(addr1).approve(marketplace.address, nftPrice * 2);

            const filter = marketplace.filters.Purchase(null, null, null, null, null, null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (seller, buyer, nftContract, tokenId, currency, fee, price) => {
                resolve({ seller, buyer, nftContract, tokenId, currency, fee, price });
              });
            });

            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
            await marketplace.connect(addr1).purchaseByERC20([erc721.address, 1]);

            const event = await eventPromise;
            expect(event.seller).to.equal(owner.address);
            expect(event.buyer).to.equal(addr1.address);
            expect(event.fee).to.equal(ethers.BigNumber.from(nftPrice).mul(FEE).div(100));
            expect(event.price).to.equal(nftPrice);
            expect(event.nftContract).to.equal(erc721.address);
            expect(event.tokenId).to.equal(1);
            expect(event.currency).to.equal(erc20Lis.address);
            expect((await marketplace.products(erc721.address, 1)).price).to.equal(0);

            expect((await marketplace.products(erc721.address, 2)).price).to.equal(nftPrice);
            await marketplace.connect(addr1).purchaseByERC20([erc721.address, 2]);
            expect((await marketplace.products(erc721.address, 2)).price).to.equal(0);
            
            await erc20Lis.connect(owner).transfer(addr2.address, nftPrice * 2);
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 3);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 3, nftPrice);
            await erc20Lis.connect(addr2).approve(marketplace.address, nftPrice);
            expect((await marketplace.products(erc721.address, 3)).price).to.equal(nftPrice);
            await marketplace.connect(addr2).purchaseByERC20([erc721.address, 3]);
            expect((await marketplace.products(erc721.address, 3)).price).to.equal(0);
            await expectRevert(
                marketplace.connect(addr2).purchaseByERC20([erc721.address, 3]),
                'This token is not supported for purchase.',
            );
        })

        it(`Throw error if seller transfered his nft.`, async function() {
            const nftPrice = ONE_GWEI;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await mintLis(erc20Lis, owner);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await erc20Lis.connect(owner).transfer(addr1.address, nftPrice);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, nftPrice);
            await erc20Lis.connect(addr1).approve(marketplace.address, nftPrice);
            await erc721.connect(owner).approve(addr2.address, 1);
            await erc721.connect(addr2).transferFrom(owner.address, addr2.address, 1);
            await expectRevert(
                marketplace.connect(addr1).purchaseByERC20([erc721.address, 1]),
                'Insufficient nft allowance.'
            );
            await erc721.connect(addr2).transferFrom(addr2.address, owner.address, 1);

            const filter = marketplace.filters.Purchase(null, null, null, null, null, null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (seller, buyer, nftContract, tokenId, currency, fee, price) => {
                resolve({ seller, buyer, nftContract, tokenId, currency, fee, price });
              });
            });

            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await marketplace.connect(addr1).purchaseByERC20([erc721.address, 1]);
            const event = await eventPromise;
            expect(event.seller).to.equal(owner.address);
            expect(event.buyer).to.equal(addr1.address);
            expect(event.fee).to.equal(ethers.BigNumber.from(nftPrice).mul(FEE).div(100));
            expect(event.price).to.equal(nftPrice);
            expect(event.nftContract).to.equal(erc721.address);
            expect(event.tokenId).to.equal(1);
            expect(event.currency).to.equal(erc20Lis.address);
            expect((await marketplace.products(erc721.address, 1)).price).to.equal(0);
        })

        it(`Can't purchase with signature with wallet != adminBuyer`, async function() {
            const nftPrice = ONE_GWEI;
            const purchaseERC20Args = [erc721.address, 1];
            const buyer = addr1;
            const adminBuyer = addr2;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await mintLis(erc20Lis, owner);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await erc20Lis.connect(owner).transfer(adminBuyer.address, nftPrice);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, nftPrice);
            await erc20Lis.connect(adminBuyer).approve(marketplace.address, nftPrice);

            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
            const hash = await marketplace.getMessageHashERC20(purchaseERC20Args);
            const sig = await buyer.signMessage(ethers.utils.arrayify(hash));
            
            await expectRevert(
                marketplace.connect(addr3).purchaseByERC20WithSignatureDex(purchaseERC20Args, sig, buyer.address),
                'Invalid sender.'
            );
        })

        it(`Can't purchase with signature using wrong sig.`, async function() {
            const nftPrice = ONE_GWEI;
            const purchaseERC20Args = [erc721.address, 1];
            const buyer = addr1;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await mintLis(erc20Lis, owner);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await erc20Lis.connect(owner).transfer(adminBuyer.address, nftPrice);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, nftPrice);
            await erc20Lis.connect(adminBuyer).approve(marketplace.address, nftPrice);

            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
            const hash = await marketplace.getMessageHashERC20(purchaseERC20Args);
            const sig = await adminBuyer.signMessage(ethers.utils.arrayify(hash));

            await expectRevert(
                marketplace.connect(adminBuyer).purchaseByERC20WithSignatureDex(purchaseERC20Args, sig, buyer.address),
                'Invalid signature.'
            );
        })

        it('Purchase with signature works.', async function() {
            const nftPrice = ONE_GWEI;
            const purchaseERC20Args = [erc721.address, 1];
            const buyer = addr1;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await mintLis(erc20Lis, owner);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await erc20Lis.connect(owner).transfer(adminBuyer.address, nftPrice);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, nftPrice);
            await erc20Lis.connect(adminBuyer).approve(marketplace.address, nftPrice);

            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
            const hash = await marketplace.getMessageHashERC20(purchaseERC20Args);
            const sig = await buyer.signMessage(ethers.utils.arrayify(hash));

            const filter = marketplace.filters.Purchase(null, null, null, null, null, null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (seller, buyer, nftContract, tokenId, currency, fee, price) => {
                resolve({ seller, buyer, nftContract, tokenId, currency, fee, price });
              });
            });

            await marketplace.connect(adminBuyer).purchaseByERC20WithSignatureDex(purchaseERC20Args, sig, buyer.address);
            const event = await eventPromise;
            expect(event.seller).to.equal(owner.address);
            expect(event.buyer).to.equal(buyer.address);
            expect(event.fee).to.equal(ethers.BigNumber.from(nftPrice).mul(FEE).div(100));
            expect(event.price).to.equal(nftPrice);
            expect(event.nftContract).to.equal(erc721.address);
            expect(event.tokenId).to.equal(1);
            expect(event.currency).to.equal(erc20Lis.address);
            expect((await marketplace.products(erc721.address, 1)).price).to.equal(0);
        })

        it(`Can't purchase if fee == 0.`, async function() {
            const nftPrice = ONE_GWEI;
            await marketplace.connect(owner).setFee(erc721.address, 1);
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).mint(owner.address, nftHash);
            await mintLis(erc20Lis, owner);
            await erc721.connect(owner).setApprovalForAll(marketplace.address, true);
            await erc20Lis.connect(owner).transfer(addr1.address, nftPrice * 2);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, nftPrice);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 2, nftPrice);
            await erc20Lis.connect(addr1).approve(marketplace.address, nftPrice * 2);
            await marketplace.connect(owner).setFee(erc721.address, 0);
            await expectRevert(
                marketplace.connect(addr1).purchaseByERC20([erc721.address, 1]),
                'This NFT contract has not been listed.',
            );
        })

        it(`Throw error if placeOnMarketplace called but fee for contract set 0.`, async function() {
            const nftPrice = ONE_GWEI;
            await marketplace.connect(owner).setFee(erc721.address, 0);
            await erc721.connect(owner).mint(owner.address, nftHash);
            await mintLis(erc20Lis, owner);
            await erc721.connect(owner).setApprovalForAll(marketplace.address, true);
            await erc20Lis.connect(owner).transfer(addr1.address, nftPrice * 2);
            await expectRevert(
                marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, nftPrice),
                `Marketplace doesn't serve this nft contract.`
            );
        })

        it('purchaseCex() must transfer NFT, but not currency (both ETH and ERC20).', async function() {
            const nftPrice = ONE_GWEI;
            const purchaseArgs = [erc721.address, 1];
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, nftPrice);

            const filter = marketplace.filters.Purchase(null, null, null, null, null, null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (seller, buyer, nftContract, tokenId, currency, fee, price) => {
                resolve({ seller, buyer, nftContract, tokenId, currency, fee, price });
              });
            });

            expect((await marketplace.products(purchaseArgs[0], purchaseArgs[1])).price).to.equal(nftPrice);
            const hash = await marketplace.getMessageHashERC20(purchaseArgs);
            const sig = await adminBuyer.signMessage(ethers.utils.arrayify(hash));

            await marketplace.connect(adminBuyer).purchaseCex(purchaseArgs, sig, adminBuyer.address);
            const event = await eventPromise;
            expect(event.seller).to.equal(owner.address);
            expect(event.buyer).to.equal(adminBuyer.address);
            expect(event.fee).to.equal(ethers.BigNumber.from(nftPrice).mul(FEE).div(100));
            expect(event.price).to.equal(nftPrice);
            expect(event.nftContract).to.equal(erc721.address);
            expect(event.tokenId).to.equal(1);
            expect(event.currency).to.equal(erc20Lis.address);
            expect((await marketplace.products(erc721.address, 1)).price).to.equal(0);
        })

        it('Only adminBuyer can call purchaseCex()', async function() {
            const nftPrice = ONE_GWEI;
            const purchaseArgs = [erc721.address, 1];
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, nftPrice);

            const hash = await marketplace.getMessageHashERC20(purchaseArgs);
            const sig = await adminBuyer.signMessage(ethers.utils.arrayify(hash));

            await expectRevert(
                marketplace.connect(addr1).purchaseCex(purchaseArgs, sig, adminBuyer.address),
                'Invalid sender.'
            );
        })

        it('Throw error if purchaseCex() called with wrong signature.', async function() {
            const nftPrice = ONE_GWEI;
            const purchaseArgs = [erc721.address, 1];
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, nftPrice);

            const hash = await marketplace.getMessageHashERC20(purchaseArgs);
            const sig = await addr1.signMessage(ethers.utils.arrayify(hash));

            await expectRevert(
                marketplace.connect(adminBuyer).purchaseCex(purchaseArgs, sig, adminBuyer.address),
                'Invalid signature.'
            );
        })
    })

    describe('ETH: List, Purchase', function() {
        beforeEach(async function() {
            await globalBeforeEach();
            const initializeArgs = {
                feeReceiver: feeReceiver.address,
                fee: FEE,
                token: erc721.address
            };
            await initializeMarketplace(owner, marketplace, initializeArgs);
        })

        it(`Can't purchase if nft token has not been listed.`, async function() {
            await erc721.connect(owner).mint(addr1.address, nftHash);
            await expectRevert(
                marketplace.connect(addr1).purchaseByEth([erc721.address, 1]),
                'This token is not supported for purchase.'
            );
        })

        it('Throw error if trying to list by ERC20 and buy by ETH.', async function() {
            await erc721.connect(owner).mint(owner.address, nftHash);
            await mintLis(erc20Lis, owner);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, ONE_GWEI);
            await erc20Lis.connect(addr1).approve(marketplace.address, ONE_GWEI);
            await expectRevert(
                marketplace.connect(addr1).purchaseByEth([erc721.address, 1]),
                'Currency must be zero address.'
            );
        })

        it('List works right.', async function() {
            const nftPrice = ONE_GWEI;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await erc721.connect(owner).approve(marketplace.address, 2);

            const filter = marketplace.filters.List(null, null, null, null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (seller, nftContract, tokenId, currency, price) => {
                resolve({ seller, nftContract, tokenId, currency, price });
              });
            });

            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, nftPrice);
            const event = await eventPromise;
            expect(event.seller).to.equal(owner.address);
            expect(event.nftContract).to.equal(erc721.address);
            expect(event.tokenId).to.equal(1);
            expect(event.currency).to.equal(ZERO_ADDRESS);
            expect(event.price).to.equal(nftPrice);
            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
        })

        it(`Can't purchase if sent wrong amount of ETH.`, async function() {
            const nftPrice = ONE_GWEI;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, nftPrice);

            await expectRevert(
                marketplace.connect(addr1).purchaseByEth([erc721.address, 1], { value: nftPrice + 1}),
                'Wrong amount sent.'
            );
            await expectRevert(
                marketplace.connect(addr1).purchaseByEth([erc721.address, 1], { value: nftPrice - 1}),
                'Wrong amount sent.'
            );
        })

        it('Purchase works right.', async function() {
            const nftPrice = ONE_GWEI;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await erc721.connect(owner).approve(marketplace.address, 2);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, nftPrice);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 2, nftPrice);

            const filter = marketplace.filters.Purchase(null, null, null, null, null, null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (seller, buyer, nftContract, tokenId, currency, fee, price) => {
                resolve({ seller, buyer, nftContract, tokenId, currency, fee, price });
              });
            });

            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
            await marketplace.connect(addr1).purchaseByEth([erc721.address, 1], { value: nftPrice });

            const event = await eventPromise;
            expect(event.seller).to.equal(owner.address);
            expect(event.buyer).to.equal(addr1.address);
            expect(event.fee).to.equal(ethers.BigNumber.from(nftPrice).mul(FEE).div(100));
            expect(event.price).to.equal(nftPrice);
            expect(event.nftContract).to.equal(erc721.address);
            expect(event.tokenId).to.equal(1);
            expect(event.currency).to.equal
            expect((await marketplace.products(erc721.address, 1)).price).to.equal(0);

            expect((await marketplace.products(erc721.address, 2)).price).to.equal(nftPrice);
            await marketplace.connect(addr1).purchaseByEth([erc721.address, 2], { value: nftPrice });
            expect((await marketplace.products(erc721.address, 2)).price).to.equal(0);
            await expectRevert(
                marketplace.connect(addr1).purchaseByEth([erc721.address, 2], { value: nftPrice }),
                'This token is not supported for purchase.'
            );
        })

        it(`Can't purchase with signature with wallet != adminBuyer.`, async function() {
            const nftPrice = ONE_GWEI;
            const purchaseERC20Args = [erc721.address, 1];
            const buyer = addr1;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, nftPrice);

            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
            const hash = await marketplace.getMessageHashERC20(purchaseERC20Args);
            const sig = await buyer.signMessage(ethers.utils.arrayify(hash));
            
            await expectRevert(
                marketplace.connect(addr3).purchaseByEthWithSignatureDex(purchaseERC20Args, sig, buyer.address),
                'Invalid sender.'
            );
        })

        it(`Can't purchase with signature using wrong sig.`, async function() {
            const nftPrice = ONE_GWEI;
            const purchaseEthArgs = [erc721.address, 1];
            const buyer = addr1;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, nftPrice);

            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
            const hash = await marketplace.getMessageHashERC20(purchaseEthArgs);
            const sig = await adminBuyer.signMessage(ethers.utils.arrayify(hash));

            await expectRevert(
                marketplace.connect(adminBuyer).purchaseByEthWithSignatureDex(purchaseEthArgs, sig, buyer.address),
                'Invalid signature.'
            );
        })

        it('Purchase with signature works.', async function() {
            const nftPrice = ONE_GWEI;
            const receiver = addr1;
            const purchaseArgs = [erc721.address, 1];
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, nftPrice);

            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
            const hash = await marketplace.getMessageHashETH(purchaseArgs);
            const sig = await receiver.signMessage(ethers.utils.arrayify(hash));

            const filter = marketplace.filters.Purchase(null, null, null, null, null, null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (seller, buyer, nftContract, tokenId, currency, fee, price) => {
                resolve({ seller, buyer, nftContract, tokenId, currency, fee, price });
              });
            });

            await marketplace.connect(adminBuyer).purchaseByEthWithSignatureDex(purchaseArgs, sig, receiver.address, { value: nftPrice });
            const event = await eventPromise;
            expect(event.seller).to.equal(owner.address);
            expect(event.buyer).to.equal(receiver.address);
            expect(event.fee).to.equal(ethers.BigNumber.from(nftPrice).mul(FEE).div(100));
            expect(event.price).to.equal(nftPrice);
            expect(event.nftContract).to.equal(erc721.address);
        })

        it(`Throw error if seller transfered his nft.`, async function() {
            const nftPrice = ONE_GWEI;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, nftPrice);
            await erc721.connect(owner).approve(addr2.address, 1);
            await erc721.connect(addr2).transferFrom(owner.address, addr2.address, 1);
            await expectRevert(
                marketplace.connect(addr1).purchaseByEth([erc721.address, 1], { value: nftPrice }),
                'Insufficient nft allowance.'
            );
            await erc721.connect(addr2).transferFrom(addr2.address, owner.address, 1);

            const filter = marketplace.filters.Purchase(null, null, null, null, null, null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (seller, buyer, nftContract, tokenId, currency, fee, price) => {
                resolve({ seller, buyer, nftContract, tokenId, currency, fee, price });
              });
            });

            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await marketplace.connect(addr1).purchaseByEth([erc721.address, 1], { value: nftPrice });
            const event = await eventPromise;
            expect(event.seller).to.equal(owner.address);
            expect(event.buyer).to.equal(addr1.address);
            expect(event.fee).to.equal(ethers.BigNumber.from(nftPrice).mul(FEE).div(100));
            expect(event.price).to.equal(nftPrice);
            expect(event.nftContract).to.equal(erc721.address);
            expect(event.tokenId).to.equal(1);
            expect(event.currency).to.equal(ZERO_ADDRESS);
            expect((await marketplace.products(erc721.address, 1)).price).to.equal(0);
        })

        it(`Can't purchase if fee == 0.`, async function() {
            const nftPrice = ONE_GWEI;
            await marketplace.connect(owner).setFee(erc721.address, 1);
            await erc721.connect(owner).mint(owner.address, nftHash);

            await erc721.connect(owner).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, nftPrice);
            await marketplace.connect(owner).setFee(erc721.address, 0);
            await expectRevert(
                marketplace.connect(addr1).purchaseByEth([erc721.address, 1]),
                'This NFT contract has not been listed.',
            );
        })

        it(`Throw error if placeOnMarketplace called but fee for contract set 0.`, async function() {
            const nftPrice = ONE_GWEI;
            await marketplace.connect(owner).setFee(erc721.address, 0);
            await erc721.connect(owner).mint(owner.address, nftHash);
            erc721.connect(owner).setApprovalForAll(marketplace.address, true);
            await expectRevert(
                marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, nftPrice),
                `Marketplace doesn't serve this nft contract.`
            );
        })
    })

    describe('Admin actions.', function() {
        beforeEach(async function() {
            await globalBeforeEach();
            const initializeArgs = {
                feeReceiver: feeReceiver.address,
                fee: FEE,
                token: erc721.address
            };
            await initializeMarketplace(owner, marketplace, initializeArgs);
        })

        it('Owner of NFT can unlist it.', async function() {
            const nftPrice = ONE_GWEI;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, nftPrice);

            const filter = marketplace.filters.Unlist(null, null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (nftContract, currency, tokenId) => {
                resolve({ nftContract, currency, tokenId });
              });
            });

            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
            await marketplace.connect(owner).unlistFromMarketplace(erc721.address, 1);
            const event = await eventPromise;
            expect(event.nftContract).to.equal(erc721.address);
            expect(event.currency).to.equal(ZERO_ADDRESS);
            expect(event.tokenId).to.equal(1);
            expect((await marketplace.products(erc721.address, 1)).price).to.equal(0);
        })

        it('Admin can unlist NFT.', async function() {
            const nftPrice = ONE_GWEI;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, nftPrice);
            await marketplace.connect(owner).setAdmin(addr1.address);

            const filter = marketplace.filters.Unlist(null, null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (nftContract, currency, tokenId) => {
                resolve({ nftContract, currency, tokenId });
              });
            });

            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
            await marketplace.connect(addr1).unlistFromMarketplace(erc721.address, 1);
            const event = await eventPromise;
            expect(event.nftContract).to.equal(erc721.address);
            expect(event.currency).to.equal(ZERO_ADDRESS);
            expect(event.tokenId).to.equal(1);
            expect((await marketplace.products(erc721.address, 1)).price).to.equal(0);
        })

        it(`Someone else can't unlist NFT`, async function() {
            const nftPrice = ONE_GWEI;
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, nftPrice);
            await expectRevert(
                marketplace.connect(addr2).unlistFromMarketplace(erc721.address, 1),
                'Invalid sender.'
            );
        })
    })

    describe('Other', function() {
        beforeEach(async function() {
            await globalBeforeEach();
            const initializeArgs = {
                feeReceiver: feeReceiver.address,
                fee: FEE,
                token: erc721.address
            };
            await initializeMarketplace(owner, marketplace, initializeArgs);
        })

        it(`Can not place on marketplace with price lower than minimum limit.`, async function() {
            await marketplace.connect(owner).setMinLimit(ZERO_ADDRESS, ONE_GWEI);
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 1);
            await expectRevert(
                marketplace.connect(owner).placeOnMarketplace(erc721.address, ZERO_ADDRESS, 1, ONE_GWEI - 1),
                'Price lower than minimum limit.'
            );
        })

        it('Place on marketplace works right if price >= minimum limit.', async function() {
            const nftPrice = ONE_GWEI;
            await mintLis(erc20Lis, owner);
            await marketplace.connect(owner).setMinLimit(erc20Lis.address, nftPrice);
            await erc721.connect(owner).mint(owner.address, nftHash);
            await erc721.connect(owner).approve(marketplace.address, 1);

            const filter = marketplace.filters.List(null, null, null, null, null);
            const eventPromise = new Promise((resolve) => {
            marketplace.on(filter, (seller, nftContract, tokenId, currency, price) => {
                resolve({ seller, nftContract, tokenId, currency, price });
              });
            });

            await marketplace.connect(owner).placeOnMarketplace(erc721.address, erc20Lis.address, 1, nftPrice);
            const event = await eventPromise;
            expect(event.seller).to.equal(owner.address);
            expect(event.nftContract).to.equal(erc721.address);
            expect(event.tokenId).to.equal(1);
            expect(event.currency).to.equal(erc20Lis.address);
            expect(event.price).to.equal(nftPrice);
            expect((await marketplace.products(erc721.address, 1)).price).to.equal(nftPrice);
        })
    })

})