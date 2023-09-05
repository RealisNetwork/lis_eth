const nftArgs = {
    name: 'MeowgonEgg',
    symbol: 'MEGG',
    baseUri: 'https://evm.realiscompany.com/',
    contractUri: 'https://evm.realiscompany.com/',
    burnTime: 1702276699,
    proxyRegistryAddress: '0x58807baD0B376efc12F5AD86aAc70E78ed67deaE',
    allowedSeaDrop: ['0x00005EA00Ac477B1030CE78506496e8C2dE24bf5'],
};

module.exports = [
    nftArgs.name,
    nftArgs.symbol,
    nftArgs.baseUri,
    nftArgs.contractUri,
    nftArgs.burnTime,
    nftArgs.proxyRegistryAddress,
    nftArgs.allowedSeaDrop,
];