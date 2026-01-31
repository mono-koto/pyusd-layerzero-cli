#!/usr/bin/env tsx
/**
 * Convert a Solana seed phrase to a Base58-encoded secret key
 *
 * Reads mnemonic from stdin and outputs the secret key for import into wallets.
 *
 * Usage:
 *   echo "your seed phrase here" | npx tsx scripts/seed-to-secret.ts | pbcopy
 *
 * Or from 1Password:
 *   op read "op://vault/item/field" | npx tsx scripts/seed-to-secret.ts | pbcopy
 */

import { Keypair } from '@solana/web3.js'
import { mnemonicToSeedSync } from 'bip39'
import bs58 from 'bs58'
import { derivePath } from 'ed25519-hd-key'

// Solana's standard derivation path (BIP44)
const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'"

async function main() {
  // Read seed phrase from stdin
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  const mnemonic = Buffer.concat(chunks).toString('utf-8').trim()

  if (!mnemonic) {
    console.error('Error: No seed phrase provided on stdin')
    process.exit(1)
  }

  // Convert mnemonic to seed
  const seed = mnemonicToSeedSync(mnemonic)

  // Derive the keypair using Solana's standard path
  const { key } = derivePath(SOLANA_DERIVATION_PATH, seed.toString('hex'))

  // Create keypair from derived seed (ed25519-hd-key returns 32 bytes)
  const keypair = Keypair.fromSeed(key)

  // Encode the full 64-byte secret key as Base58
  const secretKeyBase58 = bs58.encode(keypair.secretKey)

  // Output without newline for clean pbcopy
  process.stdout.write(secretKeyBase58)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
