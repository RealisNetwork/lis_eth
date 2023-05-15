const { ethers } = require('hardhat');

const makeAccessControleErrorStr = (address, role) => {
    try {
        return `AccessControl: account ${ethers.utils.hexlify(address)} is missing role ${ethers.utils.hexZeroPad(role, 32)}`;
    } catch (e) {
        console.error('[makeAccessControleErrorStr] Somethings went wrong: ', e);
    }
}

module.exports = {
    makeAccessControleErrorStr,
};