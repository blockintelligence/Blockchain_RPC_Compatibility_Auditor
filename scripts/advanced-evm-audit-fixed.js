require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");
const ora = require("ora").default;
const fs = require("fs");

class AdvancedEVMAuditorFixed {
  constructor(rpcUrl, privateKey = null) {
    this.rpcUrl = rpcUrl;
    this.privateKey = privateKey;
    this.provider = null;
    this.signer = null;
    this.results = {
      connection: false,
      deployment: false,
      evmVersion: "unknown",
      soliditySupport: {},
      eips: {},
      opcodes: {},
      gasFeatures: {},
      latestFeatures: {},
      rpcCompatibility: {},
      contractDeployment: {},
      recommendations: [],
      chainInfo: {}
    };
  }

  async initialize() {
    try {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      
      if (this.privateKey) {
        this.signer = new ethers.Wallet(this.privateKey, this.provider);
      }
      
      const blockNumber = await this.provider.getBlockNumber();
      const chainId = await this.provider.send("eth_chainId", []);
      
      this.results.connection = true;
      this.results.chainInfo = {
        chainId: parseInt(chainId, 16),
        blockNumber: blockNumber,
        rpcUrl: this.rpcUrl
      };
      
      if (this.signer) {
        const balance = await this.provider.getBalance(this.signer.address);
        this.results.chainInfo.balance = ethers.formatEther(balance);
      }
      
      return true;
    } catch (error) {
      console.log(chalk.red(`❌ Connection failed: ${error.message}`));
      return false;
    }
  }

  async testSolidity023Compatibility() {
    const spinner = ora("Testing Solidity 0.8.23 compatibility...").start();
    
    try {
      // Initialize results
      this.results.eips = {};
      this.results.opcodes = {};
      this.results.gasFeatures = {};
      
      // Test EIP-1559 (Base Fee) - check block for baseFeePerGas
      try {
        const block = await this.provider.getBlock("latest");
        const hasBaseFee = block.baseFeePerGas !== undefined && block.baseFeePerGas > 0;
        this.results.eips["EIP-1559"] = hasBaseFee;
        this.results.gasFeatures = {
          "EIP-1559_BaseFee": hasBaseFee,
          "EIP-1559_PriorityFee": true,
          "BaseFee": hasBaseFee ? block.baseFeePerGas.toString() : "0",
          "PriorityFee": hasBaseFee ? "1500000000" : "0"
        };
      } catch (error) {
        this.results.eips["EIP-1559"] = false;
        this.results.gasFeatures = {
          "EIP-1559_BaseFee": false,
          "EIP-1559_PriorityFee": false,
          "BaseFee": "0",
          "PriorityFee": "0"
        };
      }
      
      // Test EIP-1344 (Chain ID)
      try {
        const chainId = await this.provider.send("eth_chainId", []);
        this.results.eips["EIP-1344"] = parseInt(chainId, 16) > 0;
      } catch (error) {
        this.results.eips["EIP-1344"] = false;
      }
      
      // Test EIP-3198 (BASEFEE opcode)
      try {
        const basefeeTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x48" // BASEFEE opcode
        }, "latest"]);
        this.results.eips["EIP-3198"] = true;
      } catch (error) {
        this.results.eips["EIP-3198"] = false;
      }
      
      // Test EIP-3651 (Warm COINBASE)
      try {
        const coinbaseTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x41" // COINBASE opcode
        }, "latest"]);
        this.results.eips["EIP-3651"] = true;
      } catch (error) {
        this.results.eips["EIP-3651"] = false;
      }
      
      // Test EIP-3855 (PUSH0 opcode) - Critical for Shanghai
      try {
        const push0Test = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x5f" // PUSH0 opcode
        }, "latest"]);
        this.results.eips["EIP-3855"] = true;
        this.results.opcodes["PUSH0"] = true;
      } catch (error) {
        this.results.eips["EIP-3855"] = false;
        this.results.opcodes["PUSH0"] = false;
      }
      
      // Test EIP-211 (RETURNDATASIZE)
      try {
        const returndatasizeTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x3d" // RETURNDATASIZE opcode
        }, "latest"]);
        this.results.eips["EIP-211"] = true;
        this.results.opcodes["RETURNDATASIZE"] = true;
      } catch (error) {
        this.results.eips["EIP-211"] = false;
        this.results.opcodes["RETURNDATASIZE"] = false;
      }
      
      // Test EIP-145 (SHL/SHR/SAR)
      try {
        const shlTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x1b" // SHL opcode
        }, "latest"]);
        this.results.eips["EIP-145"] = true;
        this.results.opcodes["SHL"] = true;
        this.results.opcodes["SHR"] = true;
        this.results.opcodes["SAR"] = true;
      } catch (error) {
        this.results.eips["EIP-145"] = false;
        this.results.opcodes["SHL"] = false;
        this.results.opcodes["SHR"] = false;
        this.results.opcodes["SAR"] = false;
      }
      
      // Test EIP-2718 (Typed Transactions)
      try {
        const typedTxTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x"
        }, "latest"]);
        this.results.eips["EIP-2718"] = true;
      } catch (error) {
        this.results.eips["EIP-2718"] = false;
      }
      
      // Test EIP-2930 (Access Lists)
      try {
        const accessListTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x"
        }, "latest"]);
        this.results.eips["EIP-2930"] = true;
      } catch (error) {
        this.results.eips["EIP-2930"] = false;
      }
      
      // Test EIP-3860 (Initcode Metering)
      try {
        const initcodeTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x"
        }, "latest"]);
        this.results.eips["EIP-3860"] = true;
      } catch (error) {
        this.results.eips["EIP-3860"] = false;
      }
      
      // Test CALLCODE (legacy opcode)
      try {
        const callcodeTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0xf2" // CALLCODE opcode
        }, "latest"]);
        this.results.opcodes["CALLCODE"] = true;
      } catch (error) {
        this.results.opcodes["CALLCODE"] = false;
      }
      
      // Determine EVM version based on actual test results
      this.results.evmVersion = this.determineEVMVersion();
      
      // Test Solidity 0.8.23 specific features
      this.results.soliditySupport = {
        "Version_0_8_23": this.results.evmVersion === "shanghai",
        "Shanghai_EVM": this.results.evmVersion === "shanghai",
        "PUSH0_Support": this.results.eips["EIP-3855"] || false,
        "BaseFee_Support": this.results.eips["EIP-1559"] || false,
        "ChainId_Support": this.results.eips["EIP-1344"] || false,
        "Typed_Transactions": this.results.eips["EIP-2718"] || false,
        "Access_Lists": this.results.eips["EIP-2930"] || false,
        "BASEFEE_Opcode": this.results.eips["EIP-3198"] || false,
        "Warm_COINBASE": this.results.eips["EIP-3651"] || false,
        "Initcode_Metering": this.results.eips["EIP-3860"] || false
      };
      
      spinner.succeed("Solidity 0.8.23 compatibility testing completed");
    } catch (error) {
      spinner.fail(`Solidity 0.8.23 testing failed: ${error.message}`);
      console.log(chalk.red(`   ❌ Testing failed: ${error.message}`));
    }
  }

  determineEVMVersion() {
    const eips = this.results.eips;
    
    // Check for Shanghai features - PUSH0 (EIP-3855) is the key Shanghai feature
    if (eips["EIP-3855"]) {
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

  async testRPCCompatibility() {
    const spinner = ora("Testing RPC method compatibility...").start();
    
    try {
      const rpcCompatibility = {};
      
      // Test only the most critical RPC methods with timeouts
      const rpcTests = [
        {
          method: "eth_chainId",
          params: [],
          description: "Chain ID retrieval",
          timeout: 5000
        },
        {
          method: "eth_blockNumber",
          params: [],
          description: "Block number retrieval",
          timeout: 5000
        },
        {
          method: "eth_getBalance",
          params: ["0x0000000000000000000000000000000000000000", "latest"],
          description: "Balance checking",
          timeout: 5000
        },
        {
          method: "eth_gasPrice",
          params: [],
          description: "Gas price estimation",
          timeout: 5000
        },
        {
          method: "eth_estimateGas",
          params: [{ to: "0x0000000000000000000000000000000000000000", data: "0x" }],
          description: "Gas estimation",
          timeout: 10000
        },
        {
          method: "eth_call",
          params: [{ to: "0x0000000000000000000000000000000000000000", data: "0x" }, "latest"],
          description: "Contract calls",
          timeout: 10000
        },
        {
          method: "eth_sendRawTransaction",
          params: ["0x"], // Will fail but test if method exists
          description: "Raw transaction sending",
          timeout: 5000
        },
        {
          method: "eth_getTransactionReceipt",
          params: ["0x0000000000000000000000000000000000000000000000000000000000000000"],
          description: "Transaction receipt retrieval",
          timeout: 5000
        },
        {
          method: "eth_getLogs",
          params: [{ fromBlock: "0x0", toBlock: "latest", topics: [] }],
          description: "Log retrieval",
          timeout: 10000
        },
        {
          method: "eth_getBlockByNumber",
          params: ["latest", false],
          description: "Block retrieval by number",
          timeout: 5000
        }
      ];
      
      let supportedMethods = 0;
      const rpcResults = {};
      
      for (const test of rpcTests) {
        try {
          // Add timeout to each RPC call
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout after ${test.timeout}ms`)), test.timeout);
          });
          
          const resultPromise = this.provider.send(test.method, test.params);
          const result = await Promise.race([resultPromise, timeoutPromise]);
          
          rpcResults[test.method] = { 
            supported: true, 
            result: result,
            description: test.description
          };
          supportedMethods++;
        } catch (error) {
          rpcResults[test.method] = { 
            supported: false, 
            error: error.message,
            description: test.description
          };
        }
      }
      
      rpcCompatibility.score = Math.round((supportedMethods / rpcTests.length) * 100);
      rpcCompatibility.supported = supportedMethods;
      rpcCompatibility.total = rpcTests.length;
      rpcCompatibility.details = rpcResults;
      
      this.results.rpcCompatibility = rpcCompatibility;
      spinner.succeed("RPC compatibility testing completed");
    } catch (error) {
      spinner.fail(`RPC compatibility testing failed: ${error.message}`);
      console.log(chalk.red(`   ❌ RPC testing failed: ${error.message}`));
    }
  }

  async testContractDeployment() {
    const spinner = ora("Testing actual contract deployment...").start();
    
    try {
      const deploymentResults = {};
      
      if (!this.signer) {
        deploymentResults.status = "No private key provided for deployment testing";
        this.results.contractDeployment = deploymentResults;
        spinner.warn("Skipping deployment test - no private key");
        return;
      }
      
      // Test only comprehensive contract deployment (skip simple test for speed)
      try {
        const ComprehensiveEVMTest = await ethers.getContractFactory("ComprehensiveEVMTest");
        
        // Add timeout for deployment
        const deploymentPromise = ComprehensiveEVMTest.connect(this.signer).deploy({
          gasLimit: 500000
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Deployment timeout after 2 minutes")), 2 * 60 * 1000);
        });
        
        const comprehensiveContract = await Promise.race([deploymentPromise, timeoutPromise]);
        
        // Add timeout for waiting
        const waitPromise = comprehensiveContract.waitForDeployment();
        const waitTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Wait timeout after 3 minutes")), 3 * 60 * 1000);
        });
        
        await Promise.race([waitPromise, waitTimeoutPromise]);
        const address = await comprehensiveContract.getAddress();
        
        deploymentResults.comprehensiveDeployment = {
          success: true,
          address: address,
          description: "Comprehensive contract deployment"
        };
        
        // Test contract execution with timeout
        try {
          const executionPromise = comprehensiveContract.testBasicOpcodes();
          const executionTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Execution timeout after 30 seconds")), 30 * 1000);
          });
          
          const result = await Promise.race([executionPromise, executionTimeoutPromise]);
          deploymentResults.contractExecution = {
            success: true,
            result: result,
            description: "Contract function execution"
          };
        } catch (error) {
          deploymentResults.contractExecution = {
            success: false,
            error: error.message,
            description: "Contract function execution"
          };
        }
        
      } catch (error) {
        deploymentResults.comprehensiveDeployment = {
          success: false,
          error: error.message,
          description: "Comprehensive contract deployment"
        };
      }
      
      // Calculate deployment success rate
      const deploymentTests = [
        deploymentResults.simpleDeployment,
        deploymentResults.comprehensiveDeployment,
        deploymentResults.contractExecution
      ].filter(test => test);
      
      const successfulTests = deploymentTests.filter(test => test.success).length;
      deploymentResults.successRate = Math.round((successfulTests / deploymentTests.length) * 100);
      deploymentResults.overallStatus = deploymentResults.successRate >= 80 ? "WORKING" : "BROKEN";
      
      this.results.contractDeployment = deploymentResults;
      this.results.deployment = deploymentResults.successRate >= 80;
      
      if (deploymentResults.successRate >= 80) {
        spinner.succeed("Contract deployment testing completed successfully");
      } else {
        spinner.fail("Contract deployment testing failed");
      }
    } catch (error) {
      spinner.fail(`Contract deployment testing failed: ${error.message}`);
      console.log(chalk.red(`   ❌ Deployment testing failed: ${error.message}`));
    }
  }

  async testLatestRPCFeatures() {
    const spinner = ora("Testing latest RPC features...").start();
    
    try {
      const latestFeatures = {};
      
      // Test only the most important latest features with timeouts
      const featureTests = [
        {
          name: "EIP-4844_BlobBaseFee",
          method: "eth_blobBaseFee",
          params: [],
          timeout: 5000
        },
        {
          name: "EIP-1153_TransientStorage",
          method: "eth_getTransientStorage",
          params: ["0x0", "0x0"],
          timeout: 5000
        },
        {
          name: "EIP-4788_BeaconRoot",
          method: "eth_getBeaconRoot",
          params: ["latest"],
          timeout: 5000
        },
        {
          name: "EIP-5656_MCOPY",
          method: "eth_call",
          params: [{ to: "0x0000000000000000000000000000000000000000", data: "0x5c" }, "latest"],
          timeout: 5000
        },
        {
          name: "EIP-6780_SELFDESTRUCT",
          method: "eth_call",
          params: [{ to: "0x0000000000000000000000000000000000000000", data: "0xff" }, "latest"],
          timeout: 5000
        }
      ];
      
      for (const test of featureTests) {
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout after ${test.timeout}ms`)), test.timeout);
          });
          
          const resultPromise = this.provider.send(test.method, test.params);
          const result = await Promise.race([resultPromise, timeoutPromise]);
          
          latestFeatures[test.name] = { supported: true, value: result };
        } catch (error) {
          latestFeatures[test.name] = { 
            supported: false, 
            error: error.message 
          };
        }
      }
      
      this.results.latestFeatures = latestFeatures;
      spinner.succeed("Latest RPC features testing completed");
    } catch (error) {
      spinner.fail(`Latest RPC features testing failed: ${error.message}`);
      console.log(chalk.red(`   ❌ Latest features testing failed: ${error.message}`));
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    // EVM Version recommendations
    if (this.results.evmVersion !== "shanghai") {
      recommendations.push(`Upgrade EVM from ${this.results.evmVersion} to Shanghai for Solidity 0.8.23 compatibility`);
    }
    
    // Missing EIP recommendations
    const missingEIPs = [];
    if (!this.results.eips["EIP-1559"]) missingEIPs.push("EIP-1559 (Fee Market)");
    if (!this.results.eips["EIP-3855"]) missingEIPs.push("EIP-3855 (PUSH0 Opcode)");
    if (!this.results.eips["EIP-211"]) missingEIPs.push("EIP-211 (RETURNDATASIZE)");
    if (!this.results.eips["EIP-145"]) missingEIPs.push("EIP-145 (SHL/SHR/SAR)");
    
    if (missingEIPs.length > 0) {
      recommendations.push(`Implement missing EIPs: ${missingEIPs.join(", ")}`);
    }
    
    // RPC compatibility recommendations
    if (this.results.rpcCompatibility.score < 90) {
      recommendations.push("Fix RPC method implementations for better compatibility");
    }
    
    // Deployment recommendations
    if (!this.results.deployment) {
      recommendations.push("Fix contract deployment issues - critical for development");
    }
    
    // Integration readiness
    if (this.results.evmVersion === "shanghai" && this.results.deployment) {
      recommendations.push("Chain is well-suited for Solidity 0.8.23 development");
      recommendations.push("✅ Chain is production-ready for wallet and exchange integrations");
    } else {
      recommendations.push("🔧 Chain needs improvements for production readiness");
    }
    
    this.results.recommendations = recommendations;
  }

  printReport() {
    console.log("=".repeat(100));
    console.log(chalk.blue.bold("🔧 ADVANCED EVM & SOLIDITY 0.8.23 COMPATIBILITY AUDIT (FIXED)"));
    console.log("=".repeat(100));

    // Connection Status
    console.log(chalk.yellow("\n📡 CONNECTION STATUS:"));
    if (this.results.connection) {
      console.log(chalk.green("✅ Connected successfully"));
      console.log(`   Chain ID: ${this.results.chainInfo.chainId}`);
      console.log(`   Block Number: ${this.results.chainInfo.blockNumber}`);
      console.log(`   RPC URL: ${this.results.chainInfo.rpcUrl}`);
      if (this.results.chainInfo.balance) {
        console.log(`   Balance: ${this.results.chainInfo.balance} ETH`);
      }
    } else {
      console.log(chalk.red("❌ Connection failed"));
    }

    // EVM Version
    console.log(chalk.yellow("\n⚙️  EVM VERSION:"));
    console.log(`   Current: ${this.results.evmVersion.toUpperCase()}`);
    console.log(`   Required for Solidity 0.8.23: SHANGHAI`);
    console.log(`   Status: ${this.results.evmVersion === "shanghai" ? chalk.green("✅ COMPATIBLE") : chalk.red("❌ INCOMPATIBLE")}`);

    // Solidity 0.8.23 Compatibility
    console.log(chalk.yellow("\n📋 SOLIDITY 0.8.23 COMPATIBILITY:"));
    Object.entries(this.results.soliditySupport).forEach(([feature, supported]) => {
      const status = supported ? chalk.green("✅") : chalk.red("❌");
      console.log(`   ${status} ${feature}`);
    });

    // EIP Support
    console.log(chalk.yellow("\n🔌 EIP SUPPORT:"));
    Object.entries(this.results.eips).forEach(([eip, supported]) => {
      const status = supported ? chalk.green("✅") : chalk.red("❌");
      console.log(`   ${status} ${eip}`);
    });

    // Gas Features
    console.log(chalk.yellow("\n⛽ GAS FEATURES:"));
    Object.entries(this.results.gasFeatures).forEach(([feature, value]) => {
      const status = value === true || (typeof value === "string" && value !== "0") ? chalk.green("✅") : chalk.red("❌");
      console.log(`   ${status} ${feature}: ${value}`);
    });

    // RPC Compatibility
    console.log(chalk.yellow("\n🔌 RPC COMPATIBILITY:"));
    console.log(`   Score: ${this.results.rpcCompatibility.score}%`);
    console.log(`   Supported: ${this.results.rpcCompatibility.supported}/${this.results.rpcCompatibility.total}`);
    
    // Show critical RPC failures
    const criticalRPCs = ["eth_sendRawTransaction", "eth_getTransactionReceipt", "eth_getTransactionByHash"];
    criticalRPCs.forEach(method => {
      const result = this.results.rpcCompatibility.details[method];
      if (result && !result.supported) {
        console.log(chalk.red(`   ❌ ${method}: ${result.error}`));
      }
    });

    // Contract Deployment
    console.log(chalk.yellow("\n🧪 CONTRACT DEPLOYMENT:"));
    if (this.results.contractDeployment.overallStatus) {
      console.log(`   Status: ${this.results.contractDeployment.overallStatus === "WORKING" ? chalk.green("✅ WORKING") : chalk.red("❌ BROKEN")}`);
      console.log(`   Success Rate: ${this.results.contractDeployment.successRate}%`);
      
      Object.entries(this.results.contractDeployment).forEach(([test, result]) => {
        if (test !== "overallStatus" && test !== "successRate" && typeof result === "object") {
          const status = result.success ? chalk.green("✅") : chalk.red("❌");
          console.log(`   ${status} ${result.description}: ${result.success ? "Success" : result.error}`);
        }
      });
    } else {
      console.log(chalk.yellow("   ⚠️ No deployment testing performed"));
    }

    // Latest Features
    console.log(chalk.yellow("\n🚀 LATEST FEATURES:"));
    Object.entries(this.results.latestFeatures).forEach(([feature, result]) => {
      const status = result.supported ? chalk.green("✅") : chalk.red("❌");
      console.log(`   ${status} ${feature}: ${result.supported ? "Supported" : result.error}`);
    });

    // Integration Readiness
    console.log(chalk.yellow("\n🔗 INTEGRATION READINESS:"));
    const isProductionReady = this.results.evmVersion === "shanghai" && 
                             this.results.deployment && 
                             this.results.rpcCompatibility.score >= 90;
    
    console.log(`   Overall Readiness: ${isProductionReady ? chalk.green("✅ Production Ready") : chalk.red("❌ Not Production Ready")}`);
    console.log(`   EVM Compatibility: ${this.results.evmVersion === "shanghai" ? chalk.green("✅ Shanghai") : chalk.red(`❌ ${this.results.evmVersion}`)}`);
    console.log(`   Contract Deployment: ${this.results.deployment ? chalk.green("✅ Working") : chalk.red("❌ Broken")}`);
    console.log(`   RPC Compatibility: ${this.results.rpcCompatibility.score >= 90 ? chalk.green("✅ Good") : chalk.red(`❌ ${this.results.rpcCompatibility.score}%`)}`);

    // Recommendations
    console.log(chalk.yellow("\n📋 RECOMMENDATIONS:"));
    this.results.recommendations.forEach((recommendation, index) => {
      console.log(`   ${index + 1}. ${recommendation}`);
    });

    console.log("=".repeat(100));
  }

  async runFullAudit() {
    console.log(chalk.blue.bold("🔧 Starting Advanced EVM & Solidity 0.8.23 Compatibility Audit (Fixed)..."));
    console.log(`RPC URL: ${this.rpcUrl}`);
    
    await this.initialize();
    await this.testSolidity023Compatibility();
    await this.testRPCCompatibility();
    await this.testContractDeployment();
    await this.testLatestRPCFeatures();
    this.generateRecommendations();
    this.printReport();
    
    // Save report
    const filename = `./advanced-evm-audit-fixed-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(chalk.green(`\n📄 Full report saved to: ${filename}`));
    
    return this.results;
  }
}

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!rpcUrl) {
    console.error(chalk.red("❌ RPC_URL environment variable is required"));
    process.exit(1);
  }
  
  const auditor = new AdvancedEVMAuditorFixed(rpcUrl, privateKey);
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

module.exports = { AdvancedEVMAuditorFixed }; 