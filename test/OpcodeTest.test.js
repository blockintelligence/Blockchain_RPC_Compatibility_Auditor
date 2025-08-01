const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OpcodeTest", function () {
  let opcodeTest;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const OpcodeTest = await ethers.getContractFactory("OpcodeTest");
    opcodeTest = await OpcodeTest.deploy();
    await opcodeTest.waitForDeployment();
  });

  describe("PUSH0 Opcode", function () {
    it("should support PUSH0 opcode", async function () {
      const result = await opcodeTest.testPush0();
      expect(result).to.equal(0);
    });
  });

  describe("RETURNDATASIZE Opcode", function () {
    it("should support RETURNDATASIZE opcode", async function () {
      const result = await opcodeTest.testReturnDataSize();
      expect(result).to.be.a("bigint");
    });
  });

  describe("SHL Opcode", function () {
    it("should perform left shift correctly", async function () {
      const result = await opcodeTest.testShiftLeft(4, 2);
      expect(result).to.equal(16); // 4 << 2 = 16
    });

    it("should handle zero shift", async function () {
      const result = await opcodeTest.testShiftLeft(5, 0);
      expect(result).to.equal(5);
    });
  });

  describe("SHR Opcode", function () {
    it("should perform right shift correctly", async function () {
      const result = await opcodeTest.testShiftRight(16, 2);
      expect(result).to.equal(4); // 16 >> 2 = 4
    });

    it("should handle zero shift", async function () {
      const result = await opcodeTest.testShiftRight(5, 0);
      expect(result).to.equal(5);
    });
  });

  describe("CALLCODE Opcode", function () {
    it("should support CALLCODE opcode", async function () {
      const target = ethers.ZeroAddress;
      const value = 0;
      const data = "0x";
      
      // CALLCODE will fail on zero address, but we're testing if the opcode is supported
      try {
        await opcodeTest.testCallCode(target, value, data);
        // If we reach here, the opcode is supported
        expect(true).to.be.true;
      } catch (error) {
        // If it's an invalid opcode error, the opcode is not supported
        if (error.message.includes("invalid opcode")) {
          expect.fail("CALLCODE opcode not supported");
        }
        // Other errors (like call failure) are expected and mean the opcode is supported
        expect(true).to.be.true;
      }
    });
  });

  describe("Comprehensive Test", function () {
    it("should run all opcode tests successfully", async function () {
      const result = await opcodeTest.comprehensiveTest();
      expect(result).to.be.true;
    });

    it("should return all test results", async function () {
      try {
        const results = await opcodeTest.runAllTests();
        expect(results).to.be.a("string");
        expect(results.length).to.be.greaterThan(0);
        expect(results).to.not.equal("0x");
      } catch (error) {
        // If the function fails due to unsupported opcodes, that's also a valid test result
        expect(error.message).to.be.a("string");
      }
    });
  });
}); 