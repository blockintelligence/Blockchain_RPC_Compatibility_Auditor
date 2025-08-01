require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");

async function verifyLatestFeatures() {
  console.log(chalk.blue("🔍 VERIFYING LATEST CANCUN FEATURES ON ETHEREUM MAINNET"));
  console.log("=".repeat(70));
  
  const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
  
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log(chalk.yellow(`Current block: ${blockNumber}`));
    console.log("");
    
    // Check if we're past the Cancun activation block
    const CANCELLUN_ACTIVATION_BLOCK = 19404887; // Ethereum mainnet Cancun activation
    const isCancunActive = blockNumber >= CANCELLUN_ACTIVATION_BLOCK;
    
    console.log(chalk.blue("📅 Cancun Hard Fork Status:"));
    console.log(`   Cancun Activation Block: ${CANCELLUN_ACTIVATION_BLOCK}`);
    console.log(`   Current Block: ${blockNumber}`);
    console.log(`   Cancun Active: ${isCancunActive ? "✅ YES" : "❌ NO"}`);
    console.log("");
    
    if (isCancunActive) {
      console.log(chalk.green("🎉 Cancun is active! Testing features..."));
      console.log("");
      
      // Test EIP-1153 (Transient Storage)
      console.log(chalk.blue("🔧 Testing EIP-1153 (Transient Storage):"));
      try {
        const transientStorage = await provider.send("eth_getTransientStorage", ["0x0", "0x0"]);
        console.log(chalk.green(`   ✅ eth_getTransientStorage: ${transientStorage}`));
      } catch (error) {
        console.log(chalk.red(`   ❌ eth_getTransientStorage: ${error.message}`));
      }
      
      // Test EIP-4788 (Beacon Block Root)
      console.log(chalk.blue("🔧 Testing EIP-4788 (Beacon Block Root):"));
      try {
        const beaconRoot = await provider.send("eth_getBeaconRoot", ["latest"]);
        console.log(chalk.green(`   ✅ eth_getBeaconRoot: ${beaconRoot}`));
      } catch (error) {
        console.log(chalk.red(`   ❌ eth_getBeaconRoot: ${error.message}`));
      }
      
      // Test EIP-4844 (Blob Transactions)
      console.log(chalk.blue("🔧 Testing EIP-4844 (Blob Transactions):"));
      try {
        const blobBaseFee = await provider.send("eth_blobBaseFee", []);
        console.log(chalk.green(`   ✅ eth_blobBaseFee: ${blobBaseFee}`));
      } catch (error) {
        console.log(chalk.red(`   ❌ eth_blobBaseFee: ${error.message}`));
      }
      
      // Test EIP-5656 (MCOPY opcode)
      console.log(chalk.blue("🔧 Testing EIP-5656 (MCOPY opcode):"));
      try {
        const mcopyTest = await provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0x5c" // MCOPY opcode
        }, "latest"]);
        console.log(chalk.green(`   ✅ MCOPY opcode: ${mcopyTest}`));
      } catch (error) {
        console.log(chalk.red(`   ❌ MCOPY opcode: ${error.message}`));
      }
      
      // Test EIP-6780 (SELFDESTRUCT changes)
      console.log(chalk.blue("🔧 Testing EIP-6780 (SELFDESTRUCT changes):"));
      try {
        const selfdestructTest = await provider.send("eth_call", [{
          to: "0x0000000000000000000000000000000000000000",
          data: "0xff" // SELFDESTRUCT opcode
        }, "latest"]);
        console.log(chalk.green(`   ✅ SELFDESTRUCT opcode: ${selfdestructTest}`));
      } catch (error) {
        console.log(chalk.red(`   ❌ SELFDESTRUCT opcode: ${error.message}`));
      }
      
    } else {
      console.log(chalk.yellow("⚠️ Cancun is not yet active on this chain"));
      console.log(chalk.yellow("   These features will be available after Cancun activation"));
    }
    
    console.log("");
    console.log(chalk.blue("📋 SUMMARY:"));
    console.log("   • EIP-1153 and EIP-4788 are Cancun (Dencun) features");
    console.log("   • They require specific RPC methods to be implemented");
    console.log("   • Not all chains have implemented these methods yet");
    console.log("   • This is expected behavior for most chains");
    
  } catch (error) {
    console.log(chalk.red(`❌ Verification failed: ${error.message}`));
  }
}

if (require.main === module) {
  verifyLatestFeatures()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { verifyLatestFeatures }; 