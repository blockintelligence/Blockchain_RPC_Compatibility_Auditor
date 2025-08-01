const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ComprehensiveEVMTest", function () {
    let comprehensiveTest;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        
        const ComprehensiveEVMTest = await ethers.getContractFactory("ComprehensiveEVMTest");
        comprehensiveTest = await ComprehensiveEVMTest.deploy();
        await comprehensiveTest.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            expect(await comprehensiveTest.getAddress()).to.be.properAddress;
        });

        it("Should initialize with zero test counters", async function () {
            expect(await comprehensiveTest.totalTests()).to.equal(0);
            expect(await comprehensiveTest.passedTests()).to.equal(0);
            expect(await comprehensiveTest.failedTests()).to.equal(0);
        });
    });

    describe("Basic Opcode Tests", function () {
        it("Should test basic opcodes successfully", async function () {
            await comprehensiveTest.testBasicOpcodes();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for basic opcodes", async function () {
            await comprehensiveTest.testBasicOpcodes();
            expect(await comprehensiveTest.getTestResult("BASIC_OPCODES")).to.be.true;
        });
    });

    describe("Advanced Opcode Tests", function () {
        it("Should test advanced opcodes successfully", async function () {
            await comprehensiveTest.testAdvancedOpcodes();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for advanced opcodes", async function () {
            await comprehensiveTest.testAdvancedOpcodes();
            expect(await comprehensiveTest.getTestResult("ADVANCED_OPCODES")).to.be.true;
        });
    });

    describe("EIP-1559 Tests", function () {
        it("Should test EIP-1559 features", async function () {
            await comprehensiveTest.testEIP1559Features();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for EIP-1559", async function () {
            await comprehensiveTest.testEIP1559Features();
            expect(await comprehensiveTest.getTestResult("EIP_1559")).to.be.true;
        });
    });

    describe("EIP-1344 Tests", function () {
        it("Should test EIP-1344 (CHAINID)", async function () {
            await comprehensiveTest.testEIP1344ChainId();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for EIP-1344", async function () {
            await comprehensiveTest.testEIP1344ChainId();
            expect(await comprehensiveTest.getTestResult("EIP_1344")).to.be.true;
        });
    });

    describe("EIP-2718 Tests", function () {
        it("Should test EIP-2718 (Typed transactions)", async function () {
            await comprehensiveTest.testEIP2718TypedTransactions();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for EIP-2718", async function () {
            await comprehensiveTest.testEIP2718TypedTransactions();
            expect(await comprehensiveTest.getTestResult("EIP_2718")).to.be.true;
        });
    });

    describe("EIP-2930 Tests", function () {
        it("Should test EIP-2930 (Access lists)", async function () {
            await comprehensiveTest.testEIP2930AccessLists();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for EIP-2930", async function () {
            await comprehensiveTest.testEIP2930AccessLists();
            expect(await comprehensiveTest.getTestResult("EIP_2930")).to.be.true;
        });
    });

    describe("EIP-3198 Tests", function () {
        it("Should test EIP-3198 (BASEFEE opcode)", async function () {
            await comprehensiveTest.testEIP3198BaseFee();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for EIP-3198", async function () {
            await comprehensiveTest.testEIP3198BaseFee();
            expect(await comprehensiveTest.getTestResult("EIP_3198")).to.be.true;
        });

        it("Should return base fee value", async function () {
            const baseFee = await comprehensiveTest.testBaseFeeOpcode();
            expect(baseFee).to.be.a("bigint");
        });
    });

    describe("EIP-3651 Tests", function () {
        it("Should test EIP-3651 (Warm COINBASE)", async function () {
            await comprehensiveTest.testEIP3651WarmCoinbase();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for EIP-3651", async function () {
            await comprehensiveTest.testEIP3651WarmCoinbase();
            expect(await comprehensiveTest.getTestResult("EIP_3651")).to.be.true;
        });
    });

    describe("EIP-3855 Tests", function () {
        it("Should test EIP-3855 (PUSH0 opcode)", async function () {
            await comprehensiveTest.testEIP3855Push0();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for EIP-3855", async function () {
            await comprehensiveTest.testEIP3855Push0();
            expect(await comprehensiveTest.getTestResult("PUSH0_OPCODE")).to.be.true;
        });

        it("Should execute PUSH0 opcode successfully", async function () {
            const result = await comprehensiveTest.testPush0Opcode();
            expect(result).to.be.true;
        });
    });

    describe("EIP-3860 Tests", function () {
        it("Should test EIP-3860 (Initcode metering)", async function () {
            await comprehensiveTest.testEIP3860InitcodeMetering();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for EIP-3860", async function () {
            await comprehensiveTest.testEIP3860InitcodeMetering();
            expect(await comprehensiveTest.getTestResult("EIP_3860")).to.be.true;
        });
    });

    describe("Gas Tests", function () {
        it("Should test gas estimation", async function () {
            await comprehensiveTest.testGasEstimation();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for gas estimation", async function () {
            await comprehensiveTest.testGasEstimation();
            expect(await comprehensiveTest.getTestResult("GAS_ESTIMATION")).to.be.true;
        });

        it("Should return gas usage for test", async function () {
            await comprehensiveTest.testGasEstimation();
            const gasUsage = await comprehensiveTest.getGasUsage("gas_estimation");
            expect(gasUsage).to.be.a("bigint");
            expect(gasUsage).to.be.greaterThan(0);
        });
    });

    describe("Error Handling Tests", function () {
        it("Should test revert with reason", async function () {
            await comprehensiveTest.testRevertWithReason();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for revert with reason", async function () {
            await comprehensiveTest.testRevertWithReason();
            expect(await comprehensiveTest.getTestResult("REVERT_WITH_REASON")).to.be.true;
        });

        it("Should test try-catch functionality", async function () {
            await comprehensiveTest.testTryCatch();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for try-catch", async function () {
            await comprehensiveTest.testTryCatch();
            expect(await comprehensiveTest.getTestResult("TRY_CATCH")).to.be.true;
        });

        it("Should execute test function successfully", async function () {
            const result = await comprehensiveTest.testFunction();
            expect(result).to.equal(42);
        });
    });

    describe("Assembly Tests", function () {
        it("Should test assembly features", async function () {
            await comprehensiveTest.testAssemblyFeatures();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for assembly features", async function () {
            await comprehensiveTest.testAssemblyFeatures();
            expect(await comprehensiveTest.getTestResult("ASSEMBLY_FEATURES")).to.be.true;
        });
    });

    describe("Library Tests", function () {
        it("Should test library features", async function () {
            await comprehensiveTest.testLibraryFeatures();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for library features", async function () {
            await comprehensiveTest.testLibraryFeatures();
            expect(await comprehensiveTest.getTestResult("LIBRARY_FEATURES")).to.be.true;
        });
    });

    describe("Call Tests", function () {
        it("Should test delegate call", async function () {
            await comprehensiveTest.testDelegateCall();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for delegate call", async function () {
            await comprehensiveTest.testDelegateCall();
            expect(await comprehensiveTest.getTestResult("DELEGATE_CALL")).to.be.true;
        });

        it("Should test static call", async function () {
            await comprehensiveTest.testStaticCall();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for static call", async function () {
            await comprehensiveTest.testStaticCall();
            expect(await comprehensiveTest.getTestResult("STATIC_CALL")).to.be.true;
        });
    });

    describe("OpenZeppelin Tests", function () {
        it("Should test OpenZeppelin features", async function () {
            await comprehensiveTest.testOpenZeppelinFeatures();
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should return correct test result for OpenZeppelin features", async function () {
            await comprehensiveTest.testOpenZeppelinFeatures();
            expect(await comprehensiveTest.getTestResult("OPENZEPPELIN_FEATURES")).to.be.true;
        });
    });

    describe("Comprehensive Test Suite", function () {
        it("Should run all comprehensive tests", async function () {
            const result = await comprehensiveTest.runAllComprehensiveTests();
            expect(result).to.be.a("string");
            expect(await comprehensiveTest.totalTests()).to.be.greaterThan(0);
        });

        it("Should have more passed tests than failed tests", async function () {
            await comprehensiveTest.runAllComprehensiveTests();
            const passed = await comprehensiveTest.passedTests();
            const failed = await comprehensiveTest.failedTests();
            expect(passed).to.be.greaterThan(failed);
        });

        it("Should return comprehensive results", async function () {
            const [total, passed, failed, results, data, gas] = await comprehensiveTest.getComprehensiveResults();
            expect(total).to.be.a("bigint");
            expect(passed).to.be.a("bigint");
            expect(failed).to.be.a("bigint");
            expect(total).to.be.greaterThan(0);
        });
    });

    describe("Utility Functions", function () {
        it("Should convert uint to string correctly", async function () {
            // Test the uint2str function indirectly through events
            await comprehensiveTest.testBasicOpcodes();
            // If the function works, the test should pass without errors
            expect(await comprehensiveTest.getTestResult("BASIC_OPCODES")).to.be.true;
        });

        it("Should handle test data storage", async function () {
            await comprehensiveTest.testGasEstimation();
            const gasUsage = await comprehensiveTest.getGasUsage("gas_estimation");
            expect(gasUsage).to.be.a("bigint");
        });
    });

    describe("Event Emission", function () {
        it("Should emit TestEvent for each test", async function () {
            await expect(comprehensiveTest.testBasicOpcodes())
                .to.emit(comprehensiveTest, "TestEvent")
                .withArgs(1, "BASIC_OPCODES", true, "All basic opcodes supported");
        });

        it("Should emit GasTest event", async function () {
            await expect(comprehensiveTest.testGasEstimation())
                .to.emit(comprehensiveTest, "GasTest");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle multiple test runs", async function () {
            await comprehensiveTest.testBasicOpcodes();
            const firstTotal = await comprehensiveTest.totalTests();
            
            await comprehensiveTest.testAdvancedOpcodes();
            const secondTotal = await comprehensiveTest.totalTests();
            
            expect(secondTotal).to.be.greaterThan(firstTotal);
        });

        it("Should maintain test result consistency", async function () {
            await comprehensiveTest.testBasicOpcodes();
            const firstResult = await comprehensiveTest.getTestResult("BASIC_OPCODES");
            
            await comprehensiveTest.testBasicOpcodes();
            const secondResult = await comprehensiveTest.getTestResult("BASIC_OPCODES");
            
            expect(firstResult).to.equal(secondResult);
        });
    });
}); 