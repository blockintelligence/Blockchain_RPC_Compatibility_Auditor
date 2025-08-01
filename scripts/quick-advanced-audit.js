require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

class QuickAdvancedAuditor {
  constructor(rpcUrl, privateKey = null) {
    this.rpcUrl = rpcUrl;
    this.privateKey = privateKey;
    this.provider = null;
    this.signer = null;
    this.results = {
      connection: false,
      evmVersion: "unknown",
      criticalEIPs: {},
      rpcCompatibility: {},
      deploymentTest: false,
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

  async testCriticalEIPs() {
    console.log(chalk.yellow("🔍 Testing critical EIPs for Solidity 0.8.23..."));
    
    try {
      // Test EIP-1559 (Base Fee) - check block for baseFeePerGas
      try {
        const block = await this.provider.getBlock("latest");
        const hasBaseFee = block.baseFeePerGas !== undefined && block.baseFeePerGas > 0;
        this.results.criticalEIPs["EIP-1559"] = hasBaseFee;
      } catch (error) {
        this.results.criticalEIPs["EIP-1559"] = false;
      }
      
      // Test EIP-3855 (PUSH0 opcode) - Critical for Shanghai
      try {
        const push0Test = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x5f" // PUSH0 opcode
        }, "latest"]);
        this.results.criticalEIPs["EIP-3855"] = true;
      } catch (error) {
        this.results.criticalEIPs["EIP-3855"] = false;
      }
      
      // Test EIP-1344 (Chain ID)
      try {
        const chainId = await this.provider.send("eth_chainId", []);
        this.results.criticalEIPs["EIP-1344"] = parseInt(chainId, 16) > 0;
      } catch (error) {
        this.results.criticalEIPs["EIP-1344"] = false;
      }
      
      // Test EIP-3198 (BASEFEE opcode)
      try {
        const basefeeTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x48" // BASEFEE opcode
        }, "latest"]);
        this.results.criticalEIPs["EIP-3198"] = true;
      } catch (error) {
        this.results.criticalEIPs["EIP-3198"] = false;
      }
      
      // Determine EVM version
      this.results.evmVersion = this.determineEVMVersion();
      
    } catch (error) {
      console.log(chalk.red(`   ❌ Critical EIP testing failed: ${error.message}`));
    }
  }

  determineEVMVersion() {
    const eips = this.results.criticalEIPs;
    
    // Check for Shanghai features - PUSH0 (EIP-3855) is the key Shanghai feature
    if (eips["EIP-3855"]) {
      return "shanghai";
    }
    
    // Check for London features (EIP-1559, EIP-3198)
    if (eips["EIP-1559"] && eips["EIP-3198"]) {
      return "london";
    }
    
    // Check for Istanbul features (EIP-1344)
    if (eips["EIP-1344"]) {
      return "istanbul";
    }
    
    return "unknown";
  }

  async testCriticalRPC() {
    console.log(chalk.yellow("🔌 Testing critical RPC methods..."));
    
    try {
      const criticalRPCs = [
        "eth_chainId",
        "eth_blockNumber", 
        "eth_getBalance",
        "eth_gasPrice",
        "eth_estimateGas",
        "eth_call",
        "eth_sendRawTransaction",
        "eth_getTransactionReceipt"
      ];
      
      const rpcResults = {};
      let supportedMethods = 0;
      
      for (const method of criticalRPCs) {
        try {
          let params = [];
          if (method === "eth_getBalance") {
            params = ["0x0000000000000000000000000000000000000000", "latest"];
          } else if (method === "eth_estimateGas") {
            params = [{ to: "0x0000000000000000000000000000000000000000", data: "0x" }];
          } else if (method === "eth_call") {
            params = [{ to: "0x0000000000000000000000000000000000000000", data: "0x" }, "latest"];
          } else if (method === "eth_sendRawTransaction") {
            params = ["0x"]; // Will fail but test if method exists
          } else if (method === "eth_getTransactionReceipt") {
            params = ["0x0000000000000000000000000000000000000000000000000000000000000000"];
          }
          
          const result = await this.provider.send(method, params);
          rpcResults[method] = { supported: true };
          supportedMethods++;
        } catch (error) {
          rpcResults[method] = { supported: false, error: error.message };
        }
      }
      
      this.results.rpcCompatibility = {
        score: Math.round((supportedMethods / criticalRPCs.length) * 100),
        supported: supportedMethods,
        total: criticalRPCs.length,
        details: rpcResults
      };
      
    } catch (error) {
      console.log(chalk.red(`   ❌ RPC testing failed: ${error.message}`));
    }
  }

  async testQuickDeployment() {
    console.log(chalk.yellow("🧪 Quick deployment test..."));
    
    if (!this.signer) {
      console.log(chalk.yellow("   ⚠️ No private key - skipping deployment test"));
      return;
    }
    
    try {
      // Just try to compile and estimate gas for deployment (don't actually deploy)
      const ComprehensiveEVMTest = await ethers.getContractFactory("ComprehensiveEVMTest");
      const deploymentData = ComprehensiveEVMTest.interface.encodeDeploy();
      
      const gasEstimate = await this.provider.send("eth_estimateGas", [{
        from: this.signer.address,
        data: deploymentData
      }]);
      
      this.results.deploymentTest = {
        success: true,
        gasEstimate: gasEstimate,
        description: "Gas estimation successful"
      };
      
    } catch (error) {
      this.results.deploymentTest = {
        success: false,
        error: error.message,
        description: "Gas estimation failed"
      };
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    // EVM Version recommendations
    if (this.results.evmVersion !== "shanghai") {
      recommendations.push(`❌ Upgrade EVM from ${this.results.evmVersion} to Shanghai for Solidity 0.8.23`);
    } else {
      recommendations.push(`✅ EVM is Shanghai compatible`);
    }
    
    // Missing EIP recommendations
    if (!this.results.criticalEIPs["EIP-1559"]) {
      recommendations.push("❌ Missing EIP-1559 (Fee Market)");
    }
    if (!this.results.criticalEIPs["EIP-3855"]) {
      recommendations.push("❌ Missing EIP-3855 (PUSH0 Opcode) - Critical for Shanghai");
    }
    
    // RPC compatibility
    if (this.results.rpcCompatibility.score < 80) {
      recommendations.push("❌ RPC compatibility issues detected");
    } else {
      recommendations.push("✅ RPC compatibility looks good");
    }
    
    // Deployment
    if (this.results.deploymentTest && !this.results.deploymentTest.success) {
      recommendations.push("❌ Contract deployment issues detected");
    } else if (this.results.deploymentTest && this.results.deploymentTest.success) {
      recommendations.push("✅ Contract deployment should work");
    }
    
    // Overall assessment
    const isCompatible = this.results.evmVersion === "shanghai" && 
                        this.results.criticalEIPs["EIP-1559"] && 
                        this.results.criticalEIPs["EIP-3855"] &&
                        this.results.rpcCompatibility.score >= 80;
    
    if (isCompatible) {
      recommendations.push("🎉 Chain is compatible with Solidity 0.8.23");
    } else {
      recommendations.push("⚠️ Chain needs upgrades for Solidity 0.8.23 compatibility");
    }
    
    this.results.recommendations = recommendations;
  }

  printReport() {
    console.log("=".repeat(80));
    console.log(chalk.blue.bold("⚡ QUICK ADVANCED EVM & SOLIDITY 0.8.23 COMPATIBILITY AUDIT"));
    console.log("=".repeat(80));

    // Connection Status
    console.log(chalk.yellow("\n📡 CONNECTION STATUS:"));
    if (this.results.connection) {
      console.log(chalk.green("✅ Connected successfully"));
      console.log(`   Chain ID: ${this.results.chainInfo.chainId}`);
      console.log(`   Block Number: ${this.results.chainInfo.blockNumber}`);
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

    // Critical EIP Support
    console.log(chalk.yellow("\n🔌 CRITICAL EIP SUPPORT:"));
    Object.entries(this.results.criticalEIPs).forEach(([eip, supported]) => {
      const status = supported ? chalk.green("✅") : chalk.red("❌");
      console.log(`   ${status} ${eip}`);
    });

    // RPC Compatibility
    console.log(chalk.yellow("\n🔌 RPC COMPATIBILITY:"));
    console.log(`   Score: ${this.results.rpcCompatibility.score}%`);
    console.log(`   Supported: ${this.results.rpcCompatibility.supported}/${this.results.rpcCompatibility.total}`);
    
    // Show critical RPC failures
    const criticalRPCs = ["eth_sendRawTransaction", "eth_getTransactionReceipt"];
    criticalRPCs.forEach(method => {
      const result = this.results.rpcCompatibility.details[method];
      if (result && !result.supported) {
        console.log(chalk.red(`   ❌ ${method}: ${result.error}`));
      }
    });

    // Deployment Test
    console.log(chalk.yellow("\n🧪 DEPLOYMENT TEST:"));
    if (this.results.deploymentTest) {
      const status = this.results.deploymentTest.success ? chalk.green("✅") : chalk.red("❌");
      console.log(`   ${status} ${this.results.deploymentTest.description}`);
      if (this.results.deploymentTest.success) {
        console.log(`   Gas Estimate: ${this.results.deploymentTest.gasEstimate}`);
      } else {
        console.log(`   Error: ${this.results.deploymentTest.error}`);
      }
    } else {
      console.log(chalk.yellow("   ⚠️ No deployment test performed"));
    }

    // Quick Assessment
    console.log(chalk.yellow("\n📋 QUICK ASSESSMENT:"));
    const isCompatible = this.results.evmVersion === "shanghai" && 
                        this.results.criticalEIPs["EIP-1559"] && 
                        this.results.criticalEIPs["EIP-3855"] &&
                        this.results.rpcCompatibility.score >= 80;
    
    console.log(`   Solidity 0.8.23 Compatible: ${isCompatible ? chalk.green("✅ YES") : chalk.red("❌ NO")}`);
    console.log(`   Production Ready: ${isCompatible ? chalk.green("✅ YES") : chalk.red("❌ NO")}`);

    // Recommendations
    console.log(chalk.yellow("\n📋 RECOMMENDATIONS:"));
    this.results.recommendations.forEach((recommendation, index) => {
      console.log(`   ${index + 1}. ${recommendation}`);
    });

    console.log("=".repeat(80));
  }

  async runQuickAudit() {
    console.log(chalk.blue.bold("⚡ Starting Quick Advanced EVM & Solidity 0.8.23 Compatibility Audit..."));
    console.log(`RPC URL: ${this.rpcUrl}`);
    
    await this.initialize();
    await this.testCriticalEIPs();
    await this.testCriticalRPC();
    await this.testQuickDeployment();
    this.generateRecommendations();
    this.printReport();
    
    // Save report
    const filename = `./quick-advanced-audit-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(chalk.green(`\n📄 Quick report saved to: ${filename}`));
    
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
  
  const auditor = new QuickAdvancedAuditor(rpcUrl, privateKey);
  await auditor.runQuickAudit();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { QuickAdvancedAuditor }; 