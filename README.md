# pyusd-lz

A CLI tool for cross-chain PYUSD transfers using LayerZero.

## Overview

This demo CLI shows how to transfer PYUSD tokens across EVM chains using LayerZero's Omnichain Fungible Token (OFT) standard.

### Supported Chains

| Chain     | EID   | Chain ID |
|-----------|-------|----------|
| Ethereum  | 30101 | 1        |
| Arbitrum  | 30110 | 42161    |
| Polygon   | 30109 | 137      |

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Set your private key:

```bash
PYUSD_PRIVATE_KEY=0x...
```

Optionally configure custom RPC endpoints for better performance:

```bash
PYUSD_RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
PYUSD_RPC_ARBITRUM=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
PYUSD_RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
```

## Usage

### List Supported Chains

```bash
./bin/run.js chains list
```

Output:
```
Supported PYUSD Chains
────────────────────────────────────────────────────────────────────────────────
Chain           EID      Chain ID   PYUSD OFT Address
────────────────────────────────────────────────────────────────────────────────
Ethereum        30101    1          0xa2c323fe5a74adffad2bf3e007e36bb029606444
Arbitrum        30110    42161      0xfab5891ed867a1195303251912013b92c4fc3a1d
Polygon         30109    137        0xfab5891ed867a1195303251912013b92c4fc3a1d

Total: 3 chains
```

### Check PYUSD Balance

```bash
# Using your wallet (requires PYUSD_PRIVATE_KEY)
./bin/run.js balance ethereum

# Check a specific address
./bin/run.js balance arbitrum --address 0x1234...
```

### Get Transfer Quote

Get a fee estimate before sending:

```bash
./bin/run.js quote ethereum arbitrum 100
```

Output:
```
PYUSD Transfer Quote
──────────────────────────────────────────────────
Source:         Ethereum (EID: 30101)
Destination:    Arbitrum (EID: 30110)
Recipient:      0x1234...
Amount:         100 PYUSD

Fees
──────────────────────────────────────────────────
LayerZero Fee:  0.00123 ETH

Amounts
──────────────────────────────────────────────────
Amount Sent:     100.00 PYUSD
Amount Received: 100.00 PYUSD
Min Received:    99.50 PYUSD (0.5% slippage)

Limits
──────────────────────────────────────────────────
Min Transfer:   0.000001 PYUSD
Max Transfer:   1000000.00 PYUSD
```

### Send PYUSD Cross-Chain

```bash
# Send to yourself on another chain
./bin/run.js send ethereum arbitrum 100

# Send to a different recipient
./bin/run.js send ethereum arbitrum 100 --to 0x5678...

# Dry run (simulate without sending)
./bin/run.js send ethereum arbitrum 100 --dry-run

# Custom slippage tolerance
./bin/run.js send ethereum arbitrum 100 --slippage 1
```

## Command Reference

### `chains list`

List all supported PYUSD chains.

**Flags:**
- `--format, -f` - Output format: `table` (default) or `json`

### `balance <chain>`

Check PYUSD balance on a chain.

**Arguments:**
- `chain` - Chain name (ethereum, arbitrum, polygon)

**Flags:**
- `--address, -a` - Address to check (defaults to your wallet)

### `quote <source> <destination> <amount>`

Get a fee quote for a cross-chain transfer.

**Arguments:**
- `source` - Source chain
- `destination` - Destination chain
- `amount` - Amount of PYUSD

**Flags:**
- `--to` - Recipient address (defaults to sender)
- `--slippage` - Slippage tolerance in percent (default: 0.5)
- `--gas` - Gas limit for destination execution (default: 200000)

### `send <source> <destination> <amount>`

Execute a cross-chain PYUSD transfer.

**Arguments:**
- `source` - Source chain
- `destination` - Destination chain
- `amount` - Amount of PYUSD

**Flags:**
- `--to` - Recipient address (defaults to sender)
- `--slippage` - Slippage tolerance in percent (default: 0.5)
- `--gas` - Gas limit for destination execution (default: 200000)
- `--dry-run` - Simulate without sending

## How It Works

1. **LayerZero OFT**: PYUSD uses LayerZero's OFT standard for cross-chain transfers. Each chain has a PYUSD OFT adapter that handles locking/unlocking or minting/burning tokens.

2. **Quote**: Before sending, the CLI fetches a quote from the source chain's OFT contract to determine the LayerZero messaging fee.

3. **Approval**: If the OFT adapter requires ERC20 approval (for OFT Adapters), the CLI will automatically approve the transfer.

4. **Send**: The CLI calls the OFT `send()` function with the destination chain ID, recipient address, and amount. LayerZero handles the cross-chain message delivery.

5. **Receive**: On the destination chain, LayerZero calls the OFT's `lzReceive()` function to mint or unlock tokens to the recipient.

## Architecture

```
src/
├── commands/
│   ├── chains/list.ts    # List supported chains
│   ├── balance.ts        # Check PYUSD balance
│   ├── quote.ts          # Get transfer quote
│   └── send.ts           # Execute transfer
├── lib/
│   ├── abi/
│   │   ├── ioft.ts       # IOFT interface ABI
│   │   └── erc20.ts      # ERC20 ABI
│   ├── chains.ts         # Chain configurations
│   ├── client.ts         # Viem client factory
│   ├── oft.ts            # OFT interactions
│   └── options.ts        # LayerZero options builder
├── types/
│   └── index.ts          # TypeScript interfaces
└── utils/
    ├── address.ts        # Address utilities
    └── format.ts         # Formatting utilities
```

## Development

```bash
# Run in development mode
./bin/dev.js chains list

# Build
npm run build

# Lint
npm run lint
```

## Resources

- [LayerZero Documentation](https://docs.layerzero.network)
- [OFT Standard](https://docs.layerzero.network/v2/developers/evm/oft/quickstart)
- [LayerZero Scan](https://layerzeroscan.com) - Track cross-chain transactions
- [PYUSD](https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd) - PayPal USD Stablecoin

## License

MIT
