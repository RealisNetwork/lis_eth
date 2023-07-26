// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { ethers } = require('hardhat');
const [ name, symbol, allowedSeaDrop ] = require('./args/eggs-args');
const dropABI = require('../artifacts/contracts/NFT/ERC721SeaDrop//ERC721SeaDrop.sol/ERC721SeaDrop.json').abi;

const initializeParams = {
  seadrop: '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5',
  creator: '0x7798dc46E620F948f94E79c0D9BB842c1E9E4DB3',
  feeRecipient: '0x7798dc46E620F948f94E79c0D9BB842c1E9E4DB3',
// Token config
  maxSupply: 100,
// Drop config
  feeBps: 500, // 5%
  mintPrice: ethers.utils.parseUnits('0.0001', 18).toString(),
  maxTotalMintableByWallet: 5,
  startTime: () => Math.floor(Date.now() / 1000),
  endTime: () => Math.floor(Date.now() / 1000) + 1000,
};

async function deployThroughProxy() {
  const DeployArt = await ethers.getContractFactory('DeployAndConfigureSeaDrop');
  console.log('Deploying DeployAndConfigureSeaDrop...');
  const deployScript = await DeployArt.deploy();
  console.log('Running script...');
  const filter = deployScript.filters.DropCreated(null);
  const eventPromise = new Promise((resolve) => {
    deployScript.on(filter, (newDrop) => {
    resolve({ newDrop });
    });
  });
  await deployScript.run({ gasLimit: 500000 });
  const event = await eventPromise;
  console.log('New successfully drop deployed on address: ', event.newDrop);
}

async function deployStraight() {
  const ERC721Drop = await ethers.getContractFactory('ERC721SeaDrop');
  console.log('Deploying ERC721SeaDrop...');
  const drop = await ERC721Drop.deploy(
    name,
    symbol,
    allowedSeaDrop
  );
  await drop.deployed();
  console.log('ERC721SeaDrop deployed to: ', drop.address);
}

async function initializeDropContract(contract, params) {
  console.log('Initializing drop contract: ', contract.address);
  await contract.setMaxSupply(params.maxSupply);
  console.log('Max supply was setted.');
  await contract.updateCreatorPayoutAddress(params.seadrop, params.creator, { gasLimit: 500000 });
  console.log('Creator payout address was setted.');
  await contract.updateAllowedFeeRecipient(params.seadrop, params.feeRecipient, true, { gasLimit: 500000 });
  console.log('Fee Recipient allowed fee succesully updated.');
  await contract.updatePublicDrop(
    params.seadrop,
    {
      mintPrice: params.mintPrice,
      startTime: params.startTime(),
      endTime: params.endTime(),
      maxTotalMintableByWallet: params.maxTotalMintableByWallet,
      feeBps: params.feeBps,
      restrictFeeRecipients: true,
    },
    { gasLimit: 500000 }
  );
  console.log('Public drop data succefully updated.');
  console.log('Contract initialized successfully.');
}

async function initializeDropContractInOnce(contract, params) {
  console.log('Initializing drop contract: ', contract.address);
  // const multiConfigure = {
  //   maxSupply: params.maxSupply,
  //   baseURI: 'https://evm.prod-us-west.realis.network/',
  //   contractURI: 'https://evm.prod-us-west.realis.network/',
  //   seaDropImpl: '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5',
  //   publicDrop: {
  //     mintPrice: params.mintPrice,
  //     startTime: params.startTime(),
  //     endTime: params.endTime(),
  //     maxTotalMintableByWallet: 1000,
  //     feeBps: 1000,
  //     restrictFeeRecipients: true,
  //   },
  //   dropURI: 'https://opensea-drops.mypinata.cloud/ipfs/bafkreifyf5lsonyu4fe5vz5kj6rnuppomynf6reg3ht5hjch7gbcjqz4wm',
  //   allowListData: {
  //     merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
  //     publicKeyURIs: ['https://opensea.io/.well-known/allowlist-pubkeys/mainnet/ALLOWLIST_ENCRYPTION_KEY_0.txt'],
  //     allowListURI: 'https://opensea-drops.mypinata.cloud/ipfs/bafkreihfsrfuvqnu5zrfssy3k2qxtsspr753jl77xa3vgblmep6z4wqflu'
  //   },
  //   creatorPayoutAddress: '	0x7798dc46E620F948f94E79c0D9BB842c1E9E4DB3',
  //   provenanceHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  //   allowedFeeRecipients: ['0x0000a26b00c1F0DF003000390027140000fAa719'],
  //   disallowedFeeRecipients: [],
  //   allowedPayers: ['0x58E845401C70F065c2D71C90CaEe3234aD534C4d'],
  //   disallowedPayers: [],
  //   tokenGatedAllowedNftTokens: [],
  //   tokenGatedDropStages: [],
  //   disallowedTokenGatedAllowedNftTokens: [],
  //   signers: [],
  //   signedMintValidationParams: [],
  //   disallowedSigners: [],
  // }
  const multiConfigure = [
    100,
    'https://evm.prod-us-west.realis.network/',
    'https://evm.prod-us-west.realis.network/',
    '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5',
    [
      '10000000000000000',
      '1687873208',
      '1690464820',
      1000,
      1000,
      true
    ],
    'https://opensea-drops.mypinata.cloud/ipfs/bafkreifyf5lsonyu4fe5vz5kj6rnuppomynf6reg3ht5hjch7gbcjqz4wm',
    [
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      ['https://opensea.io/.well-known/allowlist-pubkeys/mainnet/ALLOWLIST_ENCRYPTION_KEY_0.txt'],
      'https://opensea-drops.mypinata.cloud/ipfs/bafkreihfsrfuvqnu5zrfssy3k2qxtsspr753jl77xa3vgblmep6z4wqflu'
    ],
    '0x7798dc46E620F948f94E79c0D9BB842c1E9E4DB3',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    ['0x0000a26b00c1F0DF003000390027140000fAa719'],
    [],
    ['0x58E845401C70F065c2D71C90CaEe3234aD534C4d'],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
]
  await contract.multiConfigure(multiConfigure, { gasLimit: 500000 });
  console.log('Contract initialized successfully.');
}

function getWalletWithProvider() {
  const dropAddress = '0x1875aD53421F343A9A8A60d7026850c6C5286e38';
  const provider = new ethers.providers.JsonRpcProvider(`https://polygon-mumbai.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
  const privateKey = process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(dropAddress, dropABI, wallet);
}

async function main() {
  console.log('Requesting...');
  const dropContract = getWalletWithProvider();
  console.log('owner = ', (await dropContract.ownerOf(3)));
  // await initializeDropContractInOnce(dropContract, initializeParams);
  // await initializeDropContract(dropContract, initializeParams);
  // await deployStraight();
  // await deployThroughProxy();

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});