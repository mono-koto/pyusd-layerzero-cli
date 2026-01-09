# pyusd-lz

A CLI tool for cross-chain PYUSD transfers using LayerZero.

## Overview

This demo CLI shows how to transfer PYUSD tokens across EVM chains using LayerZero's Omnichain Fungible Token (OFT) standard.

### Supported Chains (Mainnet)

| Chain     | EID   | Chain ID |
|-----------|-------|----------|
| Ethereum  | 30101 | 1        |
| Arbitrum  | 30110 | 42161    |
| Polygon   | 30109 | 137      |

### Supported Chains (Testnet)

| Chain            | Key              | EID   | Chain ID  |
|------------------|------------------|-------|-----------|
| Ethereum Sepolia | ethereum-sepolia | 40161 | 11155111  |
| Arbitrum Sepolia | arbitrum-sepolia | 40231 | 421614    |

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Set your private key:

```bash
PRIVATE_KEY=0x...
```

Optionally configure custom RPC endpoints for better performance:

```bash
RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
RPC_ARBITRUM=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### Testnet Mode

To use testnet chains, set the `TESTNET` environment variable:

```bash
TESTNET=true npm run cli chains
```

For testnet, configure these RPC endpoints:

```bash
RPC_ETHEREUM_SEPOLIA=https://sepolia.infura.io/v3/YOUR_KEY
RPC_ARBITRUM_SEPOLIA=https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY
```

**Note:** Testnet mode uses the raw PYUSD token addresses on Sepolia and Arbitrum Sepolia. The `balance` command works, but cross-chain transfers (`quote` and `send`) require LayerZero OFT adapters which are not officially deployed on testnets. Get testnet PYUSD from the [Paxos Faucet](https://faucet.paxos.com/).

## Usage

### List Supported Chains

```bash
npm run cli chains
```

Output:
```
Supported PYUSD Chains (MAINNET)
────────────────────────────────────────────────────────────────────────────────
Chain              EID      Chain ID   PYUSD Address
────────────────────────────────────────────────────────────────────────────────
Ethereum           30101    1          0xa2c323fe5a74adffad2bf3e007e36bb029606444
Arbitrum           30110    42161      0xfab5891ed867a1195303251912013b92c4fc3a1d
Polygon            30109    137        0xfab5891ed867a1195303251912013b92c4fc3a1d

Total: 3 chains
```

### Check PYUSD Balance

```bash
# Using your wallet (requires PRIVATE_KEY)
npm run cli balance ethereum

# Check a specific address
npm run cli balance arbitrum --address 0x1234...
```

### Get Transfer Quote

Get a fee estimate before sending:

```bash
npm run cli quote ethereum arbitrum 100
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

### Transfer PYUSD Cross-Chain

```bash
# Transfer to yourself on another chain
npm run cli transfer ethereum arbitrum 100

# Transfer to a different recipient
npm run cli transfer ethereum arbitrum 100 --to 0x5678...

# Dry run (simulate without sending)
npm run cli transfer ethereum arbitrum 100 --dry-run

# Custom slippage tolerance
npm run cli transfer ethereum arbitrum 100 --slippage 1
```

### Check Transfer Status

Track the status of a cross-chain transfer using the LayerZero Scan API:

```bash
npm run cli status 0xe4439a92601ec6b8f6698acc2821721fa58c9d81dd4c1c30f3e80bc251d138f8
```

Output:
```
Cross-Chain Transfer Status
────────────────────────────────────────────────────────────
Status:       ✓ DELIVERED
Message:      Executor transaction confirmed
GUID:         0x8acd9553...

Source
────────────────────────────────────────────────────────────
Chain:        ethereum
From:         0x5555...562A
TX Hash:      0xe4439a92...
Timestamp:    1/6/2026, 9:46:59 AM

Destination
────────────────────────────────────────────────────────────
Chain:        arbitrum
TX Hash:      0xe917e041...
Timestamp:    1/6/2026, 9:50:12 AM
```

### Fetch Chain Configurations

Update chain configurations from the LayerZero metadata API:

```bash
npm run cli fetch-chains
```

## Command Reference

### `chains`

List all supported PYUSD chains.

**Flags:**
- `--format, -f` - Output format: `table` (default) or `json`

### `balance <chain>`

Check PYUSD balance on a chain.

**Arguments:**
- `chain` - Chain name (ethereum, arbitrum, polygon, or testnet equivalents)

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

### `transfer <source> <destination> <amount>`

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

### `status <txHash>`

Check the status of a cross-chain transfer using LayerZero Scan API.

**Arguments:**
- `txHash` - Source chain transaction hash

### `fetch-chains`

Fetch PYUSD chain configurations from LayerZero metadata API.

**Flags:**
- `--output` - Output file path (default: config/mainnet.json)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PRIVATE_KEY` | Your wallet private key for signing transactions | Yes (for send/balance) |
| `TESTNET` | Set to `true` or `1` to use testnet chains | No |
| `RPC_ETHEREUM` | Custom Ethereum RPC endpoint | No |
| `RPC_ARBITRUM` | Custom Arbitrum RPC endpoint | No |
| `RPC_POLYGON` | Custom Polygon RPC endpoint | No |
| `RPC_ETHEREUM_SEPOLIA` | Custom Ethereum Sepolia RPC endpoint (testnet) | No |
| `RPC_ARBITRUM_SEPOLIA` | Custom Arbitrum Sepolia RPC endpoint (testnet) | No |

## How It Works

1. **LayerZero OFT**: PYUSD uses LayerZero's OFT standard for cross-chain transfers. Each chain has a PYUSD OFT adapter that handles locking/unlocking or minting/burning tokens.

2. **Quote**: Before transferring, the CLI fetches a quote from the source chain's OFT contract to determine the LayerZero messaging fee.

3. **Approval**: If the OFT adapter requires ERC20 approval (for OFT Adapters), the CLI will automatically approve the transfer.

4. **Transfer**: The CLI calls the OFT `send()` function with the destination chain ID, recipient address, and amount. LayerZero handles the cross-chain message delivery.

5. **Receive**: On the destination chain, LayerZero calls the OFT's `lzReceive()` function to mint or unlock tokens to the recipient.

## Architecture

```
src/
├── commands/
│   ├── balance.ts        # Check PYUSD balance
│   ├── chains.ts         # List supported chains
│   ├── fetch-chains.ts   # Fetch config from API
│   ├── quote.ts          # Get transfer quote
│   ├── transfer.ts       # Execute transfer
│   └── status.ts         # Check transfer status
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

config/
├── mainnet.json          # Mainnet chain configurations
└── testnet.json          # Testnet chain configurations
```

## Development

```bash
# Run CLI directly with tsx
npm run cli chains

# Run with testnet
TESTNET=true npm run cli chains

# Build (type check)
npm run build

# Lint
npm run lint

# Format
npm run format
```

## Resources

- [LayerZero Documentation](https://docs.layerzero.network)
- [OFT Standard](https://docs.layerzero.network/v2/developers/evm/oft/quickstart)
- [LayerZero Scan](https://layerzeroscan.com) - Track cross-chain transactions
- [PYUSD](https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd) - PayPal USD Stablecoin
- [Paxos PYUSD Testnet](https://docs.paxos.com/guides/stablecoin/pyusd/testnet) - Get testnet PYUSD

## License

MIT
