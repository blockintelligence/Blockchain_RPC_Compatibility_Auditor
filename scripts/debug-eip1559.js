require("dotenv").config();
const { ethers } = require("hardhat");

async function debugEIP1559() {
  console.log("🔍 Debugging EIP-1559 detection on Ethereum Mainnet");
  
  const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
  
  try {
    const block = await provider.getBlock("latest");
    console.log("Block number:", block.number);
    console.log("Base fee per gas:", block.baseFeePerGas);
    console.log("Base fee type:", typeof block.baseFeePerGas);
    console.log("Base fee truthy:", !!block.baseFeePerGas);
    console.log("Base fee > 0:", block.baseFeePerGas > 0);
    console.log("Base fee !== undefined:", block.baseFeePerGas !== undefined);
    console.log("Base fee !== undefined && > 0:", block.baseFeePerGas !== undefined && block.baseFeePerGas > 0);
    
    const hasBaseFee = block.baseFeePerGas !== undefined && block.baseFeePerGas > 0;
    console.log("Final hasBaseFee result:", hasBaseFee);
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

debugEIP1559(); 