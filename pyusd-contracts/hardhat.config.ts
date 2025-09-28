import dotenv from 'dotenv';
import "@nomicfoundation/hardhat-ethers";
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import "hardhat-contract-sizer";

dotenv.config();

const {
  PRIVATE_KEY,
  NETWORK_URL,
  GAS_REPORTING,
  CHAINSCAN_API_KEY
} = process.env;

export default {
  defaultNetwork: "hardhat",
  networks: {
    // ethMain: {
    //   url: NETWORK_URL,
    //   ...(PRIVATE_KEY ? { accounts: [PRIVATE_KEY] } : {}),
    // },
    // ethSepolia: {
    //   url: NETWORK_URL,
    //   ...(PRIVATE_KEY ? { accounts: [PRIVATE_KEY] } : {}),
    // },
    // polygonMain: {
    //   url: NETWORK_URL,
    //   ...(PRIVATE_KEY ? { accounts: [PRIVATE_KEY] } : {}),
    // },
    // polygonMumbai: {
    //   url: NETWORK_URL,
    //   ...(PRIVATE_KEY ? { accounts: [PRIVATE_KEY] } : {}),
    // },
    polygonAmoy: {
      url: "https://rpc-amoy.polygon.technology",
      ...(PRIVATE_KEY ? { accounts: [PRIVATE_KEY] } : {}),
    },
  },
  gasReporter: {
    enabled: (GAS_REPORTING ? GAS_REPORTING == "true" : true),
  },
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.4.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    ]
  },
  etherscan: {
    apiKey: {
      polygonAmoy: CHAINSCAN_API_KEY,
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com"
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};
