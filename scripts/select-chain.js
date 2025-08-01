require("dotenv").config();
const fs = require("fs");
const chalk = require("chalk");

const CHAINS = {
  "1": {
    name: "MFEV Blockchain",
    rpcUrl: "https://rpc.mfevscan.com",
    chainId: 9982,
    gasPrice: 20000000000,
    gasLimit: 3000000
  },
  "2": {
    name: "BSC Testnet",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    chainId: 97,
    gasPrice: 10000000000,
    gasLimit: 3000000
  },
  "3": {
    name: "BSC Mainnet",
    rpcUrl: "https://bsc-dataseed1.binance.org",
    chainId: 56,
    gasPrice: 5000000000,
    gasLimit: 3000000
  },
  "4": {
    name: "Ethereum Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    chainId: 1,
    gasPrice: 20000000000,
    gasLimit: 3000000
  },
  "5": {
    name: "Polygon Mainnet",
    rpcUrl: "https://polygon-rpc.com",
    chainId: 137,
    gasPrice: 30000000000,
    gasLimit: 3000000
  },
  "6": {
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    gasPrice: 100000000,
    gasLimit: 3000000
  }
};

function updateEnvFile(chain) {
  const envPath = ".env";
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }
  
  // Update or add chain configuration
  const updates = [
    `RPC_URL=${chain.rpcUrl}`,
    `CHAIN_ID=${chain.chainId}`,
    `GAS_PRICE=${chain.gasPrice}`,
    `GAS_LIMIT=${chain.gasLimit}`,
    `NETWORK_NAME=${chain.name.replace(" ", "_")}`,
    `NETWORK_TYPE=${chain.name.includes("Testnet") ? "testnet" : "mainnet"}`
  ];
  
  // Remove existing RPC_URL, CHAIN_ID, GAS_PRICE, GAS_LIMIT lines
  const lines = envContent.split("\n").filter(line => {
    return !line.startsWith("RPC_URL=") && 
           !line.startsWith("CHAIN_ID=") && 
           !line.startsWith("GAS_PRICE=") && 
           !line.startsWith("GAS_LIMIT=") &&
           !line.startsWith("NETWORK_NAME=") &&
           !line.startsWith("NETWORK_TYPE=");
  });
  
  // Add new configuration
  lines.push(...updates);
  
  fs.writeFileSync(envPath, lines.join("\n"));
}

function showCurrentChain() {
  const rpcUrl = process.env.RPC_URL;
  const chainId = process.env.CHAIN_ID;
  
  console.log(chalk.blue("🔗 Current Active Chain:"));
  if (rpcUrl && chainId) {
    console.log(chalk.green(`   RPC URL: ${rpcUrl}`));
    console.log(chalk.green(`   Chain ID: ${chainId}`));
  } else {
    console.log(chalk.red("   No chain configured"));
  }
  console.log("");
}

function main() {
  console.log(chalk.bold.blue("🔍 Blockchain Chain Selector"));
  console.log("=".repeat(50));
  
  showCurrentChain();
  
  console.log(chalk.yellow("Available chains:"));
  Object.entries(CHAINS).forEach(([key, chain]) => {
    console.log(`   ${key}. ${chain.name} (Chain ID: ${chain.chainId})`);
  });
  console.log("");
  
  console.log(chalk.cyan("Usage:"));
  console.log("   node scripts/select-chain.js <chain_number>");
  console.log("");
  console.log(chalk.cyan("Examples:"));
  console.log("   node scripts/select-chain.js 1  # Select MFEV Blockchain");
  console.log("   node scripts/select-chain.js 2  # Select BSC Testnet");
  console.log("   node scripts/select-chain.js 3  # Select BSC Mainnet");
  console.log("   node scripts/select-chain.js 4  # Select Ethereum Mainnet");
  console.log("   node scripts/select-chain.js 5  # Select Polygon Mainnet");
  console.log("   node scripts/select-chain.js 6  # Select Arbitrum One");
  console.log("");
  
  const selectedChain = process.argv[2];
  
  if (selectedChain && CHAINS[selectedChain]) {
    const chain = CHAINS[selectedChain];
    console.log(chalk.green(`✅ Selected: ${chain.name}`));
    updateEnvFile(chain);
    console.log(chalk.green("✅ .env file updated successfully!"));
    console.log("");
    console.log(chalk.cyan("Now you can run:"));
    console.log("   npm run core-audit");
    console.log("   npm run audit");
    console.log("   npm run quick-test");
  } else if (selectedChain) {
    console.log(chalk.red(`❌ Invalid chain number: ${selectedChain}`));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CHAINS, updateEnvFile }; 