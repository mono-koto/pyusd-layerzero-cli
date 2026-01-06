import {formatUnits, parseUnits} from 'viem'

// PYUSD uses 6 decimals (stablecoin standard)
export const PYUSD_DECIMALS = 6

/**
 * Parse a human-readable PYUSD amount to bigint (local decimals)
 */
export function parseAmount(amount: string): bigint {
  return parseUnits(amount, PYUSD_DECIMALS)
}

/**
 * Format a bigint PYUSD amount to human-readable string
 */
export function formatAmount(amount: bigint): string {
  return formatUnits(amount, PYUSD_DECIMALS)
}

/**
 * Format a native fee (ETH, etc.) with symbol
 */
export function formatNativeFee(feeWei: bigint, symbol: string): string {
  const formatted = formatUnits(feeWei, 18)
  // Show up to 6 decimal places, trimming trailing zeros
  const trimmed = Number.parseFloat(formatted).toFixed(6).replace(/\.?0+$/, '')
  return `${trimmed} ${symbol}`
}

/**
 * Calculate minimum amount with slippage protection
 */
export function calculateMinAmount(amount: bigint, slippagePercent: number): bigint {
  const slippageBps = BigInt(Math.floor(slippagePercent * 100))
  const minAmount = amount - (amount * slippageBps) / 10_000n
  return minAmount
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
