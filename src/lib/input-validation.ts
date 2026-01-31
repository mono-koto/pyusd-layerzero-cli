import { getAddressFromPrivateKey } from './client'
import { getSolanaAddressFromPrivateKey } from './solana-client'

/**
 * Resolve address from options or environment variable
 *
 * @param options - Options containing optional address
 * @param options.address - Optional address to use
 * @param requirePrivateKey - If true, always requires PRIVATE_KEY even if address provided
 * @returns Resolved Ethereum address
 */
export function resolveAddress(options: {
  address?: string
  requirePrivateKey?: boolean
}): `0x${string}` {
  // If address provided and we don't specifically require private key, use it
  if (options.address && !options.requirePrivateKey) {
    return options.address as `0x${string}`
  }

  // Otherwise, derive from PRIVATE_KEY
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    console.error('Error: Either --address flag or PRIVATE_KEY environment variable is required')
    process.exit(1)
  }

  return getAddressFromPrivateKey(privateKey as `0x${string}`)
}

/**
 * Resolve Solana address from SOLANA_PRIVATE_KEY environment variable
 *
 * @returns Solana address (base58)
 */
export function resolveSolanaAddress(): string {
  const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY
  if (!solanaPrivateKey) {
    console.error('Error: SOLANA_PRIVATE_KEY environment variable is required')
    console.error('       Key should be base58 encoded (Solana CLI format) or 64-byte hex.')
    process.exit(1)
  }

  return getSolanaAddressFromPrivateKey(solanaPrivateKey)
}
