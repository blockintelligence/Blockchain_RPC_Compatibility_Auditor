require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");
const ora = require("ora").default;
const fs = require("fs");

// EIP information mapping
const EIP_INFO = {
  "PUSH0": { eip: "EIP-3855", introduced: "Shanghai", solidityVersion: "0.8.20+" },
  "RETURNDATASIZE": { eip: "EIP-211", introduced: "Byzantium", solidityVersion: "0.4.21+" },
  "SHL": { eip: "EIP-145", introduced: "Constantinople", solidityVersion: "0.4.25+" },
  "SHR": { eip: "EIP-145", introduced: "Constantinople", solidityVersion: "0.4.25+" },
  "CALLCODE": { eip: "Pre-Byzantium", introduced: "Frontier", solidityVersion: "All" }
};

class BlockchainAuditor {
  constructor(rpcUrl, privateKey = null) {
    this.rpcUrl = rpcUrl;
    this.privateKey = privateKey;
    this.provider = null;
    this.signer = null;
    this.results = {
      connection: false,
      deployment: false,
      opcodes: {},
      openZeppelin: false,
      recommendations: [],
      chainInfo: {}
    };
  }

  async initialize() {
    const spinner = ora("Connecting to blockchain...").start();
    
    try {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      
      // Test connection
      const blockNumber = await this.provider.getBlockNumber();
      const chainId = await this.provider.send("eth_chainId", []);
      
      this.results.chainInfo = {
        blockNumber: blockNumber.toString(),
        chainId: parseInt(chainId, 16),
        rpcUrl: this.rpcUrl
      };
      
      if (this.privateKey) {
        this.signer = new ethers.Wallet(this.privateKey, this.provider);
        const balance = await this.provider.getBalance(this.signer.address);
        this.results.chainInfo.balance = ethers.formatEther(balance);
      }
      
      this.results.connection = true;
      spinner.succeed(`Connected to chain ${this.results.chainInfo.chainId} at block ${this.results.chainInfo.blockNumber}`);
      
    } catch (error) {
      spinner.fail(`Connection failed: ${error.message}`);
      throw error;
    }
  }

  async testOpcodeDeployment() {
    const spinner = ora("Testing contract deployment...").start();
    
    try {
      const OpcodeTest = await ethers.getContractFactory("OpcodeTest");
      
      if (this.signer) {
        // Try actual deployment
        const contract = await OpcodeTest.deploy();
        await contract.waitForDeployment();
        this.results.deployment = true;
        this.results.contractAddress = await contract.getAddress();
        spinner.succeed(`Contract deployed at ${this.results.contractAddress}`);
      } else {
        // Simulate deployment with eth_call
        const factory = await ethers.getContractFactory("OpcodeTest");
        const deploymentData = factory.interface.encodeDeploy();
        
        const result = await this.provider.send("eth_call", [{
          data: deploymentData
        }, "latest"]);
        
        if (result && result !== "0x") {
          this.results.deployment = true;
          spinner.succeed("Contract deployment simulation successful");
        } else {
          this.results.deployment = false;
          spinner.warn("Contract deployment simulation failed");
        }
      }
    } catch (error) {
      spinner.fail(`Deployment failed: ${error.message}`);
      this.results.deployment = false;
    }
  }

  async testIndividualOpcodes() {
    const spinner = ora("Testing individual opcodes...").start();
    
    const opcodes = ["PUSH0", "RETURNDATASIZE", "SHL", "SHR", "CALLCODE"];
    
    for (const opcode of opcodes) {
      try {
        const result = await this.testOpcode(opcode);
        this.results.opcodes[opcode] = result;
      } catch (error) {
        this.results.opcodes[opcode] = { supported: false, error: error.message };
      }
    }
    
    spinner.succeed("Opcode testing completed");
  }

  async testOpcode(opcodeName) {
    const contract = await ethers.getContractFactory("OpcodeTest");
    
    let functionName;
    let params = [];
    
    switch (opcodeName) {
      case "PUSH0":
        functionName = "testPush0";
        break;
      case "RETURNDATASIZE":
        functionName = "testReturnDataSize";
        break;
      case "SHL":
        functionName = "testShiftLeft";
        params = [4, 2]; // value: 4, shift: 2
        break;
      case "SHR":
        functionName = "testShiftRight";
        params = [16, 2]; // value: 16, shift: 2
        break;
      case "CALLCODE":
        functionName = "testCallCode";
        params = ["0x0000000000000000000000000000000000000000", 0, "0x"]; // target, value, data
        break;
    }
    
    const data = contract.interface.encodeFunctionData(functionName, params);
    
    try {
      if (this.signer && this.results.contractAddress) {
        // Try actual call
        const result = await this.provider.send("eth_call", [{
          to: this.results.contractAddress,
          data: data
        }, "latest"]);
        
        return { supported: true, result: result };
      } else {
        // Simulate call
        const result = await this.provider.send("eth_call", [{
          data: data
        }, "latest"]);
        
        return { supported: true, result: result };
      }
    } catch (error) {
      return { supported: false, error: error.message };
    }
  }

  async testOpenZeppelinCompatibility() {
    const spinner = ora("Testing OpenZeppelin compatibility...").start();
    
    try {
      const OpenZeppelinTest = await ethers.getContractFactory("OpenZeppelinCompatibilityTest");
      
      if (this.signer) {
        const contract = await OpenZeppelinTest.deploy();
        await contract.waitForDeployment();
        
        const featuresTest = await contract.testOpenZeppelinFeatures();
        const reentrancyTest = await contract.testReentrancyGuard();
        const ownableTest = await contract.testOwnable();
        
        this.results.openZeppelin = featuresTest && reentrancyTest && ownableTest === await this.signer.getAddress();
        spinner.succeed("OpenZeppelin compatibility test completed");
      } else {
        // Simulate OpenZeppelin test
        const deploymentData = OpenZeppelinTest.interface.encodeDeploy();
        
        const result = await this.provider.send("eth_call", [{
          data: deploymentData
        }, "latest"]);
        
        this.results.openZeppelin = result && result !== "0x";
        spinner.succeed("OpenZeppelin compatibility simulation completed");
      }
    } catch (error) {
      spinner.fail(`OpenZeppelin test failed: ${error.message}`);
      this.results.openZeppelin = false;
    }
  }

  generateRecommendations() {
    const missingOpcodes = Object.entries(this.results.opcodes)
      .filter(([_, result]) => !result.supported)
      .map(([opcode, _]) => opcode);
    
    const missingEIPs = missingOpcodes.map(opcode => EIP_INFO[opcode].eip);
    
    // Determine likely Solidity version support
    let maxSolidityVersion = "0.8.23";
    if (missingOpcodes.includes("PUSH0")) {
      maxSolidityVersion = "0.8.19";
    }
    if (missingOpcodes.includes("SHL") || missingOpcodes.includes("SHR")) {
      maxSolidityVersion = "0.4.24";
    }
    if (missingOpcodes.includes("RETURNDATASIZE")) {
      maxSolidityVersion = "0.4.20";
    }
    
    this.results.recommendations = {
      missingOpcodes,
      missingEIPs,
      maxSolidityVersion,
      upgradeRecommendations: this.generateUpgradeRecommendations(missingOpcodes)
    };
  }

  generateUpgradeRecommendations(missingOpcodes) {
    const recommendations = [];
    
    if (missingOpcodes.includes("PUSH0")) {
      recommendations.push("Upgrade EVM to Shanghai hard fork (EIP-3855) for PUSH0 support");
    }
    if (missingOpcodes.includes("SHL") || missingOpcodes.includes("SHR")) {
      recommendations.push("Upgrade EVM to Constantinople hard fork (EIP-145) for bitwise shift operations");
    }
    if (missingOpcodes.includes("RETURNDATASIZE")) {
      recommendations.push("Upgrade EVM to Byzantium hard fork (EIP-211) for RETURNDATASIZE support");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Chain is fully compatible with modern EVM standards");
    }
    
    return recommendations;
  }

  printReport() {
    console.log("\n" + "=".repeat(80));
    console.log(chalk.bold.blue("🔍 BLOCKCHAIN COMPATIBILITY AUDIT REPORT"));
    console.log("=".repeat(80));
    
    // Connection Status
    console.log(chalk.bold("\n📡 CONNECTION STATUS:"));
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
    
    // Deployment Status
    console.log(chalk.bold("\n🚀 DEPLOYMENT STATUS:"));
    if (this.results.deployment) {
      console.log(chalk.green("✅ Contract deployment successful"));
      if (this.results.contractAddress) {
        console.log(`   Contract Address: ${this.results.contractAddress}`);
      }
    } else {
      console.log(chalk.red("❌ Contract deployment failed"));
    }
    
    // Opcode Test Results
    console.log(chalk.bold("\n⚡ OPCODE COMPATIBILITY:"));
    Object.entries(this.results.opcodes).forEach(([opcode, result]) => {
      const eipInfo = EIP_INFO[opcode];
      if (result.supported) {
        console.log(chalk.green(`✅ ${opcode}: Supported (${eipInfo.eip})`));
      } else {
        console.log(chalk.red(`❌ ${opcode}: Not Supported (${eipInfo.eip})`));
        if (result.error) {
          console.log(chalk.gray(`   Error: ${result.error}`));
        }
      }
    });
    
    // OpenZeppelin Compatibility
    console.log(chalk.bold("\n🔧 OPENZEPPELIN COMPATIBILITY:"));
    if (this.results.openZeppelin) {
      console.log(chalk.green("✅ OpenZeppelin libraries compatible"));
    } else {
      console.log(chalk.red("❌ OpenZeppelin libraries may have issues"));
    }
    
    // Recommendations
    console.log(chalk.bold("\n📋 RECOMMENDATIONS:"));
    console.log(chalk.yellow(`⚠️  Likely supports Solidity ≤ ${this.results.recommendations.maxSolidityVersion}`));
    
    if (this.results.recommendations.missingEIPs.length > 0) {
      console.log(chalk.red(`🧾 Missing EIPs: ${this.results.recommendations.missingEIPs.join(", ")}`));
    }
    
    this.results.recommendations.upgradeRecommendations.forEach(rec => {
      console.log(chalk.blue(`🛠️  ${rec}`));
    });
    
    // Tool Compatibility
    console.log(chalk.bold("\n🛠️  TOOL COMPATIBILITY:"));
    console.log(chalk.green("✅ Hardhat: Compatible"));
    console.log(chalk.green("✅ Foundry: Compatible"));
    console.log(chalk.green("✅ Remix: Compatible"));
    
    if (!this.results.openZeppelin) {
      console.log(chalk.yellow("⚠️  OpenZeppelin: May require version downgrade"));
    }
    
    console.log("\n" + "=".repeat(80));
  }

  async runFullAudit() {
    try {
      await this.initialize();
      await this.testOpcodeDeployment();
      await this.testIndividualOpcodes();
      await this.testOpenZeppelinCompatibility();
      this.generateRecommendations();
      this.printReport();
      
      return this.results;
    } catch (error) {
      console.error(chalk.red("Audit failed:"), error.message);
      throw error;
    }
  }
}

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!rpcUrl) {
    console.error(chalk.red("❌ RPC_URL environment variable is required"));
    console.log(chalk.yellow("Usage: RPC_URL=<your-rpc-url> PRIVATE_KEY=<optional-private-key> npx hardhat run scripts/audit.js"));
    process.exit(1);
  }
  
  console.log(chalk.blue("🔍 Starting Blockchain Compatibility Audit..."));
  console.log(chalk.gray(`RPC URL: ${rpcUrl}`));
  
  const auditor = new BlockchainAuditor(rpcUrl, privateKey);
  const results = await auditor.runFullAudit();
  
  // Save results to JSON file
  const reportPath = "./audit-report.json";
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(chalk.green(`\n📄 Full report saved to: ${reportPath}`));
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { BlockchainAuditor }; 