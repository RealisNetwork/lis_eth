// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { ethers } = require('hardhat');
const [ name, symbol, baseUri, contractUri, burnTime, proxyRegistryAddress, allowedSeaDrop ] = require('./args/eggs-args');

async function deployLisNft() {
  const EggArt = await ethers.getContractFactory('EggNft');
  console.log('Deploying EggNft...');
  const token = await EggArt.deploy(
    name,
    symbol,
    baseUri,
    contractUri,
    burnTime, 
    proxyRegistryAddress,
    allowedSeaDrop
  );
  await token.deployed();
  console.log('EggNft deployed to: ', token.address);
}

async function main() {
  await deployLisNft();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});