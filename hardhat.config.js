require("@nomicfoundation/hardhat-toolbox");
require('@nomiclabs/hardhat-ethers');
require('dotenv').config();
require("hardhat-contract-sizer");
require("@nomiclabs/hardhat-etherscan");


module.exports = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
   polygon_mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      polygon: 'WIJ7715QT9D1Q2N69DDFRDF45IM3SSMF9U',
      polygonMumbai: 'WIJ7715QT9D1Q2N69DDFRDF45IM3SSMF9U',
    }
  },
  flattener: {
    paths: [
      'contracts/Lis.sol',
      // Add additional contracts if needed
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  contractSizer: {
    runOnCompile: true,
    disambiguatePaths: false,
  },
};
