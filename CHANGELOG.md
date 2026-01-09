# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed (Breaking Changes)
- **BREAKING:** Renamed `send` command to `transfer` for better clarity
- **BREAKING:** Simplified `chains list` to just `chains` command
- **BREAKING:** Removed hardcoded chain configuration fallbacks - now requires config files

### Added
- Created `src/lib/input-validation.ts` for centralized address resolution
- Created `src/lib/send-preparation.ts` for centralized SendParam building
- Added OFT_SENT_EVENT_SIGNATURE constant for better code clarity
- Added comprehensive CODE_REVIEW.md with detailed analysis
- Added BLOG_POST.md technical guide for developers

### Improved
- Reduced code duplication by ~130 lines (15% reduction)
- Simplified chain configuration management
- Better error messages when config files are missing
- Improved maintainability through DRY principles
- Enhanced developer experience with reusable utilities

### Documentation
- Updated all README examples to use `transfer` instead of `send`
- Updated all README examples to use `chains` instead of `chains list`
- Added CODE_REVIEW.md with prioritized recommendations
- Added BLOG_POST.md explaining cross-chain transfer implementation

## [Previous Refactoring] - 2026-01-06

### Summary

This section summarizes the comprehensive refactoring of the pyusd-lz CLI tool, transforming it from an oclif-based CLI to a simpler commander.js-based tool with enhanced features including testnet support, dynamic chain configuration, and LayerZero status tracking.

## Changes Summary

### 1. CLI Framework Migration: oclif → commander.js

**Before:** The CLI used oclif framework with complex configuration and plugin system.

**After:** Migrated to commander.js with `@commander-js/extra-typings` for TypeScript support.

**Changes:**
- Removed dependencies: `@oclif/core`, `@oclif/plugin-help`, `@oclif/plugin-plugins`, `oclif`
- Added dependencies: `commander`, `@commander-js/extra-typings`
- Rewrote all commands using commander.js API
- Created new entry point: `bin/cli.ts`
- Removed old entry points: `bin/run.js`, `bin/dev.js`

### 2. TypeScript Execution: ts-node → tsx

**Before:** Used ts-node with ESM loader flags.

**After:** Uses tsx for simpler, faster TypeScript execution.

**Changes:**
- Removed `ts-node` dependency
- Added `tsx` dependency
- Updated `npm run cli` script to use tsx directly
- Simplified shebang to `#!/usr/bin/env tsx`

### 3. Import Syntax: Removed .js Extensions

**Before:** All imports required `.js` extensions for ESM compatibility.
```typescript
import { getChainConfig } from '../lib/chains.js'
```

**After:** Clean imports without extensions.
```typescript
import { getChainConfig } from '../lib/chains'
```

**Changes:**
- Updated tsconfig.json to use `moduleResolution: "bundler"`
- Removed `.js` extensions from all import statements
- Set `noEmit: true` since we run TypeScript directly

### 4. Environment Variables: Removed PYUSD_ Prefix

**Before:**
```bash
PYUSD_PRIVATE_KEY=0x...
PYUSD_RPC_ETHEREUM=https://...
```

**After:**
```bash
PRIVATE_KEY=0x...
RPC_ETHEREUM=https://...
```

**Changes:**
- Updated all env var references in code
- Updated `.env.example`
- Updated README documentation

### 5. Tool Version Management: Added mise.toml

**New file:** `mise.toml`
```toml
[tools]
node = "22"
```

### 6. CI/CD: Simplified and Updated to use mise

**Before:** Complex CI with tests, multiple OS/Node version matrix.

**After:** Simplified CI with just lint and build.

**Changes to `.github/workflows/test.yml`:**
- Removed test matrix (OS, Node versions)
- Uses `jdx/mise-action@v2` for tool setup
- Runs only `npm run lint` and `npm run build`

**Changes to `.github/workflows/onPushToMain.yml`:**
- Uses mise for Node setup
- Removed oclif readme generation

**Changes to `.github/workflows/onRelease.yml`:**
- Uses mise for Node setup
- Removed oclif prepack/postpack steps

### 7. Removed Test Infrastructure

**Removed files:**
- `.mocharc.json`
- `test/` directory

**Removed dependencies:**
- `mocha`, `@types/mocha`
- `chai`, `@types/chai`
- `@oclif/test`

### 8. Dynamic Chain Configuration

**New feature:** Chain configs loaded from JSON files with API fetch capability.

**New files:**
- `config/mainnet.json` - Mainnet chain configurations
- `config/testnet.json` - Testnet chain configurations
- `config/chains.json` - Chain key lists

**New command:** `fetch-chains`
- Fetches PYUSD deployments from LayerZero metadata API
- Writes configuration to JSON file
- Usage: `npm run cli fetch-chains`

### 9. Testnet Mode Support

**New feature:** Support for testnet chains via `TESTNET` environment variable.

**Supported testnet chains:**
| Chain            | Key              | EID   | Chain ID  |
|------------------|------------------|-------|-----------|
| Ethereum Sepolia | ethereum-sepolia | 40161 | 11155111  |
| Arbitrum Sepolia | arbitrum-sepolia | 40231 | 421614    |

**Usage:**
```bash
TESTNET=true npm run cli chains list
TESTNET=true npm run cli balance ethereum-sepolia
```

**Note:** Testnet PYUSD tokens are raw ERC20 tokens without OFT adapters, so cross-chain transfers are not available on testnet.

### 10. LayerZero Status Tracking

**New command:** `status <txHash>`
- Queries LayerZero Scan API for message status
- Shows source/destination chain info
- Displays delivery status and timestamps

**Example output:**
```
Cross-Chain Transfer Status
────────────────────────────────────────────────────────────
Status:       ✓ DELIVERED
Message:      Executor transaction confirmed
GUID:         0x8acd9553...

Source
────────────────────────────────────────────────────────────
Chain:        ethereum
From:         0x55555e10c7d7e6d8da3ce83e4ff20be2f623562a
TX Hash:      0xe4439a92...
Timestamp:    1/6/2026, 9:46:59 AM

Destination
────────────────────────────────────────────────────────────
Chain:        arbitrum
TX Hash:      0xe917e041...
Timestamp:    1/6/2026, 9:50:12 AM
```

### 11. Updated ESLint Configuration

**Before:** Used oclif's ESLint config.

**After:** Uses typescript-eslint directly.

**Changes:**
- Removed `eslint-config-oclif`
- Added `typescript-eslint`
- Updated `eslint.config.mjs` to use `tseslint.config()`

## File Structure After Refactoring

```
pyusd-lz/
├── bin/
│   └── cli.ts                 # CLI entry point
├── config/
│   ├── chains.json            # Chain key lists
│   ├── mainnet.json           # Mainnet configurations
│   └── testnet.json           # Testnet configurations
├── src/
│   ├── commands/
│   │   ├── balance.ts         # Check PYUSD balance
│   │   ├── chains.ts          # List supported chains
│   │   ├── fetch-chains.ts    # Fetch config from API
│   │   ├── quote.ts           # Get transfer quote
│   │   ├── send.ts            # Execute transfer
│   │   └── status.ts          # Check transfer status
│   ├── lib/
│   │   ├── abi/
│   │   │   ├── erc20.ts
│   │   │   └── ioft.ts
│   │   ├── chains.ts          # Chain configuration loader
│   │   ├── client.ts          # Viem client factory
│   │   ├── oft.ts             # OFT interactions
│   │   └── options.ts         # LayerZero options
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── address.ts
│   │   └── format.ts
│   └── index.ts               # Library exports
├── .env.example
├── .github/workflows/
│   ├── test.yml
│   ├── onPushToMain.yml
│   └── onRelease.yml
├── eslint.config.mjs
├── mise.toml
├── package.json
├── tsconfig.json
└── README.md
```

## End-to-End Test Results

### Mainnet Transfer Test

Successfully executed a cross-chain transfer on mainnet:

**Transaction Details:**
- Direction: Ethereum → Arbitrum
- Amount: 0.1 PYUSD
- LayerZero Fee: 0.000051 ETH
- Delivery Time: ~3 minutes

**Transaction Hash:**
`0xe4439a92601ec6b8f6698acc2821721fa58c9d81dd4c1c30f3e80bc251d138f8`

**LayerZero Scan:**
https://layerzeroscan.com/tx/0xe4439a92601ec6b8f6698acc2821721fa58c9d81dd4c1c30f3e80bc251d138f8

**Final Balances:**
- Ethereum: 4.9 PYUSD
- Arbitrum: 0.1 PYUSD

### Testnet Balance Test

Successfully tested balance checking on testnet:

**Ethereum Sepolia:**
- Address: `0xebb6aDdc9D449cC93DfA3aF43442c701bD30FC8a`
- Balance: 100 PYUSD

**Arbitrum Sepolia:**
- Address: `0xebb6aDdc9D449cC93DfA3aF43442c701bD30FC8a`
- Balance: 0 PYUSD

## Dependencies

### Production Dependencies
```json
{
  "@commander-js/extra-typings": "^14.0.0",
  "chalk": "^5.4.1",
  "commander": "^14.0.0",
  "ora": "^9.0.0",
  "viem": "^2.43.5"
}
```

### Development Dependencies
```json
{
  "@eslint/compat": "^1",
  "@types/node": "^22",
  "eslint": "^9",
  "eslint-config-prettier": "^10",
  "prettier": "^3",
  "tsx": "^4",
  "typescript": "^5",
  "typescript-eslint": "^8"
}
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npm run cli balance <chain>` | Check PYUSD balance |
| `npm run cli quote <src> <dst> <amount>` | Get transfer fee quote |
| `npm run cli send <src> <dst> <amount>` | Execute cross-chain transfer |
| `npm run cli status <txHash>` | Check transfer status |
| `npm run cli chains list` | List supported chains |
| `npm run cli fetch-chains` | Update config from API |

## Breaking Changes

1. **Environment variables renamed** - All `PYUSD_*` prefixes removed
2. **CLI invocation changed** - Now uses `npm run cli` instead of `./bin/run.js`
3. **Testnet chain keys changed** - `sepolia` → `ethereum-sepolia`

## Resources

- [LayerZero Documentation](https://docs.layerzero.network)
- [LayerZero Scan API](https://scan.layerzero-api.com/v1/swagger)
- [Paxos PYUSD Testnet](https://docs.paxos.com/guides/stablecoin/pyusd/testnet)
- [commander.js](https://github.com/tj/commander.js)
- [tsx](https://github.com/privatenumber/tsx)
