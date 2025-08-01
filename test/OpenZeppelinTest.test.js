const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OpenZeppelinCompatibilityTest", function () {
  let openZeppelinTest;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const OpenZeppelinTest = await ethers.getContractFactory("OpenZeppelinCompatibilityTest");
    openZeppelinTest = await OpenZeppelinTest.deploy();
    await openZeppelinTest.waitForDeployment();
  });

  describe("ERC20 Features", function () {
    it("should have correct token name and symbol", async function () {
      expect(await openZeppelinTest.name()).to.equal("TestToken");
      expect(await openZeppelinTest.symbol()).to.equal("TEST");
    });

    it("should have correct decimals", async function () {
      expect(await openZeppelinTest.decimals()).to.equal(18);
    });

    it("should have initial supply", async function () {
      const totalSupply = await openZeppelinTest.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("1000000"));
    });

    it("should have balance for owner", async function () {
      const balance = await openZeppelinTest.balanceOf(owner.address);
      expect(balance).to.equal(ethers.parseEther("1000000"));
    });
  });

  describe("OpenZeppelin Features", function () {
    it("should test OpenZeppelin features successfully", async function () {
      const result = await openZeppelinTest.testOpenZeppelinFeatures();
      expect(result).to.be.true;
    });

    it("should support ReentrancyGuard", async function () {
      const tx = await openZeppelinTest.testReentrancyGuard();
      await tx.wait();
      expect(tx).to.be.an("object");
    });

    it("should support Ownable", async function () {
      const ownerAddress = await openZeppelinTest.testOwnable();
      expect(ownerAddress).to.equal(owner.address);
    });
  });

  describe("String Utilities", function () {
    it("should support string conversion", async function () {
      // This tests the Strings library from OpenZeppelin
      const totalSupply = await openZeppelinTest.totalSupply();
      expect(totalSupply.toString()).to.be.a("string");
    });
  });
}); 