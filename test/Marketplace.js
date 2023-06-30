const { expect } = require('chai');
const { ethers } = require('hardhat');
const { expectRevert } = require('@openzeppelin/test-helpers')
const { onlyOwnerErrorStr } = require('./utils/errors-strings');

const ONE_GWEI = 1_000_000_000;
const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));

async function deployMarketplace() {
    const MarketplaceArt = await ethers.getContractFactory('LisMarketplace');
    const marketplace = await MarketplaceArt.deploy();
    await marketplace.deployed();
    return marketplace;
}

async function deployLisErc20() {
    const ERC20Token = await ethers.getContractFactory('Lis');
    const erc20 = await ERC20Token.deploy();
    await erc20.deployed();
    return erc20;
}

async function mintLis(lis) {
    await lis.connect(owner).grantRole(MINTER_ROLE, owner.address);
    await lis.connect(owner).mint(ethers.utils.parseEther('100000'));
}

async function initializeMarketplace(marketplaceContract, args) {
    await marketplaceContract.connect(owner).setFeeReceiver(args.feeReceiver);
    await marketplaceContract.connect(owner).setFee(args.token, args.fee);
}

describe('Marketplace', function() {
    let marketplace;
    let owner;
    let addr1, addr2, addr3;
    let feeReceiver;
    let erc20Lis;
    let initializeArgs;

    beforeEach(async function() {
        [owner, addr1, addr2, addr3, feeReceiver] = await ethers.getSigners();
        marketplace = await deployMarketplace();
        erc20Lis = await deployLisErc20();
        initializeArgs = {
            feeReceiver: feeReceiver.address,
            token: erc20Lis.address,
            fee: 4
        };
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
            const token = initializeArgs.token;
            const fee = initializeArgs.fee;

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
    })
    describe('ERC20: List, Purchase', function() {
        it(`Can't purchase if token has not been listed.`, async function() {
            await mintLis(erc20Lis);
            // await expectRevert(
            //     marketplace.connect(addr1).purchaseByERC20()
            // )
        })
    })


})