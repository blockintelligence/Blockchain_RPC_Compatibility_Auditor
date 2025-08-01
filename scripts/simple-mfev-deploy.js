require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");

/**
 * Simple MFEV Mainnet Deployment Script
 * This script provides better feedback and timeout handling
 */
async function main() {
    console.log(chalk.blue.bold("🚀 Starting Simple MFEV Mainnet Deployment"));
    console.log(chalk.gray("This will deploy the ComprehensiveEVMTest contract\n"));

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
        
        // Deploy with higher gas limit
        const gasLimit = Math.max(Number(estimatedGas) * 2, 500000); // Use 2x estimated or 500k minimum
        console.log(chalk.blue(`🎯 Using gas limit: ${gasLimit}`));
        
        console.log(chalk.yellow("🚀 Deploying contract..."));
        const contract = await ComprehensiveEVMTest.connect(signer).deploy({
            gasLimit: gasLimit,
            gasPrice: process.env.GAS_PRICE ? BigInt(process.env.GAS_PRICE) : undefined
        });
        
        console.log(chalk.blue(`📝 Transaction submitted: ${contract.deploymentTransaction().hash}`));
        console.log(chalk.yellow("⏳ Waiting for deployment confirmation..."));
        
        // Wait for deployment with timeout
        const deploymentReceipt = await Promise.race([
            contract.waitForDeployment(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Deployment timeout after 5 minutes")), 5 * 60 * 1000)
            )
        ]);
        
        const contractAddress = await contract.getAddress();
        const deploymentTx = await provider.getTransaction(deploymentReceipt.hash);
        
        console.log(chalk.green("✅ Contract deployed successfully!"));
        console.log(chalk.green(`📍 Contract Address: ${contractAddress}`));
        console.log(chalk.green(`🔗 Transaction Hash: ${deploymentReceipt.hash}`));
        console.log(chalk.green(`📦 Block Number: ${deploymentReceipt.blockNumber}`));
        console.log(chalk.green(`⛽ Gas Used: ${deploymentReceipt.gasUsed.toString()}`));
        console.log(chalk.green(`💰 Total Cost: ${ethers.formatEther(deploymentReceipt.gasUsed * deploymentTx.gasPrice)} ETH`));
        
        // Save deployment info
        const deploymentInfo = {
            contractAddress: contractAddress,
            deploymentTx: deploymentReceipt.hash,
            blockNumber: deploymentReceipt.blockNumber,
            gasUsed: deploymentReceipt.gasUsed.toString(),
            gasPrice: deploymentTx.gasPrice.toString(),
            totalCost: (deploymentReceipt.gasUsed * deploymentTx.gasPrice).toString(),
            timestamp: new Date().toISOString(),
            network: "MFEV Mainnet",
            rpcUrl: process.env.RPC_URL,
            chainId: process.env.CHAIN_ID
        };
        
        const fs = require("fs");
        const filename = `mfev-mainnet-deployment-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
        console.log(chalk.green(`📄 Deployment info saved to: ${filename}`));
        
        // Try to run a simple test
        console.log(chalk.yellow("\n🧪 Testing basic contract functionality..."));
        try {
            const testResult = await contract.testBasicOpcodes();
            console.log(chalk.green("✅ Basic opcodes test passed"));
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
        
        process.exit(1);
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main }; 