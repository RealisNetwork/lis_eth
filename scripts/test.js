const { RelayProvider } = require('@opengsn/provider');
const { ethers } = require("hardhat"); 

async function main() {
  const underlyingProvider = ethers.provider;
  const gsnProvider = await RelayProvider.newProvider({
    provider: underlyingProvider,
    config: {
      loggerConfiguration: { logLevel: 'error' },
      paymasterAddress: '0x585EdEE3B2D24Db53C6Edd0540758646CF27C5fE',
    }
  }).init();

  gsnProvider.addAccount('0xb149d73dfd82513e3de8365b5974852dcbd34c6cecc7b5ab3d08c202c598d518');

  const etherProvider = new ethers.providers.Web3Provider(gsnProvider);

  // Здесь ваш код для выполнения метода смарт-контракта
  const LisMarketplace = await ethers.getContractFactory("LisMarketplace");
  let lisMarketplace = LisMarketplace.attach("0x7e89643b1540AD3c561128E2E4c5033dEDAeE270");

  lisMarketplace = lisMarketplace.connect(etherProvider.getSigner('0xCCc070f7d411296e11431E4c369d44Eb0ef27897'));

  console.log(await lisMarketplace.placeOnMarketplace('0xA50c329393b900c725Ce5351EA3568B60f5D6803', '0x30fe4dD2bC755217f3a80CEd2c8E683Aae17bba4', 510, 20000000000));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });