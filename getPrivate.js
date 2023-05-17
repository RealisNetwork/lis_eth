const ethers = require('ethers');

// Replace 'your secret keywords' with your actual secret keywords or mnemonic phrase. DON'T FORGET TO DELETE YOUR MNEMO.
const secretKeywords = 'your secret keywords';

const wallet = ethers.Wallet.fromMnemonic(secretKeywords);

// Get the private key
const privateKey = wallet.privateKey;

console.log(privateKey);