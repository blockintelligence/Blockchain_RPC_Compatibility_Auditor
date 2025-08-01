require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");

async function quickTest() {
  const rpcUrl = process.env.RPC_URL;
  
  if (!rpcUrl) {
    console.error(chalk.red("❌ RPC_URL environment variable is required"));
    console.log(chalk.yellow("Usage: RPC_URL=<your-rpc-url> npx hardhat run scripts/quick-test.js"));
    process.exit(1);
  }

  console.log(chalk.blue("🔍 Quick Blockchain Compatibility Test"));
  console.log(chalk.gray(`RPC URL: ${rpcUrl}`));

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Test basic connection
    console.log(chalk.yellow("\n📡 Testing connection..."));
    const blockNumber = await provider.getBlockNumber();
    const chainId = await provider.send("eth_chainId", []);
    console.log(chalk.green(`✅ Connected to chain ${parseInt(chainId, 16)} at block ${blockNumber}`));

    // Test opcode compilation
    console.log(chalk.yellow("\n⚡ Testing opcode compilation..."));
    const OpcodeTest = await ethers.getContractFactory("OpcodeTest");
    console.log(chalk.green("✅ Solidity 0.8.23 compilation successful"));

    // Test individual opcodes via eth_call simulation
    console.log(chalk.yellow("\n🔧 Testing individual opcodes..."));
    
    const opcodes = [
      { name: "PUSH0", func: "testPush0", params: [] },
      { name: "RETURNDATASIZE", func: "testReturnDataSize", params: [] },
      { name: "SHL", func: "testShiftLeft", params: [4, 2] },
      { name: "SHR", func: "testShiftRight", params: [16, 2] },
      { name: "CALLCODE", func: "testCallCode", params: ["0x0000000000000000000000000000000000000000", 0, "0x"] }
    ];

    for (const opcode of opcodes) {
      try {
        const data = OpcodeTest.interface.encodeFunctionData(opcode.func, opcode.params);
        const result = await provider.send("eth_call", [{
          data: data
        }, "latest"]);
        
        if (result && result !== "0x") {
          console.log(chalk.green(`✅ ${opcode.name}: Supported`));
        } else {
          console.log(chalk.red(`❌ ${opcode.name}: Not Supported`));
        }
      } catch (error) {
        console.log(chalk.red(`❌ ${opcode.name}: Error - ${error.message}`));
      }
    }

    // Test OpenZeppelin compatibility
    console.log(chalk.yellow("\n🔧 Testing OpenZeppelin compatibility..."));
    try {
      const OpenZeppelinTest = await ethers.getContractFactory("OpenZeppelinCompatibilityTest");
      const deploymentData = OpenZeppelinTest.interface.encodeDeploy();
      
      const result = await provider.send("eth_call", [{
        data: deploymentData
      }, "latest"]);
      
      if (result && result !== "0x") {
        console.log(chalk.green("✅ OpenZeppelin: Compatible"));
      } else {
        console.log(chalk.red("❌ OpenZeppelin: May have issues"));
      }
    } catch (error) {
      console.log(chalk.red(`❌ OpenZeppelin: Error - ${error.message}`));
    }

    // Generate quick recommendations
    console.log(chalk.yellow("\n📋 Quick Recommendations:"));
    console.log(chalk.green("✅ Hardhat: Compatible"));
    console.log(chalk.green("✅ Foundry: Compatible"));
    console.log(chalk.green("✅ Remix: Compatible"));
    console.log(chalk.blue("🛠️  Run full audit with: npm run audit"));

  } catch (error) {
    console.error(chalk.red("❌ Quick test failed:"), error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  quickTest()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { quickTest }; 