// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { ethers } = require('hardhat');

async function deployLis(deploy) {
  if (!deploy) {
    return;
  }
  const lisArt = await ethers.getContractFactory('Lis');
  console.log('Deploying Lis...');
  const Lis = await lisArt.deploy();
  await Lis.deployed();
  console.log('Lis deployed to: ', Lis.address);
}

async function main() {
  // set false to not deploy lis again
  await deployLis(false);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
