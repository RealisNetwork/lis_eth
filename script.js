const ethers = require('ethers');

async function transferWithSignature(nftContractAddress, transferMessage, adminWalletPrivateKey) {
  // Create a provider using the Ethereum network of your choice
  const provider = new ethers.providers.JsonRpcProvider('<your-provider-url>');

  // Create a wallet instance for the admin wallet using the private key
  const adminWallet = new ethers.Wallet(adminWalletPrivateKey, provider);

  // Create a contract instance for the ERC721 contract
  const nftContract = new ethers.Contract(nftContractAddress, NFT_ABI, adminWallet);

  // Get the hash of the transfer message
  const transferMessageHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['address', 'address', 'uint256'],
      [transferMessage.from, transferMessage.to, transferMessage.tokenId]
    )
  );

  // Sign the transfer message hash using the admin wallet
  const signature = await adminWallet.signMessage(ethers.utils.arrayify(transferMessageHash));

  // Split the signature into its components (r, s, v)
  const signatureComponents = ethers.utils.splitSignature(signature);

  // Call the transferWithSignature function on the ERC721 contract
  const transferTx = await nftContract.transferWithSignature(
    transferMessage.from,
    transferMessage.to,
    transferMessage.tokenId,
    signatureComponents.v,
    signatureComponents.r,
    signatureComponents.s
  );

  // Wait for the transaction to be mined
  await transferTx.wait();

  // Return the transaction hash
  return transferTx.hash;
}

// Usage example
const nftContractAddress = '<your-contract-address>';
const transferMessage = {
  from: '<sender-address>',
  to: '<recipient-address>',
  tokenId: 1,
};
const adminWalletPrivateKey = '<admin-wallet-private-key>';

transferWithSignature(nftContractAddress, transferMessage, adminWalletPrivateKey)
  .then((txHash) => {
    console.log('Transfer successful. Transaction hash:', txHash);
  })
  .catch((error) => {
    console.error('Error transferring NFT:', error);
  });