// test/RelayMarketplace.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RelayMarketplace", function () {
    let RelayMarketplace, relayMarketplace, addr1;

    beforeEach(async function () {
        [addr1] = await ethers.getSigners();

        RelayMarketplace = await ethers.getContractFactory("RelayMarketplace");
        relayMarketplace = await RelayMarketplace.deploy(addr1.address);
        await relayMarketplace.deployed();
    });

    describe("Initialization", function () {
        it("Should set the correct trustedForwarder on deploy", async function () {
            expect(await relayMarketplace.trustedForwarder()).to.equal(addr1.address);
        });
    });

    describe("Set Trusted Forwarder", function () {
        it("Should allow only owner to set new trustedForwarder", async function () {
            await expect(
                relayMarketplace.connect(addr1).setTrustedForwarder(addr1.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await relayMarketplace.setTrustedForwarder(addr1.address);
            expect(await relayMarketplace.trustedForwarder()).to.equal(addr1.address);
        });
    });
});
