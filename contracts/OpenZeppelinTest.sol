// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title OpenZeppelinCompatibilityTest
 * @dev Tests OpenZeppelin library compatibility
 */
contract OpenZeppelinCompatibilityTest is ERC20, Ownable, ReentrancyGuard {
    using Strings for uint256;

    constructor() ERC20("TestToken", "TEST") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function testOpenZeppelinFeatures() public view returns (bool) {
        // Test various OpenZeppelin features
        string memory tokenName = name();
        string memory tokenSymbol = symbol();
        uint256 totalSupply = totalSupply();
        string memory supplyString = totalSupply.toString();
        
        return bytes(tokenName).length > 0 && 
               bytes(tokenSymbol).length > 0 && 
               totalSupply > 0 &&
               bytes(supplyString).length > 0;
    }

    function testReentrancyGuard() public nonReentrant returns (bool) {
        return true;
    }

    function testOwnable() public view returns (address) {
        return owner();
    }
} 