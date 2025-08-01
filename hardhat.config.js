require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "shanghai"
    }
  },
  networks: {
    custom: {
      url: process.env.RPC_URL || "https://rpc.mfevscan.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.CHAIN_ID || "1"),
      gasPrice: process.env.GAS_PRICE ? parseInt(process.env.GAS_PRICE) : "auto",
      gas: process.env.GAS_LIMIT ? parseInt(process.env.GAS_LIMIT) : "auto"
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.BSC_TESTNET_CHAIN_ID || "97"),
      gasPrice: process.env.BSC_TESTNET_GAS_PRICE ? parseInt(process.env.BSC_TESTNET_GAS_PRICE) : "auto",
      gas: process.env.BSC_TESTNET_GAS_LIMIT ? parseInt(process.env.BSC_TESTNET_GAS_LIMIT) : "auto"
    },
    hardhat: {
      chainId: 9982
    }
  },
  mocha: {
    timeout: 60000
  }
}; 