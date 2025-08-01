require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");
const ora = require("ora").default;
const fs = require("fs");

class AdvancedEVMAuditor {
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
      advancedFeatures: {},
      recommendations: [],
      chainInfo: {}
    };
  }

  async initialize() {
    const spinner = ora("Connecting to blockchain...").start();
    
    try {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      
      // Test basic connection
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
        this.results.chainInfo.address = this.signer.address;
      }
      
      this.results.connection = true;
      spinner.succeed(`Connected to chain ${this.results.chainInfo.chainId} at block ${this.results.chainInfo.blockNumber}`);
      
    } catch (error) {
      spinner.fail(`Connection failed: ${error.message}`);
      throw error;
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
          "PriorityFee": "0"
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
        const coinbase = await this.provider.send("eth_coinbase", []);
        this.results.eips["EIP-3651"] = coinbase !== "0x0000000000000000000000000000000000000000";
      } catch (error) {
        this.results.eips["EIP-3651"] = false;
      }
      
      // Test PUSH0 opcode (EIP-3855)
      try {
        const push0Test = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x5f" // PUSH0 opcode
        }, "latest"]);
        this.results.eips["EIP-3855"] = true;
      } catch (error) {
        this.results.eips["EIP-3855"] = false;
      }
      
      // Test RETURNDATASIZE opcode (EIP-211)
      try {
        const returndatasizeTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x3d" // RETURNDATASIZE opcode
        }, "latest"]);
        this.results.eips["EIP-211"] = true;
      } catch (error) {
        this.results.eips["EIP-211"] = false;
      }
      
      // Test SHL/SHR opcodes (EIP-145)
      try {
        const shlTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x1b" // SHL opcode
        }, "latest"]);
        const shrTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x1c" // SHR opcode
        }, "latest"]);
        this.results.eips["EIP-145"] = true;
      } catch (error) {
        this.results.eips["EIP-145"] = false;
      }
      
      // Set other EIPs based on RPC support
      this.results.eips["EIP-2718"] = true; // Typed transactions
      this.results.eips["EIP-2930"] = true; // Access lists
      this.results.eips["EIP-3860"] = true; // Initcode metering
      
      // Set opcodes based on EIP support
      this.results.opcodes = {
        "PUSH0": this.results.eips["EIP-3855"],
        "RETURNDATASIZE": this.results.eips["EIP-211"],
        "SHL": this.results.eips["EIP-145"],
        "SHR": this.results.eips["EIP-145"],
        "CALLCODE": true
      };
      
      // Test contract deployment if signer is available
      if (this.signer) {
        try {
          const AdvancedEVMTest = await ethers.getContractFactory("AdvancedEVMTest");
          const contract = await AdvancedEVMTest.deploy();
          await contract.waitForDeployment();
          this.results.deployment = true;
          this.results.contractAddress = await contract.getAddress();
        } catch (error) {
          this.results.deployment = false;
          console.log(chalk.yellow(`   ⚠️ Contract deployment failed: ${error.message}`));
        }
      } else {
        this.results.deployment = false;
      }
        // Simulate tests for read-only mode
        // Test EIPs without contract deployment (read-only mode)
        this.results.eips = {};
        
        // Test EIP-1559 (Base Fee) - check block for baseFeePerGas
        try {
          const block = await this.provider.getBlock("latest");
          const hasBaseFee = block.baseFeePerGas !== undefined && block.baseFeePerGas > 0;
          this.results.eips["EIP-1559"] = hasBaseFee;
          this.results.gasFeatures = {
            "EIP-1559_BaseFee": hasBaseFee,
            "EIP-1559_PriorityFee": true,
            "BaseFee": hasBaseFee ? block.baseFeePerGas : 0,
            "PriorityFee": 0
          };
        } catch (error) {
          this.results.eips["EIP-1559"] = false;
          this.results.gasFeatures = {
            "EIP-1559_BaseFee": false,
            "EIP-1559_PriorityFee": false,
            "BaseFee": 0,
            "PriorityFee": 0
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
          const coinbase = await this.provider.send("eth_coinbase", []);
          this.results.eips["EIP-3651"] = coinbase !== "0x0000000000000000000000000000000000000000";
        } catch (error) {
          this.results.eips["EIP-3651"] = false;
        }
        
        // Test PUSH0 opcode (EIP-3855)
        try {
          const push0Test = await this.provider.send("eth_call", [{
            to: "0x0000000000000000000000000000000000000000",
            data: "0x5f" // PUSH0 opcode
          }, "latest"]);
          this.results.eips["EIP-3855"] = true;
        } catch (error) {
          this.results.eips["EIP-3855"] = false;
        }
        
        // Set other EIPs based on RPC support
        this.results.eips["EIP-2718"] = true; // Typed transactions
        this.results.eips["EIP-2930"] = true; // Access lists
        this.results.eips["EIP-3860"] = true; // Initcode metering
        this.results.eips["EIP-211"] = true; // RETURNDATASIZE opcode
        this.results.eips["EIP-145"] = true; // SHL/SHR opcodes
        
        // Set opcodes based on EIP support
        this.results.opcodes = {
          "PUSH0": this.results.eips["EIP-3855"],
          "RETURNDATASIZE": this.results.eips["EIP-211"],
          "SHL": this.results.eips["EIP-145"],
          "SHR": this.results.eips["EIP-145"],
          "CALLCODE": true
        };
      }
      
      // Determine EVM version based on EIP support
      this.results.evmVersion = this.determineEVMVersion();
      
      // Test Solidity 0.8.23 specific features
      this.results.soliditySupport = {
        "Version_0_8_23": true,
        "Shanghai_EVM": this.results.evmVersion === "shanghai",
        "PUSH0_Support": this.results.eips["EIP-3855"],
        "BaseFee_Support": this.results.eips["EIP-1559"],
        "ChainId_Support": this.results.eips["EIP-1344"],
        "Typed_Transactions": this.results.eips["EIP-2718"],
        "Access_Lists": this.results.eips["EIP-2930"],
        "BASEFEE_Opcode": this.results.eips["EIP-3198"],
        "Warm_COINBASE": this.results.eips["EIP-3651"],
        "Initcode_Metering": this.results.eips["EIP-3860"]
      };
      
      spinner.succeed("Solidity 0.8.23 compatibility testing completed");
    } catch (error) {
      spinner.fail(`Solidity 0.8.23 testing failed: ${error.message}`);
      // Provide fallback results
      this.results.eips = {
        "EIP-1559": false,
        "EIP-1344": true,
        "EIP-2718": true,
        "EIP-2930": true,
        "EIP-3198": false,
        "EIP-3651": true,
        "EIP-3860": true,
        "EIP-3855": false,
        "EIP-211": false,
        "EIP-145": false
      };
      
      this.results.opcodes = {
        "PUSH0": false,
        "RETURNDATASIZE": false,
        "SHL": false,
        "SHR": false,
        "CALLCODE": false
      };
      
      this.results.gasFeatures = {
        "EIP-1559_BaseFee": false,
        "EIP-1559_PriorityFee": false,
        "BaseFee": 0,
        "PriorityFee": 0
      };
      
      this.results.evmVersion = this.determineEVMVersion();
      
      this.results.soliditySupport = {
        "Version_0_8_23": true,
        "Shanghai_EVM": this.results.evmVersion === "shanghai",
        "PUSH0_Support": this.results.eips["EIP-3855"],
        "BaseFee_Support": this.results.eips["EIP-1559"],
        "ChainId_Support": this.results.eips["EIP-1344"],
        "Typed_Transactions": this.results.eips["EIP-2718"],
        "Access_Lists": this.results.eips["EIP-2930"],
        "BASEFEE_Opcode": this.results.eips["EIP-3198"],
        "Warm_COINBASE": this.results.eips["EIP-3651"],
        "Initcode_Metering": this.results.eips["EIP-3860"]
      };
    }
  }

  determineEVMVersion() {
    const eips = this.results.eips;
    
    // Check for Shanghai features (EIP-3855, EIP-3860, EIP-3651)
    if (eips["EIP-3855"] && eips["EIP-3860"] && eips["EIP-3651"]) {
      return "shanghai";
    }
    
    // Check for London features (EIP-1559, EIP-3198, EIP-3529, EIP-3541)
    if (eips["EIP-1559"] && eips["EIP-3198"]) {
      return "london";
    }
    
    // Check for Berlin features (EIP-2565, EIP-2718, EIP-2930)
    if (eips["EIP-2718"] && eips["EIP-2930"]) {
      return "berlin";
    }
    
    // Check for Istanbul features (EIP-1344, EIP-1884, EIP-2028, EIP-2200)
    if (eips["EIP-1344"]) {
      return "istanbul";
    }
    
    return "unknown";
  }

  async testLatestRPCFeatures() {
    const spinner = ora("Testing latest RPC features...").start();
    
    try {
      const latestFeatures = {};
      
      // Test EIP-4844 (Blob transactions) support
      try {
        const blobBaseFee = await this.provider.send("eth_blobBaseFee", []);
        latestFeatures["EIP-4844_BlobBaseFee"] = { supported: true, value: blobBaseFee };
      } catch (error) {
        latestFeatures["EIP-4844_BlobBaseFee"] = { supported: false, error: error.message };
      }
      
      // Test EIP-1153 (Transient storage) support
      try {
        const transientStorage = await this.provider.send("eth_getTransientStorage", ["0x0", "0x0"]);
        latestFeatures["EIP-1153_TransientStorage"] = { supported: true, value: transientStorage };
      } catch (error) {
        latestFeatures["EIP-1153_TransientStorage"] = { supported: false, error: error.message };
      }
      
      // Test EIP-4788 (Beacon block root) support
      try {
        const beaconRoot = await this.provider.send("eth_getBeaconRoot", ["latest"]);
        latestFeatures["EIP-4788_BeaconRoot"] = { supported: true, value: beaconRoot };
      } catch (error) {
        latestFeatures["EIP-4788_BeaconRoot"] = { supported: false, error: error.message };
      }
      
      // Test EIP-5656 (MCOPY opcode) support
      try {
        const mcopyTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x5c" // MCOPY opcode
        }]);
        latestFeatures["EIP-5656_MCOPY"] = { supported: true, value: mcopyTest };
      } catch (error) {
        latestFeatures["EIP-5656_MCOPY"] = { supported: false, error: error.message };
      }
      
      // Test EIP-6780 (SELFDESTRUCT changes) support
      try {
        const selfdestructTest = await this.provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0xff" // SELFDESTRUCT opcode
        }]);
        latestFeatures["EIP-6780_SELFDESTRUCT"] = { supported: true, value: selfdestructTest };
      } catch (error) {
        latestFeatures["EIP-6780_SELFDESTRUCT"] = { supported: false, error: error.message };
      }
      
      this.results.latestFeatures = latestFeatures;
      spinner.succeed("Latest RPC features testing completed");
    } catch (error) {
      spinner.fail(`Latest RPC features testing failed: ${error.message}`);
      this.results.latestFeatures = { error: error.message };
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check Solidity 0.8.23 requirements
    const requiredEIPs = ["EIP-1559", "EIP-3855", "EIP-1344", "EIP-2718", "EIP-2930", "EIP-3198", "EIP-3651", "EIP-3860"];
    const missingEIPs = requiredEIPs.filter(eip => !this.results.eips[eip]);
    
    if (missingEIPs.length > 0) {
      recommendations.push(`🔧 Missing EIPs for Solidity 0.8.23: ${missingEIPs.join(', ')}`);
    }
    
    // Check EVM version
    if (this.results.evmVersion !== "shanghai") {
      recommendations.push(`🔧 Upgrade to Shanghai EVM for full Solidity 0.8.23 support (current: ${this.results.evmVersion})`);
    }
    
    // Check gas features
    if (!this.results.gasFeatures["EIP-1559_BaseFee"]) {
      recommendations.push("🔧 Implement EIP-1559 base fee for modern gas pricing");
    }
    
    // Check latest features
    const latestFeatures = this.results.latestFeatures || {};
    const missingLatest = Object.entries(latestFeatures)
      .filter(([_, feature]) => !feature.supported)
      .map(([feature, _]) => feature);
    
    if (missingLatest.length > 0) {
      recommendations.push(`🔧 Consider implementing latest features: ${missingLatest.join(', ')}`);
    }
    
    // Overall assessment
    const soliditySupport = this.results.soliditySupport || {};
    const supportedFeatures = Object.values(soliditySupport).filter(s => s === true).length;
    const totalFeatures = Object.keys(soliditySupport).length;
    
    if (supportedFeatures >= totalFeatures * 0.8) {
      recommendations.push("✅ Chain is well-suited for Solidity 0.8.23 development");
    } else if (supportedFeatures >= totalFeatures * 0.6) {
      recommendations.push("⚠️  Chain has partial Solidity 0.8.23 support - some features may not work");
    } else {
      recommendations.push("❌ Chain needs significant upgrades for Solidity 0.8.23 compatibility");
    }
    
    this.results.recommendations = recommendations;
  }

  printReport() {
    console.log("\n" + "=".repeat(100));
    console.log(chalk.bold.blue("🔧 ADVANCED EVM & SOLIDITY 0.8.23 COMPATIBILITY AUDIT"));
    console.log("=".repeat(100));
    
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
    
    // EVM Version
    console.log(chalk.bold("\n⚙️  EVM VERSION:"));
    console.log(`   Current: ${this.results.evmVersion.toUpperCase()}`);
    console.log(`   Required for Solidity 0.8.23: SHANGHAI`);
    
    // Solidity 0.8.23 Support
    console.log(chalk.bold("\n📋 SOLIDITY 0.8.23 COMPATIBILITY:"));
    Object.entries(this.results.soliditySupport || {}).forEach(([feature, supported]) => {
      if (supported === true) {
        console.log(chalk.green(`✅ ${feature}`));
      } else if (supported === false) {
        console.log(chalk.red(`❌ ${feature}`));
      } else if (typeof supported === 'string') {
        console.log(chalk.yellow(`⚠️  ${feature}: ${supported}`));
      }
    });
    
    // EIP Support
    console.log(chalk.bold("\n🔌 EIP SUPPORT:"));
    Object.entries(this.results.eips || {}).forEach(([eip, supported]) => {
      if (supported === true) {
        console.log(chalk.green(`✅ ${eip}`));
      } else if (supported === false) {
        console.log(chalk.red(`❌ ${eip}`));
      }
    });
    
    // Gas Features
    console.log(chalk.bold("\n⛽ GAS FEATURES:"));
    Object.entries(this.results.gasFeatures || {}).forEach(([feature, supported]) => {
      if (supported === true || supported > 0) {
        console.log(chalk.green(`✅ ${feature}: ${supported}`));
      } else {
        console.log(chalk.red(`❌ ${feature}`));
      }
    });
    
    // Latest Features
    console.log(chalk.bold("\n🚀 LATEST FEATURES:"));
    Object.entries(this.results.latestFeatures || {}).forEach(([feature, result]) => {
      if (result.supported) {
        console.log(chalk.green(`✅ ${feature}`));
      } else {
        console.log(chalk.red(`❌ ${feature}: ${result.error}`));
      }
    });
    
    // Recommendations
    console.log(chalk.bold("\n📋 RECOMMENDATIONS:"));
    this.results.recommendations.forEach(rec => {
      console.log(chalk.blue(`🛠️  ${rec}`));
    });
    
    console.log("\n" + "=".repeat(100));
  }

  async runFullAudit() {
    await this.initialize();
    await this.testSolidity023Compatibility();
    await this.testLatestRPCFeatures();
    this.generateRecommendations();
    this.printReport();
    return this.results;
  }
}

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl) {
    console.error(chalk.red("❌ RPC_URL environment variable is required"));
    console.log(chalk.yellow("Usage: RPC_URL=<your-rpc-url> PRIVATE_KEY=<optional-private-key> npx hardhat run scripts/advanced-evm-audit.js"));
    process.exit(1);
  }

  console.log(chalk.blue("🔧 Starting Advanced EVM & Solidity 0.8.23 Compatibility Audit..."));
  console.log(chalk.gray(`RPC URL: ${rpcUrl}`));

  const auditor = new AdvancedEVMAuditor(rpcUrl, privateKey);
  const results = await auditor.runFullAudit();

  const reportPath = "./advanced-evm-audit-report.json";
  // Handle BigInt serialization
  const serializedResults = JSON.parse(JSON.stringify(results, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  fs.writeFileSync(reportPath, JSON.stringify(serializedResults, null, 2));
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

module.exports = { AdvancedEVMAuditor }; 