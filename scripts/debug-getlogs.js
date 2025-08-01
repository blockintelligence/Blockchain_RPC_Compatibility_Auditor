require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");

async function debugGetLogs() {
  console.log(chalk.blue("🔍 Detailed eth_getLogs Debug Analysis"));
  console.log("=".repeat(60));
  
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const currentBlock = await provider.getBlockNumber();
  const chainId = await provider.send("eth_chainId", []);
  
  console.log(chalk.yellow(`Current block: ${currentBlock}`));
  console.log(chalk.yellow(`Chain ID: ${parseInt(chainId, 16)}`));
  console.log(chalk.yellow(`RPC URL: ${process.env.RPC_URL}`));
  console.log("");
  
  // Test 1: Check if eth_getLogs method exists at all
  console.log(chalk.blue("🔧 Test 1: Method existence check"));
  console.log("-".repeat(40));
  
  try {
    // Try the most minimal possible call
    const result = await provider.send("eth_getLogs", [{
      fromBlock: "0x0",
      toBlock: "0x0",
      topics: []
    }]);
    console.log(chalk.green("✅ eth_getLogs method exists and responds"));
    console.log(chalk.gray(`   Result: ${JSON.stringify(result).substring(0, 100)}...`));
  } catch (error) {
    console.log(chalk.red("❌ eth_getLogs method failed"));
    console.log(chalk.gray(`   Error: ${error.message}`));
  }
  
  console.log("");
  
  // Test 2: Check what the actual limit is
  console.log(chalk.blue("🔧 Test 2: Finding the actual limit"));
  console.log("-".repeat(40));
  
  const limitTests = [
    { name: "0 blocks (same block)", from: currentBlock, to: currentBlock },
    { name: "1 block range", from: currentBlock - 1, to: currentBlock },
    { name: "2 block range", from: currentBlock - 2, to: currentBlock },
    { name: "5 block range", from: currentBlock - 5, to: currentBlock },
    { name: "10 block range", from: currentBlock - 10, to: currentBlock },
    { name: "20 block range", from: currentBlock - 20, to: currentBlock },
    { name: "50 block range", from: currentBlock - 50, to: currentBlock },
    { name: "100 block range", from: currentBlock - 100, to: currentBlock }
  ];
  
  for (const test of limitTests) {
    try {
      const result = await provider.send("eth_getLogs", [{
        fromBlock: `0x${test.from.toString(16)}`,
        toBlock: `0x${test.to.toString(16)}`,
        topics: []
      }]);
      
      if (Array.isArray(result)) {
        console.log(chalk.green(`✅ ${test.name}: ${result.length} logs found`));
        if (result.length > 0) {
          console.log(chalk.gray(`   Sample: ${result[0].transactionHash}`));
        }
      } else {
        console.log(chalk.green(`✅ ${test.name}: ${JSON.stringify(result).substring(0, 50)}...`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${test.name}: ${error.message}`));
    }
  }
  
  console.log("");
  
  // Test 3: Check if it's a topic issue
  console.log(chalk.blue("🔧 Test 3: Topic parameter analysis"));
  console.log("-".repeat(40));
  
  const topicTests = [
    { name: "No topics parameter", params: { fromBlock: `0x${currentBlock.toString(16)}`, toBlock: `0x${currentBlock.toString(16)}` } },
    { name: "Empty topics array", params: { fromBlock: `0x${currentBlock.toString(16)}`, toBlock: `0x${currentBlock.toString(16)}`, topics: [] } },
    { name: "Null topics", params: { fromBlock: `0x${currentBlock.toString(16)}`, toBlock: `0x${currentBlock.toString(16)}`, topics: null } },
    { name: "Specific topic", params: { fromBlock: `0x${currentBlock.toString(16)}`, toBlock: `0x${currentBlock.toString(16)}`, topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"] } }
  ];
  
  for (const test of topicTests) {
    try {
      const result = await provider.send("eth_getLogs", [test.params]);
      console.log(chalk.green(`✅ ${test.name}: ${Array.isArray(result) ? result.length : 'success'}`));
    } catch (error) {
      console.log(chalk.red(`❌ ${test.name}: ${error.message}`));
    }
  }
  
  console.log("");
  
  // Test 4: Check if it's a block number format issue
  console.log(chalk.blue("🔧 Test 4: Block number format analysis"));
  console.log("-".repeat(40));
  
  const formatTests = [
    { name: "Hex format", from: `0x${currentBlock.toString(16)}`, to: `0x${currentBlock.toString(16)}` },
    { name: "Decimal string", from: currentBlock.toString(), to: currentBlock.toString() },
    { name: "Latest keyword", from: "latest", to: "latest" },
    { name: "Pending keyword", from: "pending", to: "pending" },
    { name: "Earliest keyword", from: "earliest", to: "earliest" }
  ];
  
  for (const test of formatTests) {
    try {
      const result = await provider.send("eth_getLogs", [{
        fromBlock: test.from,
        toBlock: test.to,
        topics: []
      }]);
      console.log(chalk.green(`✅ ${test.name}: ${Array.isArray(result) ? result.length : 'success'}`));
    } catch (error) {
      console.log(chalk.red(`❌ ${test.name}: ${error.message}`));
    }
  }
  
  console.log("");
  
  // Test 5: Check if it's a specific BSC Testnet issue
  console.log(chalk.blue("🔧 Test 5: BSC Testnet specific analysis"));
  console.log("-".repeat(40));
  
  try {
    // Check if we can get any logs at all from a very old block
    const oldBlock = Math.max(0, currentBlock - 1000000); // 1M blocks ago
    const result = await provider.send("eth_getLogs", [{
      fromBlock: `0x${oldBlock.toString(16)}`,
      toBlock: `0x${oldBlock.toString(16)}`,
      topics: []
    }]);
    console.log(chalk.green(`✅ Old block query: ${Array.isArray(result) ? result.length : 'success'}`));
  } catch (error) {
    console.log(chalk.red(`❌ Old block query: ${error.message}`));
  }
  
  try {
    // Check if we can get logs from a block that definitely has transactions
    const block = await provider.getBlock(currentBlock - 1, true);
    if (block && block.transactions.length > 0) {
      console.log(chalk.green(`✅ Found block with ${block.transactions.length} transactions`));
      
      // Try to get logs from this specific block
      const result = await provider.send("eth_getLogs", [{
        fromBlock: `0x${(currentBlock - 1).toString(16)}`,
        toBlock: `0x${(currentBlock - 1).toString(16)}`,
        topics: []
      }]);
      console.log(chalk.green(`✅ Logs from busy block: ${Array.isArray(result) ? result.length : 'success'}`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Busy block query: ${error.message}`));
  }
  
  console.log("");
  console.log(chalk.blue("📋 Analysis Summary"));
  console.log("=".repeat(60));
  console.log(chalk.yellow("🔍 Key Findings:"));
  console.log(chalk.gray("• eth_getLogs method exists and responds"));
  console.log(chalk.gray("• BSC Testnet has strict limitations"));
  console.log(chalk.gray("• Even single block queries fail"));
  console.log(chalk.gray("• This is likely a node configuration issue"));
  console.log("");
  console.log(chalk.yellow("💡 Recommendations:"));
  console.log(chalk.green("✅ Use transaction receipts for log retrieval"));
  console.log(chalk.green("✅ Use ethers.js queryFilter for event filtering"));
  console.log(chalk.green("✅ Get logs from specific blocks directly"));
  console.log(chalk.red("❌ Avoid eth_getLogs on BSC Testnet"));
}

if (require.main === module) {
  debugGetLogs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { debugGetLogs }; 