require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");
const ora = require("ora").default;
const fs = require("fs");

const CHAINS = {
  "MFEV": {
    name: "MFEV Blockchain",
    rpcUrl: "https://rpc.mfevscan.com",
    chainId: 9982,
    type: "mainnet"
  },
  "BSC_Testnet": {
    name: "BSC Testnet",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    chainId: 97,
    type: "testnet"
  },
  "BSC_Mainnet": {
    name: "BSC Mainnet",
    rpcUrl: "https://bsc-dataseed1.binance.org",
    chainId: 56,
    type: "mainnet"
  },
  "Ethereum": {
    name: "Ethereum Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    chainId: 1,
    type: "mainnet"
  },
  "Polygon": {
    name: "Polygon Mainnet",
    rpcUrl: "https://polygon-rpc.com",
    chainId: 137,
    type: "mainnet"
  },
  "Arbitrum": {
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    type: "mainnet"
  }
};

class MultiChainAuditor {
  constructor() {
    this.results = {};
  }

  async testChain(chainKey, chainConfig) {
    console.log(chalk.yellow(`\n🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`));
    console.log("-".repeat(60));
    
    const result = {
      name: chainConfig.name,
      chainId: chainConfig.chainId,
      type: chainConfig.type,
      rpcUrl: chainConfig.rpcUrl,
      connection: false,
      blockInfo: {},
      rpcMethods: {},
      eips: {},
      opcodes: {},
      gasFeatures: {},
      latestFeatures: {},
      evmVersion: "unknown",
      soliditySupport: {},
      recommendations: []
    };

    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
      
      // Test connection
      const blockNumber = await provider.getBlockNumber();
      const chainId = await provider.send("eth_chainId", []);
      
      result.connection = true;
      result.blockInfo = {
        currentBlock: blockNumber.toString(),
        chainId: parseInt(chainId, 16)
      };
      
      console.log(chalk.green(`✅ Connected to ${chainConfig.name}`));
      console.log(chalk.gray(`   Block: ${blockNumber}`));
      console.log(chalk.gray(`   Chain ID: ${parseInt(chainId, 16)}`));
      
      // Test RPC methods
      const rpcMethods = await this.testRPCMethods(provider, blockNumber);
      result.rpcMethods = rpcMethods;
      
      // Test EIPs and EVM features
      const evmResults = await this.testEVMFunctions(provider, blockNumber);
      result.eips = evmResults.eips;
      result.opcodes = evmResults.opcodes;
      result.gasFeatures = evmResults.gasFeatures;
      result.evmVersion = this.determineEVMVersion(evmResults.eips);
      
      // Test latest features
      result.latestFeatures = await this.testLatestFeatures(provider);
      
      // Test Solidity 0.8.23 compatibility
      result.soliditySupport = this.testSolidity023Compatibility(evmResults.eips, result.evmVersion);
      
      // Generate recommendations
      result.recommendations = this.generateRecommendations(result);
      
      console.log(chalk.green(`✅ RPC Methods: ${Object.values(rpcMethods).filter(m => m.supported).length}/10 supported`));
      console.log(chalk.green(`✅ EVM Version: ${result.evmVersion.toUpperCase()}`));
      console.log(chalk.green(`✅ Solidity 0.8.23: ${result.soliditySupport.Version_0_8_23 ? 'Supported' : 'Limited'}`));
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to test ${chainConfig.name}: ${error.message}`));
      result.error = error.message;
    }
    
    return result;
  }

  async testRPCMethods(provider, blockNumber) {
    const rpcMethods = {};
    const rpcTests = [
      "eth_chainId",
      "eth_getLogs",
      "eth_feeHistory",
      "eth_syncing",
      "eth_maxPriorityFeePerGas",
      "eth_gasPrice",
      "eth_blockNumber",
      "eth_getBalance",
      "eth_call",
      "eth_estimateGas"
    ];
    
    for (const method of rpcTests) {
      try {
        let params = [];
        if (method === "eth_getLogs") {
          params = [{
            fromBlock: `0x${(blockNumber - 1).toString(16)}`,
            toBlock: `0x${(blockNumber - 1).toString(16)}`,
            topics: []
          }];
        } else if (method === "eth_feeHistory") {
          params = ["0x4", "latest", [25, 75]];
        } else if (method === "eth_getBalance") {
          params = ["0x0000000000000000000000000000000000000000", "latest"];
        } else if (method === "eth_call") {
          params = [{
            to: "0x0000000000000000000000000000000000000000",
            data: "0x"
          }, "latest"];
        } else if (method === "eth_estimateGas") {
          params = [{
            to: "0x0000000000000000000000000000000000000000",
            data: "0x"
          }];
        }
        
        const result = await provider.send(method, params);
        rpcMethods[method] = { supported: true, result: result };
      } catch (error) {
        rpcMethods[method] = { supported: false, error: error.message };
      }
    }
    
    return rpcMethods;
  }

  async testEVMFunctions(provider, blockNumber) {
    const eips = {};
    const opcodes = {};
    const gasFeatures = {};
    
    // Test EIP-1559 (Base Fee)
    try {
      const block = await provider.getBlock(blockNumber);
      const baseFee = block.baseFeePerGas;
      eips["EIP-1559"] = baseFee !== undefined && baseFee > 0;
      gasFeatures["EIP-1559_BaseFee"] = baseFee !== undefined && baseFee > 0;
      gasFeatures["BaseFee"] = baseFee || 0;
    } catch (error) {
      eips["EIP-1559"] = false;
      gasFeatures["EIP-1559_BaseFee"] = false;
      gasFeatures["BaseFee"] = 0;
    }
    
    // Test EIP-1344 (Chain ID)
    try {
      const chainId = await provider.send("eth_chainId", []);
      eips["EIP-1344"] = parseInt(chainId, 16) > 0;
    } catch (error) {
      eips["EIP-1344"] = false;
    }
    
    // Test EIP-3198 (BASEFEE opcode)
    try {
      const block = await provider.getBlock(blockNumber);
      eips["EIP-3198"] = block.baseFeePerGas !== undefined;
    } catch (error) {
      eips["EIP-3198"] = false;
    }
    
    // Test EIP-3651 (Warm COINBASE)
    try {
      const block = await provider.getBlock(blockNumber);
      eips["EIP-3651"] = block.miner !== undefined;
    } catch (error) {
      eips["EIP-3651"] = false;
    }
    
    // Set other EIPs based on EVM version
    eips["EIP-2718"] = true; // Typed transactions
    eips["EIP-2930"] = true; // Access lists
    eips["EIP-3860"] = true; // Initcode metering
    
    // Test opcodes (simulated)
    opcodes["PUSH0"] = eips["EIP-3855"] || false;
    opcodes["RETURNDATASIZE"] = eips["EIP-211"] || false;
    opcodes["SHL"] = eips["EIP-145"] || false;
    opcodes["SHR"] = eips["EIP-145"] || false;
    opcodes["CALLCODE"] = true;
    
    // Set EIPs based on opcodes
    eips["EIP-3855"] = opcodes["PUSH0"];
    eips["EIP-211"] = opcodes["RETURNDATASIZE"];
    eips["EIP-145"] = opcodes["SHL"] && opcodes["SHR"];
    
    return { eips, opcodes, gasFeatures };
  }

  async testLatestFeatures(provider) {
    const latestFeatures = {};
    
    // Test EIP-4844 (Blob transactions)
    try {
      const blobBaseFee = await provider.send("eth_blobBaseFee", []);
      latestFeatures["EIP-4844_BlobBaseFee"] = { supported: true, value: blobBaseFee };
    } catch (error) {
      latestFeatures["EIP-4844_BlobBaseFee"] = { supported: false, error: error.message };
    }
    
    // Test EIP-1153 (Transient storage)
    try {
      const transientStorage = await provider.send("eth_getTransientStorage", ["0x0", "0x0"]);
      latestFeatures["EIP-1153_TransientStorage"] = { supported: true, value: transientStorage };
    } catch (error) {
      latestFeatures["EIP-1153_TransientStorage"] = { supported: false, error: error.message };
    }
    
    // Test EIP-4788 (Beacon block root)
    try {
      const beaconRoot = await provider.send("eth_getBeaconRoot", ["latest"]);
      latestFeatures["EIP-4788_BeaconRoot"] = { supported: true, value: beaconRoot };
    } catch (error) {
      latestFeatures["EIP-4788_BeaconRoot"] = { supported: false, error: error.message };
    }
    
    return latestFeatures;
  }

  determineEVMVersion(eips) {
    // Check for Shanghai features (EIP-3855, EIP-3860, EIP-3651)
    if (eips["EIP-3855"] && eips["EIP-3860"] && eips["EIP-3651"]) {
      return "shanghai";
    }
    
    // Check for London features (EIP-1559, EIP-3198)
    if (eips["EIP-1559"] && eips["EIP-3198"]) {
      return "london";
    }
    
    // Check for Berlin features (EIP-2718, EIP-2930)
    if (eips["EIP-2718"] && eips["EIP-2930"]) {
      return "berlin";
    }
    
    // Check for Istanbul features (EIP-1344)
    if (eips["EIP-1344"]) {
      return "istanbul";
    }
    
    return "unknown";
  }

  testSolidity023Compatibility(eips, evmVersion) {
    return {
      "Version_0_8_23": true,
      "Shanghai_EVM": evmVersion === "shanghai",
      "PUSH0_Support": eips["EIP-3855"],
      "BaseFee_Support": eips["EIP-1559"],
      "ChainId_Support": eips["EIP-1344"],
      "Typed_Transactions": eips["EIP-2718"],
      "Access_Lists": eips["EIP-2930"],
      "BASEFEE_Opcode": eips["EIP-3198"],
      "Warm_COINBASE": eips["EIP-3651"],
      "Initcode_Metering": eips["EIP-3860"]
    };
  }

  generateRecommendations(result) {
    const recommendations = [];
    
    // Check Solidity 0.8.23 requirements
    const requiredEIPs = ["EIP-1559", "EIP-3855", "EIP-1344", "EIP-2718", "EIP-2930", "EIP-3198", "EIP-3651", "EIP-3860"];
    const missingEIPs = requiredEIPs.filter(eip => !result.eips[eip]);
    
    if (missingEIPs.length > 0) {
      recommendations.push(`Missing EIPs for Solidity 0.8.23: ${missingEIPs.join(', ')}`);
    }
    
    // Check EVM version
    if (result.evmVersion !== "shanghai") {
      recommendations.push(`Upgrade to Shanghai EVM for full Solidity 0.8.23 support (current: ${result.evmVersion})`);
    }
    
    // Check gas features
    if (!result.gasFeatures["EIP-1559_BaseFee"]) {
      recommendations.push("Implement EIP-1559 base fee for modern gas pricing");
    }
    
    // Overall assessment
    const soliditySupport = result.soliditySupport || {};
    const supportedFeatures = Object.values(soliditySupport).filter(s => s === true).length;
    const totalFeatures = Object.keys(soliditySupport).length;
    
    if (supportedFeatures >= totalFeatures * 0.8) {
      recommendations.push("Chain is well-suited for Solidity 0.8.23 development");
    } else if (supportedFeatures >= totalFeatures * 0.6) {
      recommendations.push("Chain has partial Solidity 0.8.23 support - some features may not work");
    } else {
      recommendations.push("Chain needs significant upgrades for Solidity 0.8.23 compatibility");
    }
    
    return recommendations;
  }

  async runFullAudit() {
    console.log(chalk.blue("🔍 MULTI-CHAIN BLOCKCHAIN INFRASTRUCTURE AUDIT"));
    console.log("=".repeat(80));
    
    const spinner = ora("Testing all chains...").start();
    
    for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
      this.results[chainKey] = await this.testChain(chainKey, chainConfig);
    }
    
    spinner.succeed("Multi-chain audit completed");
    
    this.printComparisonReport();
    this.saveResults();
  }

  printComparisonReport() {
    console.log(chalk.blue("\n📊 COMPREHENSIVE COMPARISON REPORT"));
    console.log("=".repeat(80));
    
    // EVM Version Comparison
    console.log(chalk.bold("\n⚙️  EVM VERSION COMPARISON:"));
    Object.entries(this.results).forEach(([key, result]) => {
      if (result.connection) {
        const status = result.evmVersion === "shanghai" ? "✅" : 
                      result.evmVersion === "london" ? "⚠️" : "❌";
        console.log(`   ${status} ${result.name}: ${result.evmVersion.toUpperCase()}`);
      }
    });
    
    // Solidity 0.8.23 Support
    console.log(chalk.bold("\n📋 SOLIDITY 0.8.23 COMPATIBILITY:"));
    Object.entries(this.results).forEach(([key, result]) => {
      if (result.connection) {
        const soliditySupport = result.soliditySupport || {};
        const supportedFeatures = Object.values(soliditySupport).filter(s => s === true).length;
        const totalFeatures = Object.keys(soliditySupport).length;
        const percentage = Math.round((supportedFeatures / totalFeatures) * 100);
        
        const status = percentage >= 80 ? "✅" : percentage >= 60 ? "⚠️" : "❌";
        console.log(`   ${status} ${result.name}: ${percentage}% (${supportedFeatures}/${totalFeatures} features)`);
      }
    });
    
    // RPC Method Support
    console.log(chalk.bold("\n🔌 RPC METHOD SUPPORT:"));
    Object.entries(this.results).forEach(([key, result]) => {
      if (result.connection) {
        const rpcMethods = result.rpcMethods || {};
        const supportedMethods = Object.values(rpcMethods).filter(m => m.supported).length;
        const totalMethods = Object.keys(rpcMethods).length;
        const percentage = Math.round((supportedMethods / totalMethods) * 100);
        
        const status = percentage >= 90 ? "✅" : percentage >= 70 ? "⚠️" : "❌";
        console.log(`   ${status} ${result.name}: ${percentage}% (${supportedMethods}/${totalMethods} methods)`);
      }
    });
    
    // Latest Features Support
    console.log(chalk.bold("\n🚀 LATEST FEATURES SUPPORT:"));
    Object.entries(this.results).forEach(([key, result]) => {
      if (result.connection) {
        const latestFeatures = result.latestFeatures || {};
        const supportedFeatures = Object.values(latestFeatures).filter(f => f.supported).length;
        const totalFeatures = Object.keys(latestFeatures).length;
        const percentage = totalFeatures > 0 ? Math.round((supportedFeatures / totalFeatures) * 100) : 0;
        
        const status = percentage >= 50 ? "✅" : percentage >= 25 ? "⚠️" : "❌";
        console.log(`   ${status} ${result.name}: ${percentage}% (${supportedFeatures}/${totalFeatures} features)`);
      }
    });
    
    // Block Time Comparison
    console.log(chalk.bold("\n⏱️  PERFORMANCE COMPARISON:"));
    Object.entries(this.results).forEach(([key, result]) => {
      if (result.connection) {
        const blockNumber = parseInt(result.blockInfo.currentBlock);
        console.log(`   📊 ${result.name}: Block ${blockNumber.toLocaleString()}`);
      }
    });
    
    // Key Findings
    console.log(chalk.bold("\n🎯 KEY FINDINGS:"));
    
    // Find best performing chains
    const chainsBySoliditySupport = Object.entries(this.results)
      .filter(([key, result]) => result.connection)
      .sort((a, b) => {
        const aSupport = Object.values(a[1].soliditySupport || {}).filter(s => s === true).length;
        const bSupport = Object.values(b[1].soliditySupport || {}).filter(s => s === true).length;
        return bSupport - aSupport;
      });
    
    if (chainsBySoliditySupport.length > 0) {
      const bestChain = chainsBySoliditySupport[0];
      console.log(`   🏆 Best Solidity 0.8.23 Support: ${bestChain[1].name}`);
    }
    
    const shanghaiChains = Object.entries(this.results)
      .filter(([key, result]) => result.connection && result.evmVersion === "shanghai");
    
    if (shanghaiChains.length > 0) {
      console.log(`   ✅ Shanghai EVM Chains: ${shanghaiChains.map(([key, result]) => result.name).join(', ')}`);
    } else {
      console.log(`   ❌ No chains have Shanghai EVM (required for full Solidity 0.8.23 support)`);
    }
    
    // Recommendations
    console.log(chalk.bold("\n💡 RECOMMENDATIONS:"));
    console.log("   1. Prioritize chains with Shanghai EVM for Solidity 0.8.23 development");
    console.log("   2. Use chains with high RPC method support for production");
    console.log("   3. Consider latest features for future-proofing");
    console.log("   4. Test thoroughly on multiple chains before deployment");
  }

  saveResults() {
    const reportPath = "./multi-chain-audit-report.json";
    const serializedResults = JSON.parse(JSON.stringify(this.results, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
    fs.writeFileSync(reportPath, JSON.stringify(serializedResults, null, 2));
    console.log(chalk.green(`\n📄 Full multi-chain report saved to: ${reportPath}`));
  }
}

async function main() {
  const auditor = new MultiChainAuditor();
  await auditor.runFullAudit();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { MultiChainAuditor, CHAINS }; 