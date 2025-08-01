require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");

async function testGetLogs() {
  console.log(chalk.blue("🔍 Testing eth_getLogs with workarounds for limitations"));
  console.log("=".repeat(60));
  
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const currentBlock = await provider.getBlockNumber();
  
  console.log(chalk.yellow(`Current block: ${currentBlock}`));
  console.log(chalk.yellow(`Chain ID: ${await provider.send("eth_chainId", [])}`));
  console.log("");
  
  // Test 1: Try very small ranges that might work
  console.log(chalk.blue("🔧 Test 1: Very small ranges"));
  console.log("-".repeat(40));
  
  const smallRanges = [
    { name: "Single block (current)", from: currentBlock, to: currentBlock },
    { name: "Single block (previous)", from: currentBlock - 1, to: currentBlock - 1 },
    { name: "2 blocks", from: currentBlock - 1, to: currentBlock },
    { name: "3 blocks", from: currentBlock - 2, to: currentBlock },
    { name: "5 blocks", from: currentBlock - 4, to: currentBlock }
  ];
  
  for (const range of smallRanges) {
    try {
      const result = await provider.send("eth_getLogs", [{
        fromBlock: `0x${range.from.toString(16)}`,
        toBlock: `0x${range.to.toString(16)}`,
        topics: []
      }]);
      
      if (Array.isArray(result)) {
        console.log(chalk.green(`✅ ${range.name}: ${result.length} logs found`));
        if (result.length > 0) {
          console.log(chalk.gray(`   Sample: ${result[0].transactionHash}`));
        }
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${range.name}: ${error.message}`));
    }
  }
  
  console.log("");
  
  // Test 2: Get logs from recent blocks directly
  console.log(chalk.blue("🔧 Test 2: Get logs from recent blocks"));
  console.log("-".repeat(40));
  
  let totalLogsFound = 0;
  for (let i = 0; i < 5; i++) {
    try {
      const blockNumber = currentBlock - i;
      const block = await provider.getBlock(blockNumber, true);
      
      if (block && block.transactions) {
        let blockLogs = 0;
        for (const tx of block.transactions) {
          if (tx.logs && tx.logs.length > 0) {
            blockLogs += tx.logs.length;
            totalLogsFound += tx.logs.length;
          }
        }
        console.log(chalk.green(`✅ Block ${blockNumber}: ${block.transactions.length} txs, ${blockLogs} logs`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Block ${currentBlock - i}: ${error.message}`));
    }
  }
  
  console.log(chalk.yellow(`📊 Total logs found in recent blocks: ${totalLogsFound}`));
  console.log("");
  
  // Test 3: Deploy contract and get logs from transaction receipt
  console.log(chalk.blue("🔧 Test 3: Contract deployment and event logs"));
  console.log("-".repeat(40));
  
  try {
    const AdvancedEVMTest = await ethers.getContractFactory("AdvancedEVMTest");
    const contract = await AdvancedEVMTest.deploy();
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log(chalk.green(`✅ Contract deployed at: ${contractAddress}`));
    
    // Emit multiple test events
    const events = [];
    for (let i = 0; i < 3; i++) {
      const tx = await contract.emitTestEvent();
      const receipt = await tx.wait();
      events.push({
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        logs: receipt.logs.length
      });
      console.log(chalk.green(`✅ Event ${i + 1}: ${receipt.logs.length} logs in block ${receipt.blockNumber}`));
    }
    
    // Try to get logs for this specific contract with different methods
    console.log(chalk.blue("🔧 Test 4: Retrieving contract logs"));
    console.log("-".repeat(40));
    
    // Method 1: Try eth_getLogs with contract address filter
    try {
      const logs = await provider.send("eth_getLogs", [{
        fromBlock: `0x${(currentBlock - 10).toString(16)}`,
        toBlock: "latest",
        address: contractAddress,
        topics: []
      }]);
      console.log(chalk.green(`✅ eth_getLogs with address filter: ${logs.length} logs`));
    } catch (error) {
      console.log(chalk.red(`❌ eth_getLogs with address filter: ${error.message}`));
    }
    
    // Method 2: Get logs from specific blocks where we know events were emitted
    const knownBlocks = events.map(e => e.blockNumber);
    let logsFromBlocks = 0;
    
    for (const blockNumber of knownBlocks) {
      try {
        const block = await provider.getBlock(blockNumber, true);
        for (const tx of block.transactions) {
          if (tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
            if (tx.logs && tx.logs.length > 0) {
              logsFromBlocks += tx.logs.length;
              console.log(chalk.green(`✅ Block ${blockNumber}: Found ${tx.logs.length} logs in tx ${tx.hash}`));
            }
          }
        }
      } catch (error) {
        console.log(chalk.red(`❌ Block ${blockNumber}: ${error.message}`));
      }
    }
    
    console.log(chalk.yellow(`📊 Total logs retrieved from blocks: ${logsFromBlocks}`));
    
    // Method 3: Use ethers.js event filtering
    console.log(chalk.blue("🔧 Test 5: Ethers.js event filtering"));
    console.log("-".repeat(40));
    
    try {
      const filter = contract.filters.TestEvent();
      const logs = await contract.queryFilter(filter, currentBlock - 10, currentBlock);
      console.log(chalk.green(`✅ Ethers.js queryFilter: ${logs.length} events found`));
      
      if (logs.length > 0) {
        for (const log of logs) {
          console.log(chalk.gray(`   Event: ${log.transactionHash} - ${log.args.message}`));
        }
      }
    } catch (error) {
      console.log(chalk.red(`❌ Ethers.js queryFilter: ${error.message}`));
    }
    
  } catch (error) {
    console.log(chalk.red(`❌ Contract test failed: ${error.message}`));
  }
  
  console.log("");
  console.log(chalk.blue("📋 Summary: eth_getLogs Workarounds"));
  console.log("=".repeat(60));
  console.log(chalk.green("✅ Method 1: Use transaction receipts (always works)"));
  console.log(chalk.green("✅ Method 2: Get logs from specific blocks"));
  console.log(chalk.green("✅ Method 3: Use ethers.js queryFilter"));
  console.log(chalk.yellow("⚠️  Method 4: eth_getLogs with small ranges (may work)"));
  console.log(chalk.red("❌ Method 5: eth_getLogs with large ranges (limited)"));
}

if (require.main === module) {
  testGetLogs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testGetLogs }; 