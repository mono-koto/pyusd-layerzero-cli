/**
 * Solana client utilities for cross-chain transfers
 *
 * Handles Solana-specific transaction signing and submission.
 */

import {
  Connection,
  Keypair,
  VersionedMessage,
  VersionedTransaction,
  clusterApiUrl,
} from '@solana/web3.js'
import bs58 from 'bs58'

// Default Solana RPC (mainnet-beta)
const DEFAULT_SOLANA_RPC = clusterApiUrl('mainnet-beta')

/**
 * Parse a Solana private key from various formats
 *
 * Supports:
 * - Base58 encoded (Solana CLI format, ~88 chars)
 * - Hex encoded with 0x prefix
 * - Hex encoded without prefix
 */
export function parseSolanaPrivateKey(privateKey: string): Uint8Array {
  let keyBytes: Uint8Array

  // Try base58 first (most common for Solana)
  if (!privateKey.startsWith('0x') && privateKey.length > 60) {
    try {
      keyBytes = bs58.decode(privateKey)
      if (keyBytes.length === 64) {
        return keyBytes
      }
    } catch {
      // Not valid base58, try hex
    }
  }

  // Try hex (with or without 0x prefix)
  const hexKey = privateKey.replace(/^0x/, '')
  keyBytes = Buffer.from(hexKey, 'hex')

  if (keyBytes.length !== 64) {
    throw new Error(
      `Invalid Solana private key: expected 64 bytes, got ${keyBytes.length}. ` +
        'Key should be base58 encoded (Solana CLI format) or 64-byte hex.'
    )
  }

  return keyBytes
}

/**
 * Create a Solana keypair from a private key string
 */
export function createSolanaKeypair(privateKey: string): Keypair {
  const keyBytes = parseSolanaPrivateKey(privateKey)
  return Keypair.fromSecretKey(keyBytes)
}

/**
 * Get the public key (address) from a Solana private key
 */
export function getSolanaAddressFromPrivateKey(privateKey: string): string {
  const keypair = createSolanaKeypair(privateKey)
  return keypair.publicKey.toBase58()
}

/**
 * Create a Solana connection
 */
export function createSolanaConnection(rpcUrl?: string): Connection {
  return new Connection(rpcUrl || DEFAULT_SOLANA_RPC, 'confirmed')
}

/**
 * Execute a Stargate transaction on Solana
 *
 * The Stargate API returns transactions as base64-encoded VersionedTransactions.
 * We deserialize, sign, and submit them.
 */
export async function executeSolanaTransaction(
  connection: Connection,
  keypair: Keypair,
  transactionData: string // base64 encoded
): Promise<string> {
  // Deserialize the transaction
  const transactionBuffer = Buffer.from(transactionData, 'base64')
  const versionedMessage = VersionedMessage.deserialize(transactionBuffer)
  const transaction = new VersionedTransaction(versionedMessage)

  // Sign the transaction
  transaction.sign([keypair])

  // Send and confirm
  const signature = await connection.sendTransaction(transaction)

  // Wait for confirmation
  const latestBlockHash = await connection.getLatestBlockhash()
  await connection.confirmTransaction({
    signature,
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
  })

  return signature
}

/**
 * Check if a string looks like a Solana address (base58, 32-44 chars)
 */
export function isSolanaAddress(address: string): boolean {
  // Solana addresses are base58 encoded, typically 32-44 characters
  if (address.length < 32 || address.length > 44) {
    return false
  }
  // Check if it's valid base58
  try {
    const decoded = bs58.decode(address)
    return decoded.length === 32
  } catch {
    return false
  }
}
