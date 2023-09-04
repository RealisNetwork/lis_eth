const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RelayMarketplace", function() {
  let RelayMarketplace, relayMarketplace, owner, addr1, addr2;

  beforeEach(async () => {
    RelayMarketplace = await ethers.getContractFactory("RelayMarketplace");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    relayMarketplace = await RelayMarketplace.deploy(addr1.address);
    await relayMarketplace.deployed();
  });

  describe("Deployment", function() {
    it("Should set the right owner and trusted forwarder", async function() {
      expect(await relayMarketplace.owner()).to.equal(owner.address);
      expect(await relayMarketplace.trustedForwarder()).to.equal(addr1.address);
    });
  });

  describe("setTrustedForwarder", function() {
    it("Should allow owner to set a new trusted forwarder", async function() {
      await relayMarketplace.setTrustedForwarder(addr2.address);
      expect(await relayMarketplace.trustedForwarder()).to.equal(addr2.address);
    });

    it("Should reject non-owner from setting a new trusted forwarder", async function() {
      await expect(relayMarketplace.connect(addr1).setTrustedForwarder(addr2.address)).to.be.revertedWith("Only the owner can set the trusted forwarder");
    });
  });
});

