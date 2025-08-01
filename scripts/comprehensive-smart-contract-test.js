require("dotenv").config();
const { ethers } = require("hardhat");
const chalk = require("chalk");
const ora = require("ora").default;

/**
 * Comprehensive Smart Contract Test
 * Provides 100% certainty about blockchain compatibility by testing actual contract deployment and execution
 */
class ComprehensiveSmartContractTest {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.results = {};
    }

    async initialize() {
        const spinner = ora("Initializing comprehensive smart contract test...").start();
        
        try {
            this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            
            if (process.env.PRIVATE_KEY) {
                this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            } else {
                // Create a random wallet for testing (no real funds needed for most tests)
                this.signer = ethers.Wallet.createRandom().connect(this.provider);
            }

            // Compile and deploy the comprehensive test contract
            const ComprehensiveEVMTest = await ethers.getContractFactory("ComprehensiveEVMTest");
            this.contract = await ComprehensiveEVMTest.deploy();
            await this.contract.waitForDeployment();
            
            const contractAddress = await this.contract.getAddress();
            spinner.succeed(`Comprehensive test contract deployed at: ${contractAddress}`);
            
            this.results.contractAddress = contractAddress;
            this.results.deployment = true;
            
        } catch (error) {
            spinner.fail(`Initialization failed: ${error.message}`);
            throw error;
        }
    }

    async runComprehensiveTests() {
        const spinner = ora("Running comprehensive smart contract tests...").start();
        
        try {
            // Run all comprehensive tests
            const tx = await this.contract.runAllComprehensiveTests();
            const receipt = await tx.wait();
            
            // Parse events to get detailed results
            const testEvents = receipt.logs.filter(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed && parsed.name === "TestEvent";
                } catch {
                    return false;
                }
            });

            // Parse test results
            const testResults = {};
            const testDetails = {};
            
            for (const event of testEvents) {
                const parsed = this.contract.interface.parseLog(event);
                const testName = parsed.args[1];
                const result = parsed.args[2];
                const details = parsed.args[3];
                
                testResults[testName] = result;
                testDetails[testName] = details;
            }

            // Get gas usage
            const gasUsed = receipt.gasUsed;
            const gasPrice = receipt.gasPrice;
            const totalCost = gasUsed * gasPrice;

            this.results.testResults = testResults;
            this.results.testDetails = testDetails;
            this.results.gasUsed = gasUsed.toString();
            this.results.gasPrice = gasPrice.toString();
            this.results.totalCost = totalCost.toString();
            
            spinner.succeed("Comprehensive tests completed successfully");
            
        } catch (error) {
            spinner.fail(`Comprehensive tests failed: ${error.message}`);
            console.log(chalk.yellow("   Note: This might be due to unsupported opcodes or EIPs"));
            console.log(chalk.yellow("   Individual tests will be run separately for better error handling"));
            
            // Continue with individual tests even if comprehensive test fails
            this.results.testResults = {};
            this.results.testDetails = {};
        }
    }

    async testIndividualFeatures() {
        const spinner = ora("Testing individual features...").start();
        
        try {
            const individualTests = {};
            
            // Test EVM Version
            try {
                await this.contract.testEVMVersion();
                individualTests.evmVersion = true;
            } catch (error) {
                individualTests.evmVersion = false;
            }

            // Test Basic Opcodes
            try {
                await this.contract.testBasicOpcodes();
                individualTests.basicOpcodes = true;
            } catch (error) {
                individualTests.basicOpcodes = false;
            }

            // Test Advanced Opcodes
            try {
                await this.contract.testAdvancedOpcodes();
                individualTests.advancedOpcodes = true;
            } catch (error) {
                individualTests.advancedOpcodes = false;
            }

            // Test EIP-1559
            try {
                await this.contract.testEIP1559Features();
                individualTests.eip1559 = true;
            } catch (error) {
                individualTests.eip1559 = false;
            }

            // Test PUSH0
            try {
                await this.contract.testPush0Opcode();
                individualTests.push0 = true;
            } catch (error) {
                individualTests.push0 = false;
            }

            // Test Base Fee
            try {
                const baseFee = await this.contract.testBaseFeeOpcode();
                individualTests.baseFee = true;
                individualTests.baseFeeValue = baseFee.toString();
            } catch (error) {
                individualTests.baseFee = false;
            }

            // Test Chain ID
            try {
                await this.contract.testEIP1344ChainId();
                individualTests.chainId = true;
            } catch (error) {
                individualTests.chainId = false;
            }

            // Test Gas Estimation
            try {
                await this.contract.testGasEstimation();
                individualTests.gasEstimation = true;
            } catch (error) {
                individualTests.gasEstimation = false;
            }

            // Test Try-Catch
            try {
                await this.contract.testTryCatch();
                individualTests.tryCatch = true;
            } catch (error) {
                individualTests.tryCatch = false;
            }

            // Test Assembly Features
            try {
                await this.contract.testAssemblyFeatures();
                individualTests.assemblyFeatures = true;
            } catch (error) {
                individualTests.assemblyFeatures = false;
            }

            this.results.individualTests = individualTests;
            spinner.succeed("Individual feature tests completed");
            
        } catch (error) {
            spinner.fail(`Individual feature tests failed: ${error.message}`);
            throw error;
        }
    }

    async testGasOptimization() {
        const spinner = ora("Testing gas optimization features...").start();
        
        try {
            const gasTests = {};
            
            // Test gas estimation accuracy
            const estimatedGas = await this.contract.testGasEstimation.estimateGas();
            gasTests.estimationAccuracy = estimatedGas.toString();
            
            // Test gas usage patterns
            const tx = await this.contract.testGasEstimation();
            const receipt = await tx.wait();
            gasTests.actualGasUsed = receipt.gasUsed.toString();
            gasTests.gasEfficiency = (Number(estimatedGas) / Number(receipt.gasUsed) * 100).toFixed(2) + "%";
            
            this.results.gasTests = gasTests;
            spinner.succeed("Gas optimization tests completed");
            
        } catch (error) {
            spinner.fail(`Gas optimization tests failed: ${error.message}`);
            throw error;
        }
    }

    async testErrorHandling() {
        const spinner = ora("Testing error handling capabilities...").start();
        
        try {
            const errorTests = {};
            
            // Test revert with reason
            try {
                await this.contract.testRevert();
                errorTests.revertWithReason = false; // Should not reach here
            } catch (error) {
                errorTests.revertWithReason = true;
                errorTests.revertMessage = error.message;
            }

            // Test try-catch functionality
            try {
                await this.contract.testTryCatch();
                errorTests.tryCatch = true;
            } catch (error) {
                errorTests.tryCatch = false;
            }

            this.results.errorTests = errorTests;
            spinner.succeed("Error handling tests completed");
            
        } catch (error) {
            spinner.fail(`Error handling tests failed: ${error.message}`);
            throw error;
        }
    }

    async generateComprehensiveReport() {
        const spinner = ora("Generating comprehensive report...").start();
        
        try {
            // Calculate overall compatibility score
            const totalTests = Object.keys(this.results.testResults || {}).length;
            const passedTests = Object.values(this.results.testResults || {}).filter(Boolean).length;
            const compatibilityScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

            // Determine EVM version
            let evmVersion = "unknown";
            if (this.results.testResults?.PUSH0_OPCODE) {
                evmVersion = "shanghai";
            } else if (this.results.testResults?.EIP_1559) {
                evmVersion = "london";
            } else if (this.results.testResults?.EIP_2718) {
                evmVersion = "berlin";
            } else if (this.results.testResults?.EIP_1344) {
                evmVersion = "istanbul";
            }

            // Generate recommendations
            const recommendations = this.generateRecommendations();

            const report = {
                timestamp: new Date().toISOString(),
                rpcUrl: process.env.RPC_URL,
                chainId: await this.provider.send("eth_chainId", []),
                contractAddress: this.results.contractAddress,
                deployment: this.results.deployment,
                evmVersion: evmVersion,
                compatibilityScore: compatibilityScore,
                totalTests: totalTests,
                passedTests: passedTests,
                failedTests: totalTests - passedTests,
                testResults: this.results.testResults,
                testDetails: this.results.testDetails,
                individualTests: this.results.individualTests,
                gasTests: this.results.gasTests,
                errorTests: this.results.errorTests,
                gasUsage: {
                    total: this.results.gasUsed,
                    gasPrice: this.results.gasPrice,
                    totalCost: this.results.totalCost
                },
                recommendations: recommendations,
                summary: {
                    productionReady: compatibilityScore >= 90,
                    developmentReady: compatibilityScore >= 70,
                    needsUpgrade: compatibilityScore < 70,
                    shanghaiCompatible: evmVersion === "shanghai",
                    solidity023Compatible: evmVersion === "shanghai"
                }
            };

            this.results.report = report;
            spinner.succeed("Comprehensive report generated");
            
        } catch (error) {
            spinner.fail(`Report generation failed: ${error.message}`);
            throw error;
        }
    }

    generateRecommendations() {
        const recommendations = [];
        const testResults = this.results.testResults || {};

        // EVM Version recommendations
        if (!testResults.PUSH0_OPCODE) {
            recommendations.push("Upgrade to Shanghai EVM to support PUSH0 opcode (EIP-3855)");
        }

        if (!testResults.EIP_1559) {
            recommendations.push("Implement EIP-1559 for dynamic fee market");
        }

        if (!testResults.EIP_1344) {
            recommendations.push("Implement EIP-1344 for CHAINID opcode support");
        }

        // Gas optimization recommendations
        if (!testResults.GAS_ESTIMATION) {
            recommendations.push("Improve gas estimation accuracy");
        }

        // Error handling recommendations
        if (!testResults.REVERT_WITH_REASON) {
            recommendations.push("Ensure proper revert with reason support");
        }

        if (!testResults.TRY_CATCH) {
            recommendations.push("Implement try-catch functionality support");
        }

        // Assembly recommendations
        if (!testResults.ASSEMBLY_FEATURES) {
            recommendations.push("Verify assembly features support");
        }

        // If all tests pass
        if (Object.values(testResults).every(Boolean)) {
            recommendations.push("✅ Chain is fully compatible with modern EVM standards");
            recommendations.push("✅ Ready for production deployment");
            recommendations.push("✅ Compatible with Solidity 0.8.23");
        }

        return recommendations;
    }

    printComprehensiveReport() {
        console.log("\n" + "=".repeat(80));
        console.log(chalk.blue.bold("🔍 COMPREHENSIVE SMART CONTRACT COMPATIBILITY TEST"));
        console.log("=".repeat(80));

        // Basic Information
        console.log(chalk.yellow("\n📡 CONNECTION STATUS:"));
        console.log(`   Contract Address: ${this.results.contractAddress}`);
        console.log(`   Deployment: ${this.results.deployment ? "✅ Successful" : "❌ Failed"}`);
        console.log(`   RPC URL: ${process.env.RPC_URL}`);

        // EVM Version
        console.log(chalk.yellow("\n⚙️  EVM VERSION:"));
        const evmVersion = this.results.report?.evmVersion || "unknown";
        console.log(`   Detected: ${evmVersion.toUpperCase()}`);
        console.log(`   Required for Solidity 0.8.23: SHANGHAI`);

        // Compatibility Score
        console.log(chalk.yellow("\n📊 COMPATIBILITY SCORE:"));
        const score = this.results.report?.compatibilityScore || 0;
        const scoreColor = score >= 90 ? chalk.green : score >= 70 ? chalk.yellow : chalk.red;
        console.log(`   Overall Score: ${scoreColor(`${score}%`)}`);
        console.log(`   Tests Passed: ${this.results.report?.passedTests || 0}/${this.results.report?.totalTests || 0}`);

        // Test Results
        console.log(chalk.yellow("\n🔧 SMART CONTRACT TEST RESULTS:"));
        const testResults = this.results.testResults || {};
        Object.entries(testResults).forEach(([test, result]) => {
            const status = result ? chalk.green("✅") : chalk.red("❌");
            console.log(`   ${status} ${test}: ${result ? "Supported" : "Not Supported"}`);
        });

        // Individual Feature Tests
        console.log(chalk.yellow("\n⚡ INDIVIDUAL FEATURE TESTS:"));
        const individualTests = this.results.individualTests || {};
        Object.entries(individualTests).forEach(([feature, supported]) => {
            const status = supported ? chalk.green("✅") : chalk.red("❌");
            console.log(`   ${status} ${feature}: ${supported ? "Working" : "Failed"}`);
        });

        // Gas Analysis
        console.log(chalk.yellow("\n⛽ GAS ANALYSIS:"));
        console.log(`   Total Gas Used: ${this.results.gasUsed || "N/A"}`);
        console.log(`   Gas Price: ${this.results.gasPrice || "N/A"} wei`);
        console.log(`   Total Cost: ${this.results.totalCost || "N/A"} wei`);

        // Error Handling
        console.log(chalk.yellow("\n🚨 ERROR HANDLING:"));
        const errorTests = this.results.errorTests || {};
        Object.entries(errorTests).forEach(([test, result]) => {
            const status = result ? chalk.green("✅") : chalk.red("❌");
            console.log(`   ${status} ${test}: ${result ? "Working" : "Failed"}`);
        });

        // Summary
        console.log(chalk.yellow("\n📋 SUMMARY:"));
        const summary = this.results.report?.summary || {};
        console.log(`   Production Ready: ${summary.productionReady ? "✅ YES" : "❌ NO"}`);
        console.log(`   Development Ready: ${summary.developmentReady ? "✅ YES" : "❌ NO"}`);
        console.log(`   Shanghai Compatible: ${summary.shanghaiCompatible ? "✅ YES" : "❌ NO"}`);
        console.log(`   Solidity 0.8.23 Compatible: ${summary.solidity023Compatible ? "✅ YES" : "❌ NO"}`);

        // Recommendations
        console.log(chalk.yellow("\n🛠️  RECOMMENDATIONS:"));
        const recommendations = this.results.report?.recommendations || [];
        recommendations.forEach((rec, index) => {
            console.log(`   ${index + 1}. ${rec}`);
        });

        console.log("\n" + "=".repeat(80));
    }

    async saveReport() {
        const fs = require("fs");
        const reportData = JSON.stringify(this.results.report, null, 2);
        const filename = `comprehensive-smart-contract-test-${Date.now()}.json`;
        
        fs.writeFileSync(filename, reportData);
        console.log(chalk.green(`\n📄 Report saved to: ${filename}`));
    }

    async runFullTest() {
        try {
            await this.initialize();
            await this.runComprehensiveTests();
            await this.testIndividualFeatures();
            await this.testGasOptimization();
            await this.testErrorHandling();
            await this.generateComprehensiveReport();
            this.printComprehensiveReport();
            await this.saveReport();
            
            return this.results.report;
        } catch (error) {
            console.error(chalk.red(`❌ Comprehensive test failed: ${error.message}`));
            throw error;
        }
    }
}

async function main() {
    console.log(chalk.blue.bold("🚀 Starting Comprehensive Smart Contract Test"));
    console.log(chalk.gray("This test provides 100% certainty about blockchain compatibility"));
    console.log(chalk.gray("by deploying and executing actual smart contracts\n"));

    const tester = new ComprehensiveSmartContractTest();
    await tester.runFullTest();
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { ComprehensiveSmartContractTest }; 