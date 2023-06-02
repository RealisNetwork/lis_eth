// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { ethers } = require('hardhat');
const { nftArgs } = require('./args/nft-args');

async function deployLisNft(deploy) {
  if (!deploy) {
    return;
  }
  const lisArt = await ethers.getContractFactory('LisNft');
  console.log('Deploying LisNft...');
  const Lis = await lisArt.deploy(
    nftArgs.MINT_TIMESTAMP,
    nftArgs.MAX_SUPPLY,
    nftArgs.TOKEN_NAME,
    nftArgs.TOKEN_SYMBOL,
    nftArgs.SIGNER_WALLET,
    nftArgs.PROXY_REGISTRY,
    nftArgs.FEE_RECEIVER,
    nftArgs.BASE_URI,
    nftArgs.CONTRACT_URI,
  );
  await Lis.deployed();
  console.log('LisNft deployed to: ', Lis.address);
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