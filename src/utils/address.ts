import {type Address, type Hex, pad, slice} from 'viem'

/**
 * Convert a 20-byte Ethereum address to a 32-byte padded format
 * Required by LayerZero for cross-chain addressing
 */
export function addressToBytes32(address: Address): Hex {
  return pad(address, {size: 32})
}

/**
 * Extract a 20-byte address from a 32-byte padded format
 */
export function bytes32ToAddress(bytes32: Hex): Address {
  return slice(bytes32, 12, 32) as Address
}
