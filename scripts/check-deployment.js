require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");

async function checkDeployment() {
    console.log(chalk.blue.bold("🔍 Checking MFEV Deployment Status"));
    
    try {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log(chalk.green(`📍 Address: ${signer.address}`));
        
        // Check nonce
        const nonce = await provider.getTransactionCount(signer.address);
        console.log(chalk.blue(`📊 Current Nonce: ${nonce}`));
        
        // Check balance
        const balance = await provider.getBalance(signer.address);
        const balanceEth = ethers.formatEther(balance);
        console.log(chalk.blue(`💰 Balance: ${balanceEth} ETH`));
        
        // Check recent transactions
        console.log(chalk.yellow("\n📋 Recent Transactions:"));
        
        // Get the latest block
        const latestBlock = await provider.getBlock("latest");
        console.log(chalk.blue(`📦 Latest Block: ${latestBlock.number}`));
        
        // Check if there are any pending transactions
        const pendingCount = await provider.send("txpool_status", []);
        console.log(chalk.blue(`⏳ Pending Transactions: ${pendingCount.pending || 0}`));
        
        // Try to get transaction by nonce
        if (nonce > 0) {
            const tx = await provider.getTransaction({
                from: signer.address,
                nonce: nonce - 1
            });
            
            if (tx) {
                console.log(chalk.green(`✅ Found deployment transaction:`));
                console.log(chalk.green(`   Hash: ${tx.hash}`));
                console.log(chalk.green(`   Block: ${tx.blockNumber || 'Pending'}`));
                console.log(chalk.green(`   Gas Price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} Gwei`));
                
                // Check transaction receipt
                try {
                    const receipt = await provider.getTransactionReceipt(tx.hash);
                    if (receipt) {
                        console.log(chalk.green(`   Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`));
                        console.log(chalk.green(`   Gas Used: ${receipt.gasUsed.toString()}`));
                        
                        if (receipt.contractAddress) {
                            console.log(chalk.green(`   Contract Address: ${receipt.contractAddress}`));
                            
                            // Test the contract
                            console.log(chalk.yellow("\n🧪 Testing deployed contract..."));
                            try {
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
                                    deploymentTx: tx.hash,
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
                        console.log(chalk.yellow(`⏳ Transaction is still pending...`));
                    }
                } catch (error) {
                    console.log(chalk.yellow(`⚠️ Could not get receipt: ${error.message}`));
                }
            }
        }
        
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
    }
}

if (require.main === module) {
    checkDeployment()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { checkDeployment }; 