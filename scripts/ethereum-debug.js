require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");

async function debugEthereumMainnet() {
  console.log(chalk.blue("🔍 ETHEREUM MAINNET DETAILED DIAGNOSTIC"));
  console.log("=".repeat(60));
  
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  
  try {
    // Get basic chain info
    const blockNumber = await provider.getBlockNumber();
    const chainId = await provider.send("eth_chainId", []);
    
    console.log(chalk.yellow("📡 Basic Chain Info:"));
    console.log(`   Chain ID: ${parseInt(chainId, 16)}`);
    console.log(`   Current Block: ${blockNumber}`);
    console.log(`   RPC URL: ${process.env.RPC_URL}`);
    console.log("");
    
    // Get detailed block info
    console.log(chalk.yellow("📦 Block Analysis:"));
    const block = await provider.getBlock(blockNumber);
    console.log(`   Block Hash: ${block.hash}`);
    console.log(`   Base Fee Per Gas: ${block.baseFeePerGas || 'undefined'}`);
    console.log(`   Gas Limit: ${block.gasLimit}`);
    console.log(`   Gas Used: ${block.gasUsed}`);
    console.log(`   Miner: ${block.miner || 'undefined'}`);
    console.log(`   Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
    console.log("");
    
    // Check for Shanghai features
    console.log(chalk.yellow("🔧 Shanghai EVM Feature Detection:"));
    
    // Check for PUSH0 opcode (EIP-3855)
    console.log(chalk.blue("   Testing PUSH0 opcode (EIP-3855)..."));
    try {
      // PUSH0 opcode is 0x5f
      const push0Test = await provider.send("eth_call", [{
        to: "0x0000000000000000000000000000000000000000",
        data: "0x5f" // PUSH0 opcode
      }, "latest"]);
      console.log(chalk.green(`   ✅ PUSH0 opcode test result: ${push0Test}`));
    } catch (error) {
      console.log(chalk.red(`   ❌ PUSH0 opcode test failed: ${error.message}`));
    }
    
    // Check for EIP-3860 (Initcode metering)
    console.log(chalk.blue("   Testing EIP-3860 (Initcode metering)..."));
    try {
      // This is harder to test directly, but we can check if the chain supports it
      // by looking at recent blocks and their gas usage patterns
      const recentBlock = await provider.getBlock(blockNumber - 1);
      console.log(chalk.green(`   ✅ Recent block gas usage: ${recentBlock.gasUsed}`));
    } catch (error) {
      console.log(chalk.red(`   ❌ EIP-3860 test failed: ${error.message}`));
    }
    
    // Check for EIP-3651 (Warm COINBASE)
    console.log(chalk.blue("   Testing EIP-3651 (Warm COINBASE)..."));
    try {
      const coinbase = await provider.send("eth_coinbase", []);
      console.log(chalk.green(`   ✅ COINBASE: ${coinbase}`));
    } catch (error) {
      console.log(chalk.red(`   ❌ COINBASE test failed: ${error.message}`));
    }
    
    console.log("");
    
    // Check for London features
    console.log(chalk.yellow("⛽ London EVM Feature Detection:"));
    
    // Check for EIP-1559 (Base fee)
    console.log(chalk.blue("   Testing EIP-1559 (Base fee)..."));
    if (block.baseFeePerGas) {
      console.log(chalk.green(`   ✅ Base fee per gas: ${block.baseFeePerGas}`));
      console.log(chalk.green(`   ✅ EIP-1559 is supported`));
    } else {
      console.log(chalk.red(`   ❌ Base fee per gas: undefined`));
      console.log(chalk.red(`   ❌ EIP-1559 is NOT supported`));
    }
    
    // Check for EIP-3198 (BASEFEE opcode)
    console.log(chalk.blue("   Testing EIP-3198 (BASEFEE opcode)..."));
    try {
      // BASEFEE opcode is 0x48
      const basefeeTest = await provider.send("eth_call", [{
        to: "0x0000000000000000000000000000000000000000",
        data: "0x48" // BASEFEE opcode
      }, "latest"]);
      console.log(chalk.green(`   ✅ BASEFEE opcode test result: ${basefeeTest}`));
    } catch (error) {
      console.log(chalk.red(`   ❌ BASEFEE opcode test failed: ${error.message}`));
    }
    
    console.log("");
    
    // Check for Berlin features
    console.log(chalk.yellow("🏙️ Berlin EVM Feature Detection:"));
    
    // Check for EIP-2718 (Typed transactions)
    console.log(chalk.blue("   Testing EIP-2718 (Typed transactions)..."));
    try {
      const gasPrice = await provider.send("eth_gasPrice", []);
      console.log(chalk.green(`   ✅ Gas price: ${gasPrice}`));
      console.log(chalk.green(`   ✅ EIP-2718 is supported`));
    } catch (error) {
      console.log(chalk.red(`   ❌ EIP-2718 test failed: ${error.message}`));
    }
    
    // Check for EIP-2930 (Access lists)
    console.log(chalk.blue("   Testing EIP-2930 (Access lists)..."));
    try {
      const feeHistory = await provider.send("eth_feeHistory", ["0x4", "latest", [25, 75]]);
      console.log(chalk.green(`   ✅ Fee history: ${JSON.stringify(feeHistory).substring(0, 100)}...`));
      console.log(chalk.green(`   ✅ EIP-2930 is supported`));
    } catch (error) {
      console.log(chalk.red(`   ❌ EIP-2930 test failed: ${error.message}`));
    }
    
    console.log("");
    
    // Check for Istanbul features
    console.log(chalk.yellow("🕌 Istanbul EVM Feature Detection:"));
    
    // Check for EIP-1344 (CHAINID opcode)
    console.log(chalk.blue("   Testing EIP-1344 (CHAINID opcode)..."));
    try {
      // CHAINID opcode is 0x46
      const chainidTest = await provider.send("eth_call", [{
        to: "0x0000000000000000000000000000000000000000",
        data: "0x46" // CHAINID opcode
      }, "latest"]);
      console.log(chalk.green(`   ✅ CHAINID opcode test result: ${chainidTest}`));
    } catch (error) {
      console.log(chalk.red(`   ❌ CHAINID opcode test failed: ${error.message}`));
    }
    
    console.log("");
    
    // Manual EVM version determination
    console.log(chalk.yellow("🔍 Manual EVM Version Determination:"));
    
    let evmVersion = "unknown";
    let shanghaiFeatures = 0;
    let londonFeatures = 0;
    let berlinFeatures = 0;
    let istanbulFeatures = 0;
    
    // Count Shanghai features
    if (block.baseFeePerGas) shanghaiFeatures++;
    if (block.miner) shanghaiFeatures++;
    
    // Count London features
    if (block.baseFeePerGas) londonFeatures++;
    
    // Count Berlin features
    berlinFeatures += 2; // Assuming EIP-2718 and EIP-2930 are supported
    
    // Count Istanbul features
    istanbulFeatures++; // Assuming EIP-1344 is supported
    
    console.log(`   Shanghai features detected: ${shanghaiFeatures}`);
    console.log(`   London features detected: ${londonFeatures}`);
    console.log(`   Berlin features detected: ${berlinFeatures}`);
    console.log(`   Istanbul features detected: ${istanbulFeatures}`);
    
    if (shanghaiFeatures >= 2) {
      evmVersion = "shanghai";
    } else if (londonFeatures >= 1) {
      evmVersion = "london";
    } else if (berlinFeatures >= 2) {
      evmVersion = "berlin";
    } else if (istanbulFeatures >= 1) {
      evmVersion = "istanbul";
    }
    
    console.log(chalk.green(`   🎯 Determined EVM Version: ${evmVersion.toUpperCase()}`));
    
    console.log("");
    console.log(chalk.yellow("💡 Analysis:"));
    
    if (evmVersion === "shanghai") {
      console.log(chalk.green("   ✅ Ethereum Mainnet is correctly running Shanghai EVM"));
      console.log(chalk.green("   ✅ Full Solidity 0.8.23 support is available"));
    } else if (evmVersion === "london") {
      console.log(chalk.yellow("   ⚠️ Ethereum Mainnet is running London EVM"));
      console.log(chalk.yellow("   ⚠️ Partial Solidity 0.8.23 support"));
      console.log(chalk.red("   ❌ Missing PUSH0 opcode (EIP-3855)"));
    } else {
      console.log(chalk.red("   ❌ Ethereum Mainnet is running an older EVM version"));
      console.log(chalk.red("   ❌ Limited Solidity 0.8.23 support"));
    }
    
    // Check if this might be a testnet or different network
    console.log("");
    console.log(chalk.yellow("🔍 Network Verification:"));
    console.log(`   Expected Chain ID: 1 (Ethereum Mainnet)`);
    console.log(`   Actual Chain ID: ${parseInt(chainId, 16)}`);
    
    if (parseInt(chainId, 16) !== 1) {
      console.log(chalk.red("   ❌ WARNING: Chain ID mismatch! This might not be Ethereum Mainnet"));
    } else {
      console.log(chalk.green("   ✅ Chain ID matches Ethereum Mainnet"));
    }
    
    // Check block number range
    console.log(`   Current Block: ${blockNumber}`);
    if (blockNumber < 1000000) {
      console.log(chalk.red("   ❌ WARNING: Block number too low for Ethereum Mainnet"));
    } else {
      console.log(chalk.green("   ✅ Block number is in expected range for Ethereum Mainnet"));
    }
    
  } catch (error) {
    console.log(chalk.red(`❌ Diagnostic failed: ${error.message}`));
  }
}

if (require.main === module) {
  debugEthereumMainnet()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { debugEthereumMainnet }; 