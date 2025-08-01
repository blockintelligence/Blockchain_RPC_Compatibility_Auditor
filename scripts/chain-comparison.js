require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function compareChains() {
  console.log(chalk.blue("🔍 Blockchain Infrastructure Comparison"));
  console.log("=".repeat(70));
  
  const chains = [
    {
      name: "MFEV Blockchain",
      rpcUrl: "https://rpc.mfevscan.com",
      chainId: 9982,
      type: "mainnet"
    },
    {
      name: "BSC Testnet",
      rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      type: "testnet"
    }
  ];
  
  const results = {};
  
  for (const chain of chains) {
    console.log(chalk.yellow(`\n🔗 Testing ${chain.name} (Chain ID: ${chain.chainId})`));
    console.log("-".repeat(50));
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
      const currentBlock = await provider.getBlockNumber();
      const chainId = await provider.send("eth_chainId", []);
      
      console.log(chalk.green(`✅ Connected to ${chain.name}`));
      console.log(chalk.gray(`   Block: ${currentBlock}`));
      console.log(chalk.gray(`   Chain ID: ${parseInt(chainId, 16)}`));
      
      // Test RPC methods
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
              fromBlock: `0x${(currentBlock - 1).toString(16)}`,
              toBlock: `0x${(currentBlock - 1).toString(16)}`,
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
      
      // Test finality
      const blocks = [];
      for (let i = 0; i < 5; i++) {
        const block = await provider.getBlock(currentBlock - i);
        blocks.push({
          number: block.number,
          timestamp: block.timestamp,
          hash: block.hash
        });
      }
      
      const blockTimes = [];
      for (let i = 1; i < blocks.length; i++) {
        const timeDiff = blocks[i-1].timestamp - blocks[i].timestamp;
        blockTimes.push(timeDiff);
      }
      
      const avgBlockTime = blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length;
      const finality = {
        averageBlockTime: avgBlockTime,
        maxBlockTime: Math.max(...blockTimes),
        minBlockTime: Math.min(...blockTimes),
        isStable: avgBlockTime < 15 && Math.max(...blockTimes) < 30
      };
      
      // Test ERC-4337
      const entryPoints = {
        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789": "ERC-4337 EntryPoint v0.6",
        "0x0000000071727De22E5E9d8BAf0edAc6f37da032": "ERC-4337 EntryPoint v0.7"
      };
      
      let erc4337Supported = false;
      let entryPointAddress = null;
      
      for (const [address, description] of Object.entries(entryPoints)) {
        try {
          const code = await provider.getCode(address);
          if (code !== "0x") {
            erc4337Supported = true;
            entryPointAddress = address;
            break;
          }
        } catch (error) {
          // Continue checking other addresses
        }
      }
      
      // Test eth_getLogs specifically
      let getLogsStatus = "Unknown";
      try {
        const logs = await provider.send("eth_getLogs", [{
          fromBlock: `0x${(currentBlock - 1).toString(16)}`,
          toBlock: `0x${(currentBlock - 1).toString(16)}`,
          topics: []
        }]);
        getLogsStatus = "Works";
      } catch (error) {
        if (error.message.includes("limit exceeded")) {
          getLogsStatus = "Limited (range restrictions)";
        } else {
          getLogsStatus = `Failed: ${error.message}`;
        }
      }
      
      results[chain.name] = {
        chainId: parseInt(chainId, 16),
        type: chain.type,
        currentBlock: currentBlock,
        rpcMethods: rpcMethods,
        finality: finality,
        erc4337: {
          supported: erc4337Supported,
          entryPointAddress: entryPointAddress
        },
        getLogsStatus: getLogsStatus
      };
      
      console.log(chalk.green(`✅ RPC Methods: ${Object.values(rpcMethods).filter(m => m.supported).length}/10 supported`));
      console.log(chalk.green(`✅ Finality: ${finality.averageBlockTime.toFixed(2)}s average (${finality.isStable ? 'Stable' : 'Unstable'})`));
      console.log(chalk.green(`✅ ERC-4337: ${erc4337Supported ? 'Supported' : 'Not supported'}`));
      console.log(chalk.green(`✅ eth_getLogs: ${getLogsStatus}`));
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to test ${chain.name}: ${error.message}`));
      results[chain.name] = { error: error.message };
    }
  }
  
  // Generate comparison report
  console.log(chalk.blue("\n📊 COMPARISON SUMMARY"));
  console.log("=".repeat(70));
  
  const mfev = results["MFEV Blockchain"];
  const bsc = results["BSC Testnet"];
  
  if (mfev && bsc && !mfev.error && !bsc.error) {
    console.log(chalk.bold("\n🔗 Chain Characteristics:"));
    console.log(`   MFEV Blockchain: ${mfev.type} (Chain ID: ${mfev.chainId})`);
    console.log(`   BSC Testnet: ${bsc.type} (Chain ID: ${bsc.chainId})`);
    
    console.log(chalk.bold("\n⏱️  Block Time Comparison:"));
    console.log(`   MFEV: ${mfev.finality.averageBlockTime.toFixed(2)}s average`);
    console.log(`   BSC: ${bsc.finality.averageBlockTime.toFixed(2)}s average`);
    
    console.log(chalk.bold("\n🔌 RPC Method Support:"));
    const mfevRpc = Object.values(mfev.rpcMethods).filter(m => m.supported).length;
    const bscRpc = Object.values(bsc.rpcMethods).filter(m => m.supported).length;
    console.log(`   MFEV: ${mfevRpc}/10 methods supported`);
    console.log(`   BSC: ${bscRpc}/10 methods supported`);
    
    console.log(chalk.bold("\n📋 eth_getLogs Status:"));
    console.log(`   MFEV: ${mfev.getLogsStatus}`);
    console.log(`   BSC: ${bsc.getLogsStatus}`);
    
    console.log(chalk.bold("\n🔐 ERC-4337 Support:"));
    console.log(`   MFEV: ${mfev.erc4337.supported ? '✅ Supported' : '❌ Not supported'}`);
    console.log(`   BSC: ${bsc.erc4337.supported ? '✅ Supported' : '❌ Not supported'}`);
    
    console.log(chalk.bold("\n📈 Performance Comparison:"));
    console.log(`   MFEV: ${mfev.finality.isStable ? '✅ Stable' : '❌ Unstable'} finality`);
    console.log(`   BSC: ${bsc.finality.isStable ? '✅ Stable' : '❌ Unstable'} finality`);
    
    console.log(chalk.bold("\n🎯 Key Differences:"));
    if (mfev.finality.averageBlockTime > bsc.finality.averageBlockTime) {
      console.log(`   • MFEV has slower block time (${mfev.finality.averageBlockTime.toFixed(2)}s vs ${bsc.finality.averageBlockTime.toFixed(2)}s)`);
    } else {
      console.log(`   • BSC has slower block time (${bsc.finality.averageBlockTime.toFixed(2)}s vs ${mfev.finality.averageBlockTime.toFixed(2)}s)`);
    }
    
    if (mfev.erc4337.supported && !bsc.erc4337.supported) {
      console.log("   • MFEV supports ERC-4337, BSC Testnet does not");
    } else if (!mfev.erc4337.supported && bsc.erc4337.supported) {
      console.log("   • BSC Testnet supports ERC-4337, MFEV does not");
    } else if (mfev.erc4337.supported && bsc.erc4337.supported) {
      console.log("   • Both chains support ERC-4337");
    } else {
      console.log("   • Neither chain supports ERC-4337");
    }
    
    if (mfev.getLogsStatus.includes("Works") && bsc.getLogsStatus.includes("Limited")) {
      console.log("   • MFEV has better eth_getLogs support than BSC Testnet");
    } else if (bsc.getLogsStatus.includes("Works") && mfev.getLogsStatus.includes("Limited")) {
      console.log("   • BSC Testnet has better eth_getLogs support than MFEV");
    } else {
      console.log("   • Both chains have similar eth_getLogs behavior");
    }
    
    console.log(chalk.bold("\n💡 Recommendations:"));
    if (mfevRpc === 10 && bscRpc === 10) {
      console.log("   ✅ Both chains have excellent RPC method support");
    } else {
      console.log("   ⚠️  Some RPC methods are missing on one or both chains");
    }
    
    if (mfev.finality.isStable && bsc.finality.isStable) {
      console.log("   ✅ Both chains have stable finality");
    } else {
      console.log("   ⚠️  One or both chains have unstable finality");
    }
    
    if (mfev.erc4337.supported || bsc.erc4337.supported) {
      console.log("   ✅ At least one chain supports ERC-4337 for account abstraction");
    } else {
      console.log("   ⚠️  Neither chain supports ERC-4337");
    }
    
  } else {
    console.log(chalk.red("❌ Cannot generate comparison - one or both chains failed to test"));
  }
  
  // Save detailed results
  const reportPath = "./chain-comparison-report.json";
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(chalk.green(`\n📄 Detailed comparison saved to: ${reportPath}`));
}

if (require.main === module) {
  compareChains()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { compareChains }; 