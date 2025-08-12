# Smart Account Address Debug Script

This directory contains debug script to generate smart account addresses. This script is useful for debugging and verifying smart account address generation.

## Usage

```bash
node debug-smart-account-address.js <factoryAddress> <implementationAddress> <salt> [ownerAddress] [chainId]
```

**Parameters:**
- `factoryAddress` - Smart account factory contract address
- `implementationAddress` - Smart account implementation contract address  
- `salt` - Salt value
- `ownerAddress` - Owner address (EOA that will control the smart account)
- `chainId` - Chain ID (optional, defaults to 1 for Ethereum mainnet)

**Examples:**

```bash
# Generate address for Ethereum mainnet (EVM chain)
node debug-smart-account-address.js \
  0x1234567890123456789012345678901234567890 \
  0x0987654321098765432109876543210987654321 \
  "salt" \
  0xabcdefabcdefabcdefabcdefabcdefabcdefabcd

# Generate address for Polygon
node debug-smart-account-address.js \
  0x1234567890123456789012345678901234567890 \
  0x0987654321098765432109876543210987654321 \
  "salt" \
  0xabcdefabcdefabcdefabcdefabcdefabcdefabcd \
  137

# Generate address for ZKSync (offline calculation)
node debug-smart-account-address.js \
  0x1234567890123456789012345678901234567890 \
  0x0987654321098765432109876543210987654321 \
  "salt" \
  0xabcdefabcdefabcdefabcdefabcdefabcdefabcd \
  324
```

## Supported Chains

The script currently supports the following chains:

- **1**: Ethereum Mainnet
- **137**: Polygon
- **42161**: Arbitrum One  
- **8453**: Base
- **43114**: Avalanche
- **11155111**: Sepolia (Ethereum testnet)
- **80002**: Polygon Amoy (testnet)
- **421614**: Arbitrum Sepolia (testnet)
- **84532**: Base Sepolia (testnet)
- **13337**: Beam Testnet
- **10**: Optimism
- **56**: BNB Smart Chain

### Adding New Chains

If you need to use a chain ID that's not supported, you need to:

1. Import the chain from `viem/chains` in the script
2. Add it to the `CHAINS` object

**Example:**
```javascript
import { mainnet, polygon, arbitrum, yourNewChain } from 'viem/chains';

const CHAINS = {
    1: mainnet,
    137: polygon,
    42161: arbitrum,
    yourChainId: yourNewChain,  // Add your chain here
};
```

**Note**: If the script fails with "Unsupported chain ID", you need to add that chain to the `CHAINS` variable and import it from `viem/chains`.

## How It Works

### EVM Chains (Ethereum, Polygon, Arbitrum, etc.)

1. Converts the salt to a `bytes32` using `keccak256(toBytes(salt))`
2. Calls the factory contract's `getAddressWithNonce(address _admin, bytes32 _nonce)` function
3. The factory contract performs CREATE2 address calculation internally

### ZKSync Chains

1. Converts the salt to a `bytes32` using `keccak256(toBytes(salt))`
2. Creates a ZKSync-specific salt by encoding `[ownerAddress, salt]`
3. Creates proxy input data with implementation address
4. Uses ZKSync's CREATE2 formula with special prefix and bytecode hash

## Example Output

### EVM Chain Output:
```
🔧 Smart Account Address Generator
================================
Factory Address: 0x1234567890123456789012345678901234567890
Implementation Address: 0x0987654321098765432109876543210987654321
Salt: salt
Owner Address: 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
Chain ID: 1

🔄 Using EVM address calculation...
✅ Generated Smart Account Address:
   0x30B064aD19aefC61a799b04E603a93c705196639

🔍 Verification Details:
   Salt Hash: 0x308bce09871e749fe230bc3254a947e851f66369a030f728b9b19b01daed921d
   Chain Type: EVM
```

### ZKSync Chain Output:
```
🔄 Using ZKSync address calculation...
✅ Generated Smart Account Address:
   0x30B064aD19aefC61a799b04E603a93c705196639

🔍 Verification Details:
   Salt Hash: 0x308bce09871e749fe230bc3254a947e851f66369a030f728b9b19b01daed921d
   Chain Type: ZKSync
```
