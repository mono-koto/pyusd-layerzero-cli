import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  arbitrum,
  arbitrumSepolia,
  type Chain,
  mainnet,
  polygon,
  sepolia,
} from 'viem/chains'

import type { ChainConfig } from '../types/index'

const __dirname = dirname(fileURLToPath(import.meta.url))
const configDir = join(__dirname, '../../config')

// Determine if we're in testnet mode
export const isTestnet = process.env.TESTNET === 'true' || process.env.TESTNET === '1'

/**
 * Load chain configs from JSON files
 *
 * Loads configuration from config/mainnet.json or config/testnet.json based on TESTNET env var.
 * Applies RPC URL overrides from environment variables (e.g., RPC_ETHEREUM, RPC_ARBITRUM_SEPOLIA).
 *
 * If config file is missing, suggests running `fetch-chains` command.
 */
function loadChainConfigs(): Record<string, ChainConfig> {
  const configFile = isTestnet ? 'testnet.json' : 'mainnet.json'
  const configPath = join(configDir, configFile)

  try {
    const raw = readFileSync(configPath, 'utf-8')
    const configs = JSON.parse(raw) as Record<string, Omit<ChainConfig, 'chainKey' | 'rpcUrl'> & { rpcUrl: string }>

    // Add chainKey and apply RPC overrides from env
    const result: Record<string, ChainConfig> = {}
    for (const [key, config] of Object.entries(configs)) {
      const envKey = `RPC_${key.toUpperCase().replace(/-/g, '_')}`
      result[key] = {
        ...config,
        chainKey: key,
        rpcUrl: process.env[envKey] || config.rpcUrl,
      }
    }
    return result
  } catch (error) {
    console.error(`Error: Failed to load ${configFile}`)
    console.error(`Please run: npm run cli fetch-chains`)
    console.error('')
    console.error(`Alternatively, create ${configPath} manually with chain configurations.`)
    process.exit(1)
  }
}

// Load configs at module load time
export const CHAIN_CONFIGS = loadChainConfigs()

// Map chain keys to viem chain definitions
const VIEM_CHAINS: Record<string, Chain> = {
  arbitrum,
  'arbitrum-sepolia': arbitrumSepolia,
  ethereum: mainnet,
  'ethereum-sepolia': sepolia,
  polygon,
  sepolia, // alias
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
