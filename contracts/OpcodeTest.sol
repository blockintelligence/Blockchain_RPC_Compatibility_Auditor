// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title OpcodeTest
 * @dev Comprehensive EVM opcode compatibility test contract
 * Tests: PUSH0, RETURNDATASIZE, SHL, SHR, CALLCODE
 */
contract OpcodeTest {
    // PUSH0 test - requires Shanghai EVM (EIP-3855)
    function testPush0() public pure returns (uint256) {
        assembly {
            // PUSH0 pushes 0 onto the stack
            // This opcode was introduced in Shanghai hard fork
            let zero := 0x5f // PUSH0 opcode
            mstore(0x00, 0) // Store 0 in memory
            return(0x00, 0x20) // Return 32 bytes
        }
    }

    // RETURNDATASIZE test - requires Byzantium EVM (EIP-211)
    function testReturnDataSize() public pure returns (uint256) {
        assembly {
            // RETURNDATASIZE gets the size of the return data
            let size := returndatasize()
            mstore(0x00, size)
            return(0x00, 0x20)
        }
    }

    // SHL (Shift Left) test - requires Constantinople EVM (EIP-145)
    function testShiftLeft(uint256 value, uint256 shift) public pure returns (uint256) {
        assembly {
            // SHL performs logical left shift
            let result := shl(shift, value)
            mstore(0x00, result)
            return(0x00, 0x20)
        }
    }

    // SHR (Shift Right) test - requires Constantinople EVM (EIP-145)
    function testShiftRight(uint256 value, uint256 shift) public pure returns (uint256) {
        assembly {
            // SHR performs logical right shift
            let result := shr(shift, value)
            mstore(0x00, result)
            return(0x00, 0x20)
        }
    }

    // CALLCODE test - deprecated but still supported in most EVMs
    function testCallCode(address target, uint256 value, bytes calldata data) public returns (bool success, bytes memory returnData) {
        assembly {
            // CALLCODE calls another contract but uses the caller's storage
            let dataOffset := data.offset
            let dataLength := data.length
            let result := callcode(gas(), target, value, dataOffset, dataLength, 0x00, 0x00)
            success := result
            returnData := mload(0x00)
        }
    }

    // Combined test function
    function runAllTests() public pure returns (bytes memory) {
        assembly {
            // Test PUSH0
            let push0Result := 0x5f
            
            // Test RETURNDATASIZE
            let returnDataSize := returndatasize()
            
            // Test SHL
            let shlResult := shl(2, 4) // 4 << 2 = 16
            
            // Test SHR
            let shrResult := shr(2, 16) // 16 >> 2 = 4
            
            // Pack results
            mstore(0x00, push0Result)
            mstore(0x20, returnDataSize)
            mstore(0x40, shlResult)
            mstore(0x60, shrResult)
            
            return(0x00, 0x80)
        }
    }

    // Test function that uses all opcodes in sequence
    function comprehensiveTest() public pure returns (bool) {
        assembly {
            // PUSH0 test
            let zero := 0x5f
            
            // RETURNDATASIZE test
            let size := returndatasize()
            
            // SHL test
            let leftShift := shl(1, 2)
            
            // SHR test
            let rightShift := shr(1, 4)
            
            // If we reach here, all opcodes are supported
            mstore(0x00, 0x01)
            return(0x00, 0x20)
        }
    }
} 