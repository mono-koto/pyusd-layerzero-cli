import { getAddressFromPrivateKey } from './client'

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
