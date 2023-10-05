require("@nomicfoundation/hardhat-toolbox");
require('@nomiclabs/hardhat-ethers');
require('dotenv').config();
require("hardhat-contract-sizer");
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');


module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        },
      },
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        },
      },
    ],
  },
  networks: {
   polygon_mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [process.env.PRIVATE_KEY],
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      gas: 2100000,
      gasPrice: 8000000000
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
  // defaultNetworks: "localhost",
  defaultNetworks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    localhost: {
      allowUnlimitedContractSize: true,
    }
  },
  // allowUnlimitedContractSize: true,
  contractSizer: {
    // runOnCompile: false,
    allowUnlimitedContractSize: true,
  },
};
