const { ethers } = require('hardhat');

const makeAccessControleErrorStr = (address, role) => {
    try {
        return `AccessControl: account ${ethers.utils.hexlify(address)} is missing role ${ethers.utils.hexZeroPad(role, 32)}`;
    } catch (e) {
        console.error('[makeAccessControleErrorStr] Somethings went wrong: ', e);
    }
}

const revokeRoleErrorStr = 'Forbiden to revoke roles.';

const transferFromErrorStr = 'ERC721: caller is not token owner or approved';
const nftMaxSupplyErrorStr = 'Collection limit has been exceeded.';
const nftMintTimeErrorStr = 'Collection mint time has been exceeded.';

module.exports = {
    makeAccessControleErrorStr,
    revokeRoleErrorStr,
    transferFromErrorStr,
    nftMaxSupplyErrorStr,
    nftMintTimeErrorStr,
};