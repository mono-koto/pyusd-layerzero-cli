import {arbitrum, type Chain, mainnet, polygon} from 'viem/chains'

import type {ChainConfig} from '../types/index.js'

// PYUSD OFT addresses from LayerZero metadata
// These are the ProxyOFT adapters that enable cross-chain transfers
export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  arbitrum: {
    blockExplorer: 'https://arbiscan.io',
    chainId: 42_161,
    chainKey: 'arbitrum',
    eid: 30_110, // LayerZero V2 endpoint ID
    name: 'Arbitrum',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    pyusdAddress: '0xfab5891ed867a1195303251912013b92c4fc3a1d',
    rpcUrl: process.env.PYUSD_RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
  },
  ethereum: {
    blockExplorer: 'https://etherscan.io',
    chainId: 1,
    chainKey: 'ethereum',
    eid: 30_101, // LayerZero V2 endpoint ID
    name: 'Ethereum',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    pyusdAddress: '0xa2c323fe5a74adffad2bf3e007e36bb029606444',
    rpcUrl: process.env.PYUSD_RPC_ETHEREUM || 'https://eth.llamarpc.com',
  },
  polygon: {
    blockExplorer: 'https://polygonscan.com',
    chainId: 137,
    chainKey: 'polygon',
    eid: 30_109, // LayerZero V2 endpoint ID
    name: 'Polygon',
    nativeCurrency: {
      decimals: 18,
      name: 'POL',
      symbol: 'POL',
    },
    pyusdAddress: '0xfab5891ed867a1195303251912013b92c4fc3a1d',
    rpcUrl: process.env.PYUSD_RPC_POLYGON || 'https://polygon.llamarpc.com',
  },
}

// Map chain keys to viem chain definitions
const VIEM_CHAINS: Record<string, Chain> = {
  arbitrum,
  ethereum: mainnet,
  polygon,
}

export function getChainConfig(chainKey: string): ChainConfig {
  const config = CHAIN_CONFIGS[chainKey.toLowerCase()]
  if (!config) {
    const supported = Object.keys(CHAIN_CONFIGS).join(', ')
    throw new Error(`Chain "${chainKey}" not supported. Supported chains: ${supported}`)
  }

  return config
}

export function getViemChain(chainKey: string): Chain {
  const chain = VIEM_CHAINS[chainKey.toLowerCase()]
  if (!chain) {
    throw new Error(`Chain "${chainKey}" not found`)
  }

  return chain
}

export function getSupportedChains(): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS)
}
