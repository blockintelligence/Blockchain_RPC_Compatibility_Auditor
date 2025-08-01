require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");

async function freshDeploy() {
    console.log(chalk.blue.bold("🚀 Fresh MFEV Mainnet Deployment"));
    console.log(chalk.gray("This will deploy the ComprehensiveEVMTest contract with proper nonce handling\n"));

    try {
        // Check environment
        if (!process.env.PRIVATE_KEY) {
            throw new Error("PRIVATE_KEY environment variable is required");
        }

        // Initialize provider and signer
        console.log(chalk.yellow("📡 Connecting to MFEV mainnet..."));
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        // Check balance
        const balance = await provider.getBalance(signer.address);
        const balanceEth = ethers.formatEther(balance);
        
        console.log(chalk.green(`✅ Connected! Address: ${signer.address}`));
        console.log(chalk.blue(`💰 Balance: ${balanceEth} ETH`));
        
        if (parseFloat(balanceEth) < 0.01) {
            console.log(chalk.red("❌ Insufficient balance for deployment"));
            return;
        }

        // Get current nonce
        const nonce = await provider.getTransactionCount(signer.address);
        console.log(chalk.blue(`📊 Current Nonce: ${nonce}`));

        // Get contract factory
        console.log(chalk.yellow("📦 Compiling contract..."));
        const ComprehensiveEVMTest = await ethers.getContractFactory("ComprehensiveEVMTest");
        
        // Estimate gas
        console.log(chalk.yellow("⛽ Estimating gas..."));
        const deploymentData = ComprehensiveEVMTest.interface.encodeDeploy();
        const estimatedGas = await provider.estimateGas({
            from: signer.address,
            data: deploymentData
        });
        
        console.log(chalk.blue(`📊 Estimated gas: ${estimatedGas.toString()}`));
        
        // Deploy with higher gas limit and explicit nonce
        const gasLimit = Math.max(Number(estimatedGas) * 2, 500000);
        console.log(chalk.blue(`🎯 Using gas limit: ${gasLimit}`));
        
        console.log(chalk.yellow("🚀 Deploying contract..."));
        
        // Create deployment transaction with explicit nonce and chain ID
        const deploymentTx = {
            nonce: nonce,
            gasLimit: gasLimit,
            gasPrice: process.env.GAS_PRICE ? BigInt(process.env.GAS_PRICE) : undefined,
            data: deploymentData,
            chainId: parseInt(process.env.CHAIN_ID)
        };
        
        // Sign and send transaction
        const signedTx = await signer.signTransaction(deploymentTx);
        const txResponse = await provider.broadcastTransaction(signedTx);
        
        console.log(chalk.blue(`📝 Transaction submitted: ${txResponse.hash}`));
        console.log(chalk.yellow("⏳ Waiting for deployment confirmation..."));
        
        // Wait for deployment with timeout
        const deploymentReceipt = await Promise.race([
            txResponse.wait(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Deployment timeout after 5 minutes")), 5 * 60 * 1000)
            )
        ]);
        
        // Get contract address from receipt
        const contractAddress = deploymentReceipt.contractAddress;
        const deploymentTxDetails = await provider.getTransaction(txResponse.hash);
        
        console.log(chalk.green("✅ Contract deployed successfully!"));
        console.log(chalk.green(`📍 Contract Address: ${contractAddress}`));
        console.log(chalk.green(`🔗 Transaction Hash: ${txResponse.hash}`));
        console.log(chalk.green(`📦 Block Number: ${deploymentReceipt.blockNumber}`));
        console.log(chalk.green(`⛽ Gas Used: ${deploymentReceipt.gasUsed.toString()}`));
        console.log(chalk.green(`💰 Total Cost: ${ethers.formatEther(deploymentReceipt.gasUsed * deploymentTxDetails.gasPrice)} ETH`));
        
        // Save deployment info
        const deploymentInfo = {
            contractAddress: contractAddress,
            deploymentTx: txResponse.hash,
            blockNumber: deploymentReceipt.blockNumber,
            gasUsed: deploymentReceipt.gasUsed.toString(),
            gasPrice: deploymentTxDetails.gasPrice.toString(),
            totalCost: (deploymentReceipt.gasUsed * deploymentTxDetails.gasPrice).toString(),
            timestamp: new Date().toISOString(),
            network: "MFEV Mainnet",
            rpcUrl: process.env.RPC_URL,
            chainId: process.env.CHAIN_ID,
            nonce: nonce
        };
        
        const fs = require("fs");
        const filename = `mfev-mainnet-deployment-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
        console.log(chalk.green(`📄 Deployment info saved to: ${filename}`));
        
        // Test the contract
        console.log(chalk.yellow("\n🧪 Testing deployed contract..."));
        try {
            const contract = new ethers.Contract(
                contractAddress,
                ['function testBasicOpcodes() external pure returns (bool)'],
                signer
            );
            
            const result = await contract.testBasicOpcodes();
            console.log(chalk.green(`✅ Basic opcodes test passed: ${result}`));
            
            // Try comprehensive test
            console.log(chalk.yellow("🧪 Running comprehensive test..."));
            try {
                const comprehensiveContract = new ethers.Contract(
                    contractAddress,
                    ['function runAllComprehensiveTests() external'],
                    signer
                );
                
                const testTx = await comprehensiveContract.runAllComprehensiveTests({
                    gasLimit: 2000000
                });
                
                console.log(chalk.blue(`📝 Comprehensive test transaction: ${testTx.hash}`));
                const testReceipt = await testTx.wait();
                console.log(chalk.green(`✅ Comprehensive test completed! Gas used: ${testReceipt.gasUsed.toString()}`));
                
            } catch (error) {
                console.log(chalk.yellow(`⚠️ Comprehensive test failed: ${error.message}`));
            }
            
        } catch (error) {
            console.log(chalk.yellow(`⚠️ Basic test failed: ${error.message}`));
        }
        
        console.log(chalk.blue.bold("\n🎉 Deployment completed successfully!"));
        console.log(chalk.gray("You can now interact with your contract on MFEV mainnet"));
        
    } catch (error) {
        console.error(chalk.red(`❌ Deployment failed: ${error.message}`));
        
        if (error.message.includes("timeout")) {
            console.log(chalk.yellow("💡 The transaction may still be processing. Check the transaction hash on the blockchain explorer."));
        }
        
        if (error.message.includes("nonce")) {
            console.log(chalk.yellow("💡 Nonce issue detected. Try running the deployment again."));
        }
        
        process.exit(1);
    }
}

if (require.main === module) {
    freshDeploy()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { freshDeploy }; 