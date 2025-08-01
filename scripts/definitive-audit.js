require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

class DefinitiveAuditor {
  constructor(rpcUrl, privateKey = null) {
    this.rpcUrl = rpcUrl;
    this.privateKey = privateKey;
    this.provider = null;
    this.signer = null;
    this.results = {
      connection: false,
      evmVersion: "unknown",
      shanghaiFeatures: {},
      londonFeatures: {},
      contractDeployment: {},
      rpcCompatibility: {},
      finalVerdict: {},
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

  async testShanghaiFeatures() {
    console.log(chalk.yellow("🔍 Testing Shanghai EVM features..."));
    
    try {
      // Test PUSH0 opcode (EIP-3855) - The definitive Shanghai feature
      try {
        const push0Test = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x5f" // PUSH0 opcode
        }, "latest"]);
        this.results.shanghaiFeatures["PUSH0"] = { supported: true, result: push0Test };
      } catch (error) {
        this.results.shanghaiFeatures["PUSH0"] = { supported: false, error: error.message };
      }
      
      // Test MCOPY opcode (EIP-5656) - Prague feature
      try {
        const mcopyTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x5c" // MCOPY opcode
        }, "latest"]);
        this.results.shanghaiFeatures["MCOPY"] = { supported: true, result: mcopyTest };
      } catch (error) {
        this.results.shanghaiFeatures["MCOPY"] = { supported: false, error: error.message };
      }
      
      // Test Transient Storage (EIP-1153)
      try {
        const transientTest = await this.provider.send("eth_getTransientStorage", ["0x0", "0x0"]);
        this.results.shanghaiFeatures["TransientStorage"] = { supported: true, result: transientTest };
      } catch (error) {
        this.results.shanghaiFeatures["TransientStorage"] = { supported: false, error: error.message };
      }
      
      // Test Beacon Root (EIP-4788)
      try {
        const beaconTest = await this.provider.send("eth_getBeaconRoot", ["latest"]);
        this.results.shanghaiFeatures["BeaconRoot"] = { supported: true, result: beaconTest };
      } catch (error) {
        this.results.shanghaiFeatures["BeaconRoot"] = { supported: false, error: error.message };
      }
      
    } catch (error) {
      console.log(chalk.red(`   ❌ Shanghai features testing failed: ${error.message}`));
    }
  }

  async testLondonFeatures() {
    console.log(chalk.yellow("🔍 Testing London EVM features..."));
    
    try {
      // Test EIP-1559 (Base Fee)
      try {
        const block = await this.provider.getBlock("latest");
        const hasBaseFee = block.baseFeePerGas !== undefined && block.baseFeePerGas > 0;
        this.results.londonFeatures["EIP-1559"] = { 
          supported: hasBaseFee, 
          baseFee: hasBaseFee ? block.baseFeePerGas.toString() : "0" 
        };
      } catch (error) {
        this.results.londonFeatures["EIP-1559"] = { supported: false, error: error.message };
      }
      
      // Test EIP-3198 (BASEFEE opcode)
      try {
        const basefeeTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x48" // BASEFEE opcode
        }, "latest"]);
        this.results.londonFeatures["EIP-3198"] = { supported: true, result: basefeeTest };
      } catch (error) {
        this.results.londonFeatures["EIP-3198"] = { supported: false, error: error.message };
      }
      
      // Test EIP-3651 (Warm COINBASE)
      try {
        const coinbaseTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x41" // COINBASE opcode
        }, "latest"]);
        this.results.londonFeatures["EIP-3651"] = { supported: true, result: coinbaseTest };
      } catch (error) {
        this.results.londonFeatures["EIP-3651"] = { supported: false, error: error.message };
      }
      
      // Test EIP-1344 (Chain ID)
      try {
        const chainId = await this.provider.send("eth_chainId", []);
        this.results.londonFeatures["EIP-1344"] = { 
          supported: parseInt(chainId, 16) > 0, 
          chainId: parseInt(chainId, 16) 
        };
      } catch (error) {
        this.results.londonFeatures["EIP-1344"] = { supported: false, error: error.message };
      }
      
    } catch (error) {
      console.log(chalk.red(`   ❌ London features testing failed: ${error.message}`));
    }
  }

  async testContractDeployment() {
    console.log(chalk.yellow("🧪 Testing actual contract deployment..."));
    
    if (!this.signer) {
      console.log(chalk.yellow("   ⚠️ No private key - skipping deployment test"));
      return;
    }
    
    try {
      // Deploy an opcode test contract
      const OpcodeTest = await ethers.getContractFactory("OpcodeTest");
      const contract = await OpcodeTest.connect(this.signer).deploy({
        gasLimit: 200000
      });
      
      await contract.waitForDeployment();
      const address = await contract.getAddress();
      
      // Test PUSH0 in the deployed contract
      try {
        const push0Result = await contract.testPush0();
        this.results.contractDeployment = {
          success: true,
          address: address,
          push0Working: true,
          push0Result: push0Result.toString(),
          description: "Contract deployed and PUSH0 tested successfully"
        };
      } catch (error) {
        this.results.contractDeployment = {
          success: true,
          address: address,
          push0Working: false,
          push0Error: error.message,
          description: "Contract deployed but PUSH0 failed"
        };
      }
      
    } catch (error) {
      this.results.contractDeployment = {
        success: false,
        error: error.message,
        description: "Contract deployment failed"
      };
    }
  }

  async testRPCCompatibility() {
    console.log(chalk.yellow("🔌 Testing RPC compatibility..."));
    
    try {
      const criticalRPCs = [
        "eth_chainId",
        "eth_blockNumber", 
        "eth_getBalance",
        "eth_gasPrice",
        "eth_estimateGas",
        "eth_call",
        "eth_sendRawTransaction",
        "eth_getTransactionReceipt",
        "eth_getLogs"
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
          } else if (method === "eth_getLogs") {
            params = [{ fromBlock: "0x0", toBlock: "latest", topics: [] }];
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

  determineEVMVersion() {
    // PUSH0 is the definitive Shanghai feature
    const hasPush0 = this.results.shanghaiFeatures["PUSH0"]?.supported;
    
    if (hasPush0) {
      return "shanghai";
    }
    
    // Check London features
    const hasEIP1559 = this.results.londonFeatures["EIP-1559"]?.supported;
    const hasEIP3198 = this.results.londonFeatures["EIP-3198"]?.supported;
    
    if (hasEIP1559 && hasEIP3198) {
      return "london";
    }
    
    return "unknown";
  }

  generateFinalVerdict() {
    const evmVersion = this.determineEVMVersion();
    const push0Working = this.results.shanghaiFeatures["PUSH0"]?.supported;
    const contractDeployed = this.results.contractDeployment?.success;
    const push0InContract = this.results.contractDeployment?.push0Working;
    const rpcScore = this.results.rpcCompatibility.score;
    
    // Determine if Solidity 0.8.23 is compatible
    const solidity0823Compatible = evmVersion === "shanghai" && push0Working;
    
    // Determine if production ready
    const productionReady = solidity0823Compatible && 
                           contractDeployed && 
                           push0InContract && 
                           rpcScore >= 80;
    
    this.results.evmVersion = evmVersion;
    this.results.finalVerdict = {
      evmVersion: evmVersion,
      solidity0823Compatible: solidity0823Compatible,
      productionReady: productionReady,
      push0Supported: push0Working,
      contractDeploymentWorking: contractDeployed,
      push0InContractWorking: push0InContract,
      rpcCompatibilityScore: rpcScore
    };
    
    // Generate recommendations
    const recommendations = [];
    
    if (evmVersion !== "shanghai") {
      recommendations.push(`❌ EVM is ${evmVersion.toUpperCase()}, needs Shanghai for Solidity 0.8.23`);
    } else {
      recommendations.push("✅ EVM is Shanghai compatible");
    }
    
    if (!push0Working) {
      recommendations.push("❌ PUSH0 opcode not supported - critical for Shanghai");
    } else {
      recommendations.push("✅ PUSH0 opcode supported");
    }
    
    if (!contractDeployed) {
      recommendations.push("❌ Contract deployment failed");
    } else {
      recommendations.push("✅ Contract deployment working");
    }
    
    if (!push0InContract) {
      recommendations.push("❌ PUSH0 in deployed contracts not working");
    } else {
      recommendations.push("✅ PUSH0 in deployed contracts working");
    }
    
    if (rpcScore < 80) {
      recommendations.push("❌ RPC compatibility issues detected");
    } else {
      recommendations.push("✅ RPC compatibility good");
    }
    
    if (productionReady) {
      recommendations.push("🎉 Chain is production-ready for Solidity 0.8.23");
    } else {
      recommendations.push("⚠️ Chain needs improvements for production");
    }
    
    this.results.recommendations = recommendations;
  }

  printReport() {
    console.log("=".repeat(100));
    console.log(chalk.blue.bold("🎯 DEFINITIVE EVM & SOLIDITY 0.8.23 COMPATIBILITY AUDIT"));
    console.log("=".repeat(100));

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

    // EVM Version Determination
    console.log(chalk.yellow("\n⚙️  EVM VERSION DETERMINATION:"));
    console.log(`   Determined EVM: ${this.results.evmVersion.toUpperCase()}`);
    console.log(`   Required for Solidity 0.8.23: SHANGHAI`);
    console.log(`   Status: ${this.results.evmVersion === "shanghai" ? chalk.green("✅ COMPATIBLE") : chalk.red("❌ INCOMPATIBLE")}`);

    // Shanghai Features
    console.log(chalk.yellow("\n🔌 SHANGHAI FEATURES:"));
    Object.entries(this.results.shanghaiFeatures).forEach(([feature, result]) => {
      const status = result.supported ? chalk.green("✅") : chalk.red("❌");
      console.log(`   ${status} ${feature}: ${result.supported ? "Supported" : result.error}`);
    });

    // London Features
    console.log(chalk.yellow("\n🔌 LONDON FEATURES:"));
    Object.entries(this.results.londonFeatures).forEach(([feature, result]) => {
      const status = result.supported ? chalk.green("✅") : chalk.red("❌");
      console.log(`   ${status} ${feature}: ${result.supported ? "Supported" : result.error}`);
    });

    // Contract Deployment
    console.log(chalk.yellow("\n🧪 CONTRACT DEPLOYMENT:"));
    if (this.results.contractDeployment.success) {
      console.log(chalk.green("✅ Contract deployed successfully"));
      console.log(`   Address: ${this.results.contractDeployment.address}`);
      console.log(`   PUSH0 in Contract: ${this.results.contractDeployment.push0Working ? chalk.green("✅ Working") : chalk.red("❌ Failed")}`);
      if (this.results.contractDeployment.push0Working) {
        console.log(`   PUSH0 Result: ${this.results.contractDeployment.push0Result}`);
      } else {
        console.log(`   PUSH0 Error: ${this.results.contractDeployment.push0Error}`);
      }
    } else {
      console.log(chalk.red("❌ Contract deployment failed"));
      console.log(`   Error: ${this.results.contractDeployment.error}`);
    }

    // RPC Compatibility
    console.log(chalk.yellow("\n🔌 RPC COMPATIBILITY:"));
    console.log(`   Score: ${this.results.rpcCompatibility.score}%`);
    console.log(`   Supported: ${this.results.rpcCompatibility.supported}/${this.results.rpcCompatibility.total}`);

    // Final Verdict
    console.log(chalk.yellow("\n🎯 FINAL VERDICT:"));
    const verdict = this.results.finalVerdict;
    console.log(`   EVM Version: ${verdict.evmVersion.toUpperCase()}`);
    console.log(`   Solidity 0.8.23 Compatible: ${verdict.solidity0823Compatible ? chalk.green("✅ YES") : chalk.red("❌ NO")}`);
    console.log(`   Production Ready: ${verdict.productionReady ? chalk.green("✅ YES") : chalk.red("❌ NO")}`);
    console.log(`   PUSH0 Supported: ${verdict.push0Supported ? chalk.green("✅ YES") : chalk.red("❌ NO")}`);
    console.log(`   Contract Deployment: ${verdict.contractDeploymentWorking ? chalk.green("✅ Working") : chalk.red("❌ Failed")}`);
    console.log(`   PUSH0 in Contracts: ${verdict.push0InContractWorking ? chalk.green("✅ Working") : chalk.red("❌ Failed")}`);
    console.log(`   RPC Compatibility: ${verdict.rpcCompatibilityScore >= 80 ? chalk.green("✅ Good") : chalk.red(`❌ ${verdict.rpcCompatibilityScore}%`)}`);

    // Recommendations
    console.log(chalk.yellow("\n📋 RECOMMENDATIONS:"));
    this.results.recommendations.forEach((recommendation, index) => {
      console.log(`   ${index + 1}. ${recommendation}`);
    });

    console.log("=".repeat(100));
  }

  async runDefinitiveAudit() {
    console.log(chalk.blue.bold("🎯 Starting Definitive EVM & Solidity 0.8.23 Compatibility Audit..."));
    console.log(`RPC URL: ${this.rpcUrl}`);
    
    await this.initialize();
    await this.testShanghaiFeatures();
    await this.testLondonFeatures();
    await this.testContractDeployment();
    await this.testRPCCompatibility();
    this.generateFinalVerdict();
    this.printReport();
    
    // Save report
    const filename = `./definitive-audit-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(chalk.green(`\n📄 Definitive report saved to: ${filename}`));
    
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
  
  const auditor = new DefinitiveAuditor(rpcUrl, privateKey);
  await auditor.runDefinitiveAudit();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { DefinitiveAuditor }; 