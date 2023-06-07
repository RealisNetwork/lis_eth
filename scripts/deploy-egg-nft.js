// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { ethers } = require('hardhat');
const { nftArgs } = require('./args/eggs-args');

async function deployLisNft(deploy) {
  if (!deploy) {
    return;
  }
  const EggArt = await ethers.getContractFactory('EggNft');
  console.log('Deploying EggNft...');
  const token = await EggArt.deploy(
    nftArgs.NAME,
    nftArgs.SYMBOL,
    nftArgs.BASE_URI,
    nftArgs.CONTRACT_URI,
  );
  await token.deployed();
  console.log('EggNft deployed to: ', token.address);
}

async function main() {
  // set false to not deploy lis again
  await deployLisNft(true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});