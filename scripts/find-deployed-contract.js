require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");

async function findDeployedContract() {
    console.log(chalk.blue.bold("🔍 Finding Deployed Contract on MFEV"));
    
    try {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log(chalk.green(`📍 Address: ${signer.address}`));
        
        // Get latest block
        const latestBlock = await provider.getBlock("latest");
        console.log(chalk.blue(`📦 Latest Block: ${latestBlock.number}`));
        
        // Scan recent blocks for contract creation
        console.log(chalk.yellow("\n🔍 Scanning recent blocks for contract creation..."));
        
        const startBlock = Math.max(0, latestBlock.number - 10);
        let contractFound = false;
        
        for (let blockNumber = startBlock; blockNumber <= latestBlock.number; blockNumber++) {
            try {
                const block = await provider.getBlock(blockNumber, true);
                
                for (const tx of block.transactions) {
                    if (tx.from.toLowerCase() === signer.address.toLowerCase() && 
                        tx.to === null && 
                        tx.data && 
                        tx.data.length > 2) {
                        
                        console.log(chalk.green(`✅ Found contract creation transaction:`));
                        console.log(chalk.green(`   Block: ${blockNumber}`));
                        console.log(chalk.green(`   Hash: ${tx.hash}`));
                        console.log(chalk.green(`   Gas Price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} Gwei`));
                        
                        // Get transaction receipt
                        try {
                            const receipt = await provider.getTransactionReceipt(tx.hash);
                            if (receipt && receipt.contractAddress) {
                                console.log(chalk.green(`   Contract Address: ${receipt.contractAddress}`));
                                console.log(chalk.green(`   Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`));
                                console.log(chalk.green(`   Gas Used: ${receipt.gasUsed.toString()}`));
                                
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
                                    
                                    contractFound = true;
                                    break;
                                    
                                } catch (error) {
                                    console.log(chalk.yellow(`⚠️ Contract test failed: ${error.message}`));
                                }
                            }
                        } catch (error) {
                            console.log(chalk.yellow(`⚠️ Could not get receipt: ${error.message}`));
                        }
                    }
                }
                
                if (contractFound) break;
                
            } catch (error) {
                console.log(chalk.yellow(`⚠️ Could not get block ${blockNumber}: ${error.message}`));
            }
        }
        
        if (!contractFound) {
            console.log(chalk.red("❌ No contract creation transaction found in recent blocks"));
            console.log(chalk.yellow("💡 The contract might have been deployed earlier or the transaction failed"));
        }
        
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
    }
}

if (require.main === module) {
    findDeployedContract()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { findDeployedContract }; 