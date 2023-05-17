const fs = require('fs');
const { artifacts } = require('hardhat');

async function flattenContracts() {
  const contractPaths = [
    'contracts/Lis.sol',
    // Add additional contracts if needed
  ];

  let flattenedCode = '';

  for (const path of contractPaths) {
    const artifact = await artifacts.readArtifact(path);
    flattenedCode += artifact.source;
  }

  fs.writeFileSync('flattened.sol', flattenedCode);
}

flattenContracts()
  .then(() => console.log('Contracts flattened successfully.'))
  .catch((error) => console.error('Error flattening contracts:', error));
