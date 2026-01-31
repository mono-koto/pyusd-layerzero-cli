// Re-export library functions for programmatic use

// Chain configuration
export {
  getChainConfig,
  getSupportedChains,
  getViemChain,
  CHAIN_CONFIGS,
  getPyusdChains,
  getPyusd0Chains,
  resolveChainConfigsForTransfer,
  isEvmChain,
  isSolanaChain,
} from './lib/chains'

// EVM Client utilities
export {
  createPublicClientForChain,
  createWalletClientForChain,
  getAddressFromPrivateKey,
} from './lib/client'

// Solana Client utilities
export {
  createSolanaConnection,
  createSolanaKeypair,
  getSolanaAddressFromPrivateKey,
  executeSolanaTransaction,
} from './lib/solana-client'

// Stargate API
export {
  fetchStargateQuote,
  executeStargateTransfer,
  executeSolanaStargateTransfer,
  calculateMinAmount,
} from './lib/stargate'

// Formatting utilities
export {
  formatAmount,
  parseAmount,
  truncateAddress,
  PYUSD_DECIMALS,
} from './utils/format'

// Types
export type { ChainConfig } from './types/index'
export type {
  StargateQuoteParams,
  StargateQuote,
  StargateQuoteResult,
  StargateTransferResult,
  SolanaTransferResult,
  StargateStep,
} from './lib/stargate'
