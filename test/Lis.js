const { expect } = require('chai');
const { ethers } = require('hardhat');

const { BigNumber } = ethers;

const { expectRevert } = require('@openzeppelin/test-helpers')
const { 
    makeAccessControleErrorStr, 
    revokeRoleErrorStr 
} = require('./utils/errors-strings');

const ONE_GWEI = 1_000_000_000;
const BURNER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BURNER_ROLE"));
const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;


async function deployLis() {
    const [ owner, acc1, acc2 ] = await ethers.getSigners();

    const lisArt = await ethers.getContractFactory('Lis');
    const lis = await lisArt.deploy(ONE_GWEI);
    await lis.deployed();

    return { lis, owner, acc1, acc2 };
}

describe('Lis', () => {
    let Lis;
    let owner;
    let acc1, acc2;

    describe('Deployment', () => {
        it('Should be deployed with no errors', async () => {
            ({ lis: Lis, owner, acc1, acc2 } = await deployLis());
        })

        it('Should set the right owner', async () => {
            expect(await Lis.owner()).to.equal(owner.address);
          });

        it('Default admin must be same wallet that made deploy', async () => {
            expect(await Lis.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
        })
    })

    describe('Transfer ownership', () => {
        it('Wallet with no "owner" rights can not transfer ownership', async () => {
            await expectRevert(
                Lis.connect(acc1).transferOwnership(acc2.address),
                'Ownable: caller is not the owner'
            );
        })

        it('Owner can transfer ownership', async () => {
            await Lis.connect(owner).transferOwnership(acc1.address);
            expect(await Lis.owner()).to.equal(acc1.address);
            await Lis.connect(acc1).transferOwnership(owner.address);
            expect(await Lis.owner()).to.equal(owner.address);
        })
    })

    describe('Roles', () => {
        it('Default admin should can give admin role to another wallet', async () => {
            await Lis.connect(owner).grantRole(DEFAULT_ADMIN_ROLE, acc1.address);
            expect(await Lis.hasRole(DEFAULT_ADMIN_ROLE, acc1.address)).to.equal(true);
            //To check that owner doesn't lose his admin role (made give, not transfer)
            expect(await Lis.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
        })

        it('Wallet that just got adming role can give role to another wallet', async () => {
            await Lis.connect(acc1).grantRole(DEFAULT_ADMIN_ROLE, acc2.address);
            expect(await Lis.hasRole(DEFAULT_ADMIN_ROLE, acc2.address)).to.equal(true);
        })

        it('Admin can revoke admin roles on another wallets', async () => {
            await Lis.connect(owner).revokeRole(DEFAULT_ADMIN_ROLE, acc1.address);
            await Lis.connect(owner).revokeRole(DEFAULT_ADMIN_ROLE, acc2.address);
            expect(await Lis.hasRole(DEFAULT_ADMIN_ROLE, acc1.address)).to.equal(false);
            expect(await Lis.hasRole(DEFAULT_ADMIN_ROLE, acc2.address)).to.equal(false);
        })

        it('Not admin can not grant MINTER AND BURNER roles to others', async () => {
            await expectRevert(
                Lis.connect(acc1).grantRole(MINTER_ROLE, acc2.address),
                makeAccessControleErrorStr(acc1.address, DEFAULT_ADMIN_ROLE)
            );
            await expectRevert(
                Lis.connect(acc1).grantRole(BURNER_ROLE, acc2.address),
                makeAccessControleErrorStr(acc1.address, DEFAULT_ADMIN_ROLE)
            );
        })

        it(`Root by default doesn't have MINTER and BURNER roles`, async () => {
            expect(await Lis.hasRole(MINTER_ROLE, owner.address)).to.equal(false);
            expect(await Lis.hasRole(BURNER_ROLE, owner.address)).to.equal(false);
        })

        it(`Admin can't call mint with no MINTER role`, async () => {
            await expectRevert(
                Lis.connect(owner).mint(ONE_GWEI),
                makeAccessControleErrorStr(owner.address, MINTER_ROLE)
            );
        })

        it('Wallet with MINTER role can do mint', async () => {
            await Lis.connect(owner).grantRole(MINTER_ROLE, acc1.address);
            const ownerBalanceBefore = await Lis.balanceOf(owner.address);
            const mintAmount = BigNumber.from(ONE_GWEI);
            await Lis.connect(acc1).mint(mintAmount);
            const ownerBalanceAfter = await Lis.balanceOf(owner.address);
            expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(mintAmount);
            await Lis.connect(owner).revokeRole(MINTER_ROLE, acc1.address);
        })

        it('Wallet with BURNER role can do burn', async () => {
            await Lis.connect(owner).grantRole(BURNER_ROLE, acc1.address);
            const ownerBalanceBefore = await Lis.balanceOf(owner.address);
            const burnAmount = ONE_GWEI;
            await Lis.connect(acc1).burn(burnAmount);
            const ownerBalanceAfter = await Lis.balanceOf(owner.address);
            expect(ownerBalanceBefore.sub(ownerBalanceAfter)).to.equal(burnAmount);
            await Lis.connect(owner).revokeRole(BURNER_ROLE, acc1.address);
          });
    })
})