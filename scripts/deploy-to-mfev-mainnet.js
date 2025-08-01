require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");
const ora = require("ora").default;

/**
 * Deploy ComprehensiveEVMTest to MFEV Mainnet
 * This script deploys the contract using a private key for mainnet deployment
 */
class MFEVMainnetDeployer {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.deploymentInfo = {};
    }

    async initialize() {
        const spinner = ora("Initializing MFEV mainnet deployment...").start();
        
        try {
            // Check if private key is provided
            if (!process.env.PRIVATE_KEY) {
                throw new Error("PRIVATE_KEY environment variable is required for mainnet deployment");
            }

            // Initialize provider and signer
            this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            
            // Check balance
            const balance = await this.provider.getBalance(this.signer.address);
            const balanceEth = ethers.formatEther(balance);
            
            spinner.succeed(`Connected to MFEV mainnet with address: ${this.signer.address}`);
            console.log(chalk.blue(`   Balance: ${balanceEth} ETH`));
            
            if (parseFloat(balanceEth) < 0.01) {
                console.log(chalk.yellow("   ⚠️  Low balance detected. Ensure sufficient funds for deployment."));
            }
            
            this.deploymentInfo.address = this.signer.address;
            this.deploymentInfo.balance = balanceEth;
            
        } catch (error) {
            spinner.fail(`Initialization failed: ${error.message}`);
            throw error;
        }
    }

    async deployContract() {
        const spinner = ora("Deploying ComprehensiveEVMTest to MFEV mainnet...").start();
        
        try {
            // Get contract factory
            const ComprehensiveEVMTest = await ethers.getContractFactory("ComprehensiveEVMTest");
            
            // Estimate gas
            const deploymentData = ComprehensiveEVMTest.interface.encodeDeploy();
            const estimatedGas = await this.provider.estimateGas({
                from: this.signer.address,
                data: deploymentData
            });
            
            console.log(chalk.blue(`   Estimated gas: ${estimatedGas.toString()}`));
            
            // Deploy contract with higher gas limit
            this.contract = await ComprehensiveEVMTest.connect(this.signer).deploy({
                gasLimit: 500000, // Set higher gas limit for mainnet deployment
                gasPrice: process.env.GAS_PRICE ? BigInt(process.env.GAS_PRICE) : undefined
            });
            
            // Wait for deployment
            const deploymentReceipt = await this.contract.waitForDeployment();
            const contractAddress = await this.contract.getAddress();
            
            // Get deployment transaction details
            const deploymentTx = await this.provider.getTransaction(deploymentReceipt.hash);
            const deploymentBlock = await this.provider.getBlock(deploymentReceipt.blockNumber);
            
            spinner.succeed(`Contract deployed successfully!`);
            
            // Store deployment information
            this.deploymentInfo.contractAddress = contractAddress;
            this.deploymentInfo.deploymentTx = deploymentReceipt.hash;
            this.deploymentInfo.blockNumber = deploymentReceipt.blockNumber;
            this.deploymentInfo.gasUsed = deploymentReceipt.gasUsed.toString();
            this.deploymentInfo.gasPrice = deploymentTx.gasPrice.toString();
            this.deploymentInfo.totalCost = (deploymentReceipt.gasUsed * deploymentTx.gasPrice).toString();
            this.deploymentInfo.timestamp = new Date(deploymentBlock.timestamp * 1000).toISOString();
            
            console.log(chalk.green(`   Contract Address: ${contractAddress}`));
            console.log(chalk.green(`   Transaction Hash: ${deploymentReceipt.hash}`));
            console.log(chalk.green(`   Block Number: ${deploymentReceipt.blockNumber}`));
            console.log(chalk.green(`   Gas Used: ${deploymentReceipt.gasUsed.toString()}`));
            console.log(chalk.green(`   Total Cost: ${ethers.formatEther(this.deploymentInfo.totalCost)} ETH`));
            
        } catch (error) {
            spinner.fail(`Deployment failed: ${error.message}`);
            throw error;
        }
    }

    async runComprehensiveTests() {
        const spinner = ora("Running comprehensive tests on MFEV mainnet...").start();
        
        try {
            // Run the comprehensive test
            const tx = await this.contract.runAllComprehensiveTests({
                gasLimit: 2000000, // Set reasonable gas limit
                gasPrice: process.env.GAS_PRICE ? BigInt(process.env.GAS_PRICE) : undefined
            });
            
            console.log(chalk.blue(`   Test transaction submitted: ${tx.hash}`));
            
            // Wait for transaction
            const receipt = await tx.wait();
            
            spinner.succeed("Comprehensive tests completed on mainnet!");
            
            // Parse test results from events
            const testResults = this.parseTestEvents(receipt.logs);
            
            this.deploymentInfo.testResults = testResults;
            this.deploymentInfo.testTx = tx.hash;
            this.deploymentInfo.testGasUsed = receipt.gasUsed.toString();
            this.deploymentInfo.testBlockNumber = receipt.blockNumber;
            
            console.log(chalk.green(`   Test Transaction: ${tx.hash}`));
            console.log(chalk.green(`   Test Gas Used: ${receipt.gasUsed.toString()}`));
            
        } catch (error) {
            spinner.fail(`Test execution failed: ${error.message}`);
            console.log(chalk.yellow("   Note: This might be due to unsupported features on mainnet"));
            this.deploymentInfo.testError = error.message;
        }
    }

    parseTestEvents(logs) {
        const testResults = {};
        const testDetails = {};
        
        logs.forEach((log, index) => {
            try {
                const parsed = this.contract.interface.parseLog(log);
                if (parsed && parsed.name === "TestEvent") {
                    const testName = parsed.args[1];
                    const result = parsed.args[2];
                    const details = parsed.args[3];
                    
                    testResults[testName] = result;
                    testDetails[testName] = details;
                }
            } catch (error) {
                // Skip logs that can't be parsed
            }
        });
        
        return { testResults, testDetails };
    }

    async testIndividualFeatures() {
        const spinner = ora("Testing individual features on mainnet...").start();
        
        try {
            const individualTests = {};
            
            // Test key features individually
            const features = [
                'testBasicOpcodes',
                'testAdvancedOpcodes', 
                'testEIP1559Features',
                'testEIP1344ChainId',
                'testGasEstimation'
            ];
            
            for (const feature of features) {
                try {
                    await this.contract[feature]();
                    individualTests[feature] = true;
                } catch (error) {
                    individualTests[feature] = false;
                    console.log(chalk.yellow(`   ${feature}: ${error.message}`));
                }
            }
            
            this.deploymentInfo.individualTests = individualTests;
            spinner.succeed("Individual feature tests completed");
            
        } catch (error) {
            spinner.fail(`Individual tests failed: ${error.message}`);
            this.deploymentInfo.individualTestError = error.message;
        }
    }

    async generateMainnetReport() {
        const spinner = ora("Generating mainnet deployment report...").start();
        
        try {
            // Calculate compatibility score
            const testResults = this.deploymentInfo.testResults?.testResults || {};
            const totalTests = Object.keys(testResults).length;
            const passedTests = Object.values(testResults).filter(Boolean).length;
            const compatibilityScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
            
            const report = {
                deployment: this.deploymentInfo,
                compatibilityScore,
                totalTests,
                passedTests,
                failedTests: totalTests - passedTests,
                timestamp: new Date().toISOString(),
                network: "MFEV Mainnet",
                rpcUrl: process.env.RPC_URL,
                chainId: process.env.CHAIN_ID
            };
            
            this.deploymentInfo.report = report;
            spinner.succeed("Mainnet report generated");
            
        } catch (error) {
            spinner.fail(`Report generation failed: ${error.message}`);
        }
    }

    printMainnetReport() {
        console.log("\n" + "=".repeat(80));
        console.log(chalk.blue.bold("🚀 MFEV MAINNET DEPLOYMENT & TESTING REPORT"));
        console.log("=".repeat(80));

        // Deployment Information
        console.log(chalk.yellow("\n📡 DEPLOYMENT STATUS:"));
        console.log(`   Deployer Address: ${this.deploymentInfo.address}`);
        console.log(`   Contract Address: ${this.deploymentInfo.contractAddress}`);
        console.log(`   Deployment TX: ${this.deploymentInfo.deploymentTx}`);
        console.log(`   Block Number: ${this.deploymentInfo.blockNumber}`);
        console.log(`   Gas Used: ${this.deploymentInfo.gasUsed}`);
        console.log(`   Total Cost: ${ethers.formatEther(this.deploymentInfo.totalCost)} ETH`);
        console.log(`   Timestamp: ${this.deploymentInfo.timestamp}`);

        // Test Results
        if (this.deploymentInfo.testResults) {
            console.log(chalk.yellow("\n🔧 MAINNET TEST RESULTS:"));
            const testResults = this.deploymentInfo.testResults.testResults || {};
            Object.entries(testResults).forEach(([test, result]) => {
                const status = result ? chalk.green("✅") : chalk.red("❌");
                console.log(`   ${status} ${test}: ${result ? "Supported" : "Not Supported"}`);
            });
        }

        // Individual Tests
        if (this.deploymentInfo.individualTests) {
            console.log(chalk.yellow("\n⚡ INDIVIDUAL FEATURE TESTS:"));
            Object.entries(this.deploymentInfo.individualTests).forEach(([feature, result]) => {
                const status = result ? chalk.green("✅") : chalk.red("❌");
                console.log(`   ${status} ${feature}: ${result ? "Working" : "Failed"}`);
            });
        }

        // Compatibility Score
        if (this.deploymentInfo.report) {
            console.log(chalk.yellow("\n📊 MAINNET COMPATIBILITY:"));
            console.log(`   Overall Score: ${this.deploymentInfo.report.compatibilityScore}%`);
            console.log(`   Tests Passed: ${this.deploymentInfo.report.passedTests}/${this.deploymentInfo.report.totalTests}`);
            console.log(`   Network: MFEV Mainnet`);
            console.log(`   Chain ID: ${process.env.CHAIN_ID}`);
        }

        // Errors
        if (this.deploymentInfo.testError) {
            console.log(chalk.red("\n🚨 TEST ERRORS:"));
            console.log(`   ${this.deploymentInfo.testError}`);
        }

        console.log("\n" + "=".repeat(80));
    }

    async saveMainnetReport() {
        const fs = require("fs");
        const filename = `mfev-mainnet-deployment-${Date.now()}.json`;
        
        fs.writeFileSync(filename, JSON.stringify(this.deploymentInfo, null, 2));
        console.log(chalk.green(`\n📄 Mainnet report saved to: ${filename}`));
    }

    async runFullMainnetDeployment() {
        try {
            console.log(chalk.blue.bold("🚀 Starting MFEV Mainnet Deployment"));
            console.log(chalk.gray("This will deploy and test the contract on MFEV mainnet\n"));

            await this.initialize();
            await this.deployContract();
            await this.runComprehensiveTests();
            await this.testIndividualFeatures();
            await this.generateMainnetReport();
            this.printMainnetReport();
            await this.saveMainnetReport();
            
            return this.deploymentInfo;
        } catch (error) {
            console.error(chalk.red(`❌ Mainnet deployment failed: ${error.message}`));
            throw error;
        }
    }
}

async function main() {
    const deployer = new MFEVMainnetDeployer();
    await deployer.runFullMainnetDeployment();
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { MFEVMainnetDeployer }; 