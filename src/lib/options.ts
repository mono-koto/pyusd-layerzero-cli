import {concat, type Hex, toHex} from 'viem'

/**
 * Build LayerZero executor options for lzReceive
 *
 * Options format (for executor):
 * - Type 3 options: [uint16 optionType][uint256 gasLimit][uint256 msgValue]
 *
 * See: https://docs.layerzero.network/v2/developers/evm/configuration/options
 */

// Option types
const OPTION_TYPE_LZRECEIVE = 1

// Default gas limit for OFT lzReceive (200000 is typical for OFT)
export const DEFAULT_GAS_LIMIT = 200_000n

/**
 * Build extra options for a simple OFT transfer
 * This encodes the gas limit for the lzReceive call on the destination chain
 */
export function buildLzReceiveOptions(gasLimit: bigint = DEFAULT_GAS_LIMIT): Hex {
  // Options V2 format:
  // - 2 bytes: options type (0x0003 for type 3)
  // - 1 byte: worker ID (0x01 for executor)
  // - 2 bytes: option length
  // - option data

  // For lzReceive: [optionType(1)][gasLimit(16bytes)]
  // Simplified encoding for OFT:

  // Create options using the Options library format
  // Type 3 executor options with lzReceive gas
  const workerIdExecutor = 0x01
  const optionTypeLzReceive = OPTION_TYPE_LZRECEIVE

  // Encode as: optionsType(2) + workerId(1) + size(2) + optionType(1) + gasLimit(16)
  const gasLimitBytes = toHex(gasLimit, {size: 16})

  // Build the option: type (1 byte) + gas (16 bytes) = 17 bytes
  const optionData = concat([toHex(optionTypeLzReceive, {size: 1}), gasLimitBytes])

  // Build full options: optionsType(2) + workerId(1) + length(2) + data
  const optionsType = toHex(0x00_03, {size: 2})
  const workerId = toHex(workerIdExecutor, {size: 1})

  return concat([optionsType, workerId, toHex(17, {size: 2}), optionData])
}

/**
 * Get empty options (use default executor settings)
 */
export function emptyOptions(): Hex {
  return '0x'
}
