#!/usr/bin/env node

/**
 * Debug script to generate smart account addresses
 * Usage: node debug-smart-account-address.js <factoryAddress> <implementationAddress> <salt> [ownerAddress] [chainId]
 */

import { createPublicClient, http, getAddress, keccak256, toBytes, concat, pad, slice, parseAbi, encodeAbiParameters, parseAbiParameters } from 'viem';
import { mainnet, polygon, arbitrum, base, avalanche, sepolia, polygonAmoy, arbitrumSepolia, baseSepolia, beamTestnet, optimism, bsc } from 'viem/chains';

// Chain configurations
const CHAINS = {
    1: mainnet,
    137: polygon, 
    42161: arbitrum,
    8453: base,
    43114: avalanche,
    11155111: sepolia,
    80002: polygonAmoy,
    421614: arbitrumSepolia,
    84532: baseSepolia,
    13337: beamTestnet,
    10: optimism,
    56: bsc,
};

// ZKSync chain IDs
const ZKSYNC_CHAIN_IDS = [324, 300, 280]; // Add ZKSync chain IDs as needed

// Factory ABI - only need getAddressWithNonce function
const FACTORY_ABI = parseAbi([
    'function getAddressWithNonce(address _admin, bytes32 _nonce) view returns (address)'
]);

/**
 * Check if chain is ZKSync
 */
function isZKSyncChain(chainId) {
    return ZKSYNC_CHAIN_IDS.includes(chainId);
}

/**
 * ZKSync CREATE2 address calculation
 */
function create2AddressZkSync(sender, salt, input) {
    const prefix = "0x2020dba91b30cc0006188af794c2fb30dd8520db7e2c088b7fc7c103c00ca494"; // keccak256("zksyncCreate2")
    const zkSyncProxyBytecodeHash = "0x010000a505a8e771299c39236e5ae06861f782f4b9ddcd7ad958faa01720094d";
    const inputHash = keccak256(input);

    return getAddress(
        slice(keccak256(concat([prefix, pad(sender, { size: 32 }), salt, zkSyncProxyBytecodeHash, inputHash])), 12),
    );
}

/**
 * Calculate ZKSync account address
 */
function calculateZksyncAccountAddress(saltHash, factory, owner, implementation) {
    const salt = keccak256(encodeAbiParameters(parseAbiParameters("address, bytes32"), [owner, saltHash]));
    const ProxyInputData = encodeAbiParameters(parseAbiParameters("address, bytes"), [implementation, "0x"]);
    return create2AddressZkSync(factory, salt, ProxyInputData);
}

/**
 * Generate smart account address for EVM chains
 */
async function generateEvmAccountAddress(factoryAddress, salt, ownerAddress, chainId, rpcUrl) {
    try {
        const chain = CHAINS[chainId];
        if (!chain) {
            throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        const client = createPublicClient({
            chain: chain,
            transport: http(rpcUrl)
        });

        const saltHash = keccak256(toBytes(salt));
        
        console.log(`Calling factory contract at ${factoryAddress}`);
        console.log(`Owner: ${ownerAddress}`);
        console.log(`SaltHash: ${saltHash}`);
        
        const address = await client.readContract({
            address: getAddress(factoryAddress),
            abi: FACTORY_ABI,
            functionName: 'getAddressWithNonce',
            args: [getAddress(ownerAddress), saltHash]
        });

        return address;
    } catch (error) {
        throw new Error(`Failed to generate EVM account address: ${error.message}`);
    }
}

/**
 * Generate smart account address for ZKSync chains  
 */
function generateZkSyncAccountAddress(factoryAddress, implementationAddress, salt, ownerAddress) {
    const saltHash = keccak256(toBytes(salt));
    return calculateZksyncAccountAddress(saltHash, getAddress(factoryAddress), getAddress(ownerAddress), getAddress(implementationAddress));
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.log('Usage: node debug-smart-account-address.js <factoryAddress> <implementationAddress> <salt> [ownerAddress] [chainId] [rpcUrl]');
        console.log('');
        console.log('Arguments:');
        console.log('  factoryAddress        - Smart account factory contract address');
        console.log('  implementationAddress - Smart account implementation contract address');
        console.log('  salt                  - Salt value');
        console.log('  ownerAddress          - Owner address (required for EVM chains, optional for display)');
        console.log('  chainId               - Chain ID (default: 1 for Ethereum mainnet)');
        console.log('  rpcUrl                - RPC URL (optional, uses default if not provided)');
        console.log('');
        console.log('Examples:');
        console.log('  # Generate address for Ethereum mainnet');
        console.log('  node debug-smart-account-address.js 0x1234...abcd 0x5678...efgh "salt" 0x9abc...def0');
        console.log('');
        console.log('  # Generate address for ZKSync (will use ZKSync calculation)');
        console.log('  node debug-smart-account-address.js 0x1234...abcd 0x5678...efgh "salt" 0x9abc...def0 324');
        process.exit(1);
    }

    const [factoryAddress, implementationAddress, salt, ownerAddress, chainIdStr, rpcUrl] = args;
    const chainId = chainIdStr ? parseInt(chainIdStr) : 1;

    console.log('🔧 Smart Account Address Generator');
    console.log('================================');
    console.log(`Factory Address: ${factoryAddress}`);
    console.log(`Implementation Address: ${implementationAddress}`);
    console.log(`Salt: ${salt}`);
    console.log(`Owner Address: ${ownerAddress || 'Not provided'}`);
    console.log(`Chain ID: ${chainId}`);
    console.log('');

    try {
        let accountAddress;

        if (isZKSyncChain(chainId)) {
            console.log('🔄 Using ZKSync address calculation...');
            
            if (!ownerAddress) {
                throw new Error('Owner address is required for ZKSync chains');
            }
            
            accountAddress = generateZkSyncAccountAddress(factoryAddress, implementationAddress, salt, ownerAddress);
            
        } else {
            console.log('🔄 Using EVM address calculation...');
            
            if (!ownerAddress) {
                throw new Error('Owner address is required for EVM chains');
            }
            
            accountAddress = await generateEvmAccountAddress(factoryAddress, salt, ownerAddress, chainId, rpcUrl);
        }

        console.log('✅ Generated Smart Account Address:');
        console.log(`   ${accountAddress}`);
        console.log('');
        console.log('🔍 Verification Details:');
        console.log(`   Salt Hash: ${keccak256(toBytes(salt))}`);
        console.log(`   Chain Type: ${isZKSyncChain(chainId) ? 'ZKSync' : 'EVM'}`);
        
    } catch (error) {
        console.error('❌ Error generating smart account address:');
        console.error(`   ${error.message}`);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
    process.exit(1);
});

// Run the script
main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});