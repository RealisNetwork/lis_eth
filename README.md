# lis_eth
Repo for LIS ethereum based contracts

To launch project locally.
1. Install dependencies: "npm i"
2. Compile contracts: "npm run compile" (compiled data will appear in "artifacts" folder)
3. Launch local node on address http://127.0.0.1:8545: "npm run start" or simply "npm start"
4. To run tests: "npm run test"
5. To check gas in called functions, run: "npm run test_gas"

To verify contract on scan websites, example of command:
npx hardhat verify --network polygon_mumbai 0x5C9b6A626ADf148a1c22df009F4461df9e95BaCa

To deploy example:
npx hardhat run --network polygon_mumbai scripts/deploy-marketplace.js

To connect to network using console/test connection: 
npx hardhat console --network mainnet


npx hardhat flatten > flatten.sol