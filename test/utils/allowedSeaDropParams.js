const allowedSeaDropParams = [
    100,
    'https://evm.prod-us-west.realis.network/',
    'https://evm.prod-us-west.realis.network/',
    '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5',
    [
      '10000000000000000',
      '1693377286',
      '1696055667',
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
    []
];

const allowedSeaDropParamsAsObj = {
    maxSupply: allowedSeaDropParams[0],
    baseURI: allowedSeaDropParams[1],
    contractURI: allowedSeaDropParams[2],
    seaDropImpl: allowedSeaDropParams[3],
    publicDrop: {
      mintPrice: allowedSeaDropParams[4][0],
      startTime: allowedSeaDropParams[4][1],
      endTime: allowedSeaDropParams[4][2],
      maxTotalMintableByWallet: allowedSeaDropParams[4][3],
      feeBps: allowedSeaDropParams[4][4],
      restrictFeeRecipients: allowedSeaDropParams[4][5],
    },
    dropURI: allowedSeaDropParams[5],
    allowListData: {
      merkleRoot: allowedSeaDropParams[6][0],
      publicKeyURIs: allowedSeaDropParams[6][1],
      allowListURI: allowedSeaDropParams[6][2]
    },
    creatorPayoutAddress: allowedSeaDropParams[7],
    provenanceHash: allowedSeaDropParams[8],
    allowedFeeRecipients: allowedSeaDropParams[9],
    disallowedFeeRecipients: allowedSeaDropParams[10],
    allowedPayers: allowedSeaDropParams[11],
    disallowedPayers: allowedSeaDropParams[12],
    tokenGatedAllowedNftTokens: allowedSeaDropParams[13],
    tokenGatedDropStages: allowedSeaDropParams[14],
    disallowedTokenGatedAllowedNftTokens: allowedSeaDropParams[15],
    signers: allowedSeaDropParams[16],
    signedMintValidationParams: allowedSeaDropParams[17],
    disallowedSigners: allowedSeaDropParams[18],
  }

module.exports = {
    allowedSeaDropParams,
    allowedSeaDropParamsAsObj
};