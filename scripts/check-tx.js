require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");

async function checkTransaction(txHash) {
    console.log(chalk.blue.bold("🔍 Checking Transaction Status"));
    console.log(chalk.gray(`Transaction Hash: ${txHash}\n`));
    
    try {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        
        // Check transaction
        const tx = await provider.getTransaction(txHash);
        if (!tx) {
            console.log(chalk.red("❌ Transaction not found"));
            return;
        }
        
        console.log(chalk.green("✅ Transaction found:"));
        console.log(chalk.blue(`   From: ${tx.from}`));
        console.log(chalk.blue(`   To: ${tx.to || 'Contract Creation'}`));
        console.log(chalk.blue(`   Block: ${tx.blockNumber || 'Pending'}`));
        console.log(chalk.blue(`   Gas Price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} Gwei`));
        console.log(chalk.blue(`   Gas Limit: ${tx.gasLimit.toString()}`));
        
        // Check transaction receipt
        const receipt = await provider.getTransactionReceipt(txHash);
        if (receipt) {
            console.log(chalk.green("\n✅ Transaction confirmed:"));
            console.log(chalk.green(`   Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`));
            console.log(chalk.green(`   Block Number: ${receipt.blockNumber}`));
            console.log(chalk.green(`   Gas Used: ${receipt.gasUsed.toString()}`));
            
            if (receipt.contractAddress) {
                console.log(chalk.green(`   Contract Address: ${receipt.contractAddress}`));
                
                // Test the contract
                console.log(chalk.yellow("\n🧪 Testing deployed contract..."));
                try {
                    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
                    const contract = new ethers.Contract(
                        receipt.contractAddress,
                        ['function testBasicOpcodes() external pure returns (bool)'],
                        signer
                    );
                    
                    const result = await contract.testBasicOpcodes();
                    console.log(chalk.green(`✅ Contract test passed: ${result}`));
                    
                    // Save deployment info
                    const deploymentInfo = {
                        contractAddress: receipt.contractAddress,
                        deploymentTx: txHash,
                        blockNumber: receipt.blockNumber,
                        gasUsed: receipt.gasUsed.toString(),
                        gasPrice: tx.gasPrice.toString(),
                        totalCost: (receipt.gasUsed * tx.gasPrice).toString(),
                        timestamp: new Date().toISOString(),
                        network: "MFEV Mainnet",
                        rpcUrl: process.env.RPC_URL,
                        chainId: process.env.CHAIN_ID,
                        status: "SUCCESS"
                    };
                    
                    const fs = require("fs");
                    const filename = `mfev-mainnet-deployment-${Date.now()}.json`;
                    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
                    console.log(chalk.green(`📄 Deployment info saved to: ${filename}`));
                    
                } catch (error) {
                    console.log(chalk.yellow(`⚠️ Contract test failed: ${error.message}`));
                }
            }
        } else {
            console.log(chalk.yellow("\n⏳ Transaction is still pending..."));
        }
        
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
    }
}

// Get transaction hash from command line argument or use the last one
const txHash = process.argv[2] || "0x1aa1f63bc26fc54bfe49ff1110804a51b9c49e008224dc9f303d149716dd76b7";

if (require.main === module) {
    checkTransaction(txHash)
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { checkTransaction }; 