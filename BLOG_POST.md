# Building Cross-Chain PYUSD Transfers with LayerZero: A Developer's Guide

_A comprehensive technical walkthrough of implementing cross-chain PYUSD transfers using LayerZero's OFT standard_

---

## Table of Contents

1. [Introduction](#introduction)
2. [Understanding the Stack](#understanding-the-stack)
3. [Architecture Overview](#architecture-overview)
4. [Building the Transfer Flow](#building-the-transfer-flow)
5. [Advanced Topics](#advanced-topics)
6. [Best Practices](#best-practices)
7. [Conclusion](#conclusion)

---

## Introduction

PYUSD (PayPal USD) is deployed across multiple blockchain networks to improve accessibility and reduce transaction costs. However, moving tokens between chains has traditionally required centralized bridges or complex swap mechanisms. **LayerZero** changes this by enabling cross-chain token transfers through its Omnichain Fungible Token (OFT) standard.

In this guide, we'll build a TypeScript CLI tool that demonstrates how to:

- Transfer PYUSD between Ethereum, Arbitrum, and Polygon
- Interact with LayerZero's OFT contracts
- Handle approvals, quotes, and cross-chain message tracking

**What You'll Learn:**

- How LayerZero's OFT standard works
- Building cross-chain transfer workflows
- Working with the viem library for Ethereum interactions
- Binary encoding for cross-chain messages
- Tracking cross-chain message delivery

**Prerequisites:**

- TypeScript/Node.js knowledge
- Basic understanding of Ethereum and smart contracts
- Familiarity with async/await patterns
- Some experience with command-line tools

The complete code for this project is available at [github.com/mono-koto/pyusd-lz](https://github.com/mono-koto/pyusd-lz).

---

## Understanding the Stack

Before diving into code, let's understand the key technologies powering cross-chain PYUSD transfers.

### PYUSD: PayPal's Stablecoin

PYUSD is a USD-backed stablecoin issued by Paxos on behalf of PayPal. Key characteristics:

- **Decimals:** 6 (like USDC and USDT)
- **Chains:** Ethereum, Arbitrum, Solana, Stellar

### LayerZero: Omnichain Messaging

LayerZero is a messaging protocol that enables smart contracts to communicate across blockchains. Think of it as a "postal service" for blockchains:

- **Endpoint IDs (EIDs):** Each chain has a unique identifier
  - Ethereum mainnet: `30101`
  - Arbitrum: `30110`
  - Polygon: `30109`

- **Security Model:** Uses independent Decentralized Verifier Networks (DVNs) and Executors
- **Pay on Source:** You pay fees in native currency on the source chain

### OFT: Omnichain Fungible Token

The OFT standard defines how tokens move cross-chain. There are two implementations:

**1. OFT Adapter** (wraps existing ERC-20)

- Used when token already exists (like PYUSD on Ethereum)
- Locks tokens on source chain
- Mints equivalent on destination
- **Requires ERC-20 approval** before transfer

**2. OFT** (direct implementation)

- Token contract implements OFT directly
- Burns on source, mints on destination
- **No approval needed** (token itself is the OFT)

PYUSD on Ethereum uses an **OFT Adapter**, while other chains use the PYUSD0 **OFT** implementation.

### Viem: TypeScript Ethereum Library

In thise codebase we'll use [viem](https://viem.sh) for EVM-based blockchain interactions.

If performing transfers that include non-EVM chains like Solana or Stellar, you'll want to use the appropriate client libraries and/or RPC interfaces.

---

## Architecture Overview

Our CLI follows a clean separation of concerns:

```
pyusd-lz/
├── bin/
│   └── cli.ts              # CLI entry point
├── src/
│   ├── commands/           # Command handlers
│   │   ├── balance.ts      # Check PYUSD balance
│   │   ├── chains.ts       # List supported chains
│   │   ├── fetch-chains.ts # Fetch chain configs from API
│   │   ├── quote.ts        # Get transfer quote
│   │   ├── transfer.ts     # Execute cross-chain transfer
│   │   └── status.ts       # Check transfer status
│   ├── lib/                # Core business logic
│   │   ├── abi/            # Contract ABIs
│   │   ├── chains.ts       # Chain configuration
│   │   ├── client.ts       # Viem client factories
│   │   ├── oft.ts          # OFT contract interactions
│   │   └── options.ts      # LayerZero options encoding
│   ├── types/              # TypeScript interfaces
│   └── utils/              # Formatting utilities
└── config/
    ├── mainnet.json        # Mainnet chain configs
    └── testnet.json        # Testnet chain configs
```

### Key Design Principles

1. **Commands** handle CLI interface and user interaction
2. **Library** contains reusable business logic
3. **Configuration** is data-driven (JSON files)
4. **Types** ensure compile-time safety
5. **Utilities** handle data transformation and formatting

---

## Building the Transfer Flow

Let's build the complete cross-chain transfer flow step by step. A typical transfer involves:

1. Fetching chain metadata
2. Checking balances
3. Handling approvals
4. Getting a transfer quote
5. Executing the transfer
6. Tracking delivery status

### Step 1: Fetching Chain Metadata

Before we can transfer PYUSD, we need to know where it's deployed. LayerZero provides a metadata API that lists all OFT deployments.

#### The API Call

```typescript
// src/commands/fetch-chains.ts

const response = await fetch(
  "https://metadata.layerzero-api.com/v1/metadata/experiment/ofts/list"
);
const data = await response.json();

// Filter for PYUSD deployments
const pyusdDeployments = data.ofts.filter(
  (oft: any) => oft.token.symbol === "PYUSD" && oft.network === "evm"
);
```

#### Building the Configuration

For each PYUSD deployment, we fetch additional endpoint metadata and build a configuration:

```typescript
interface ChainConfig {
  name: string;
  chainId: number;
  eid: number; // LayerZero Endpoint ID
  pyusdAddress: `0x${string}`; // PYUSD OFT contract address
  blockExplorer: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  chainKey: string; // Key for config lookup (e.g., "ethereum")
}
```

#### Example Configuration

```json
{
  "ethereum": {
    "name": "Ethereum",
    "chainId": 1,
    "eid": 30101,
    "pyusdAddress": "0xa2c323fe5a74adffad2bf3e007e36bb029606444",
    "blockExplorer": "https://etherscan.io",
    "rpcUrl": "https://eth.llamarpc.com",
    "nativeCurrency": {
      "name": "Ether",
      "symbol": "ETH",
      "decimals": 18
    }
  }
}
```

#### Loading Configuration

By loading configuration from JSON files, we can easily add new chains without code changes.

```typescript
// src/lib/chains.ts

import { readFileSync } from "node:fs";

const isTestnet = process.env.TESTNET === "true" || process.env.TESTNET === "1";

export function loadChainConfigs(): Record<string, ChainConfig> {
  const configFile = isTestnet ? "testnet.json" : "mainnet.json";
  const configPath = join(__dirname, "../../config", configFile);

  const raw = readFileSync(configPath, "utf-8");
  const configs = JSON.parse(raw);

  // Apply RPC URL overrides from environment variables
  const result: Record<string, ChainConfig> = {};
  for (const [key, config] of Object.entries(configs)) {
    const envKey = `RPC_${key.toUpperCase().replace(/-/g, "_")}`;
    result[key] = {
      ...config,
      chainKey: key,
      rpcUrl: process.env[envKey] || config.rpcUrl,
    };
  }

  return result;
}
```

---

### Step 2: Checking Balances

Before transferring, we want to check if the user has enough PYUSD. This is just normal ERC-20 stuff.

#### Creating a Viem Client

```typescript
// src/lib/client.ts

import { createPublicClient, http } from "viem";
import type { PublicClient } from "viem";

export function createPublicClientForChain(chainKey: string): PublicClient {
  const config = getChainConfig(chainKey);
  const viemChain = getViemChain(chainKey); // Maps to viem's chain definitions

  return createPublicClient({
    chain: viemChain,
    transport: http(config.rpcUrl),
  });
}
```

#### Reading the Balance

PYUSD on Ethereum uses an **OFT Adapter**, which wraps the actual PYUSD ERC-20 token. We need to:

1. Call the adapter's `token()` function to get the underlying ERC-20 address
2. Call `balanceOf()` on that ERC-20 contract

```typescript
// src/lib/oft.ts

import { erc20Abi } from "./abi/erc20";
import { ioftAbi } from "./abi/ioft";

/**
 * Get the underlying ERC-20 token address
 * Falls back to the OFT address if it's a native OFT
 */
export async function getTokenAddress(
  client: PublicClient,
  oftAddress: Address
): Promise<Address> {
  try {
    return await client.readContract({
      abi: ioftAbi,
      address: oftAddress,
      functionName: "token",
    });
  } catch {
    // If token() doesn't exist, the OFT IS the token
    return oftAddress;
  }
}

/**
 * Get PYUSD balance for an address
 */
export async function getBalance(
  client: PublicClient,
  tokenAddress: Address,
  account: Address
): Promise<bigint> {
  return client.readContract({
    abi: erc20Abi,
    address: tokenAddress,
    args: [account],
    functionName: "balanceOf",
  });
}
```

#### The Balance Command

```typescript
// src/commands/balance.ts

export const balanceCommand = new Command("balance")
  .description("Check PYUSD balance on a chain")
  .argument("<chain>", "Chain to check balance on")
  .option(
    "-a, --address <address>",
    "Address to check (defaults to your wallet)"
  )
  .action(async (chain, options) => {
    const config = getChainConfig(chain);
    const client = createPublicClientForChain(chain);

    // Resolve address from flag or private key
    const address =
      options.address || getAddressFromPrivateKey(process.env.PRIVATE_KEY);

    // Get token address and balance
    const tokenAddress = await getTokenAddress(client, config.pyusdAddress);
    const balance = await getBalance(client, tokenAddress, address);

    // Format and display (PYUSD uses 6 decimals)
    console.log(`Balance: ${formatUnits(balance, 6)} PYUSD`);
  });
```

**Output:**

```
Checking PYUSD balance on Ethereum...

Address:  0x1234567890123456789012345678901234567890
Chain:    Ethereum (EID: 30101)
Balance:  1000.500000 PYUSD
```

**Key Insight:** The `token()` function call with try-catch handles both OFT Adapters and native OFTs gracefully. This abstraction allows our code to work with any OFT implementation.

---

### Step 3: Understanding and Handling Approvals

When using an OFT Adapter, the adapter contract needs permission to move your tokens. This requires an ERC-20 approval.

#### Checking if Approval is Required

```typescript
// src/lib/oft.ts

export async function isApprovalRequired(
  client: PublicClient,
  oftAddress: Address
): Promise<boolean> {
  return client.readContract({
    abi: ioftAbi,
    address: oftAddress,
    functionName: "approvalRequired",
  });
}
```

#### Checking Current Allowance and Approving Tokens

In cases where approval is allowed, we need to check the current allowance.

```typescript
export async function getAllowance(
  client: PublicClient,
  tokenAddress: Address,
  owner: Address,
  spender: Address
): Promise<bigint> {
  return client.readContract({
    abi: erc20Abi,
    address: tokenAddress,
    args: [owner, spender],
    functionName: "allowance",
  });
}
```

We also need to be able to approve spend so we can tell the token to allow the OFT Adapter to transfer it.

```typescript
export async function approve(
  walletClient: WalletClient,
  publicClient: PublicClient,
  tokenAddress: Address,
  spender: Address,
  amount: bigint
): Promise<Hex> {
  const hash = await walletClient.writeContract({
    abi: erc20Abi,
    account: walletClient.account!,
    address: tokenAddress,
    args: [spender, amount],
    chain: walletClient.chain,
    functionName: "approve",
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}
```

#### The Complete Approval Flow

The `approvalRequired()` function allows our code to handle both OFT Adapters (require approval) and OFTs (no approval) without any conditional logic in the command layer.

```typescript
export async function checkAndApprove(
  walletClient: WalletClient,
  publicClient: PublicClient,
  oftAddress: Address,
  amount: bigint
): Promise<{ approved: boolean; txHash?: Hex }> {
  // Check if this OFT requires approval
  const needsApproval = await isApprovalRequired(publicClient, oftAddress);
  if (!needsApproval) {
    return { approved: false }; // No approval needed
  }

  // Get the underlying token address
  const tokenAddress = await getTokenAddress(publicClient, oftAddress);

  // Check current allowance
  const owner = walletClient.account!.address;
  const currentAllowance = await getAllowance(
    publicClient,
    tokenAddress,
    owner,
    oftAddress
  );

  // If sufficient allowance exists, no need to approve
  if (currentAllowance >= amount) {
    return { approved: false };
  }

  // Approve max uint256 for convenience
  //
  // This is a common pattern and easy for this demo, but it's always safer to approve only the amount needed
  const maxApproval = 2n ** 256n - 1n;
  const txHash = await approve(
    walletClient,
    publicClient,
    tokenAddress,
    oftAddress,
    maxApproval
  );

  return { approved: true, txHash };
}
```

**Security Note:** Approving `max uint256` is a common pattern that prevents needing re-approval for every transfer. However, production applications may want to approve exact amounts or implement approval limits based on user preferences.

---

### Step 4: Getting Transfer Quotes

Before sending a cross-chain transfer, we need to know:

- How much the LayerZero messaging fee will cost
- How many tokens will be received on the destination
- Transfer limits (min/max amounts)

#### The SendParam Structure

All OFT transfers use a `SendParam` structure that describes the transfer:

```typescript
interface SendParam {
  dstEid: number; // Destination LayerZero Endpoint ID
  to: Hex; // Recipient address (as bytes32)
  amountLD: bigint; // Amount in local decimals
  minAmountLD: bigint; // Minimum to receive (slippage protection)
  extraOptions: Hex; // Encoded execution options
  composeMsg: Hex; // Optional compose message (0x for simple transfers)
  oftCmd: Hex; // Optional OFT command (0x for simple transfers)
}
```

#### Building extraOptions (Gas Limit Encoding)

LayerZero requires us to specify how much gas to provide for the `lzReceive()` function on the destination chain. This is encoded in binary format:

```typescript
// src/lib/options.ts

import { concat, toHex } from "viem";

const DEFAULT_GAS_LIMIT = 200_000n;

/**
 * Build LayerZero V2 options encoding the gas limit for lzReceive
 * Format: [optionsType(2)] + [workerId(1)] + [length(2)] + [optionType(1)] + [gasLimit(16)]
 */
export function buildLzReceiveOptions(
  gasLimit: bigint = DEFAULT_GAS_LIMIT
): Hex {
  // Encode gas limit as 16 bytes
  const gasLimitBytes = toHex(gasLimit, { size: 16 });

  // Option data: type (1) + gas limit (16) = 17 bytes
  const optionData = concat([
    toHex(1, { size: 1 }), // Option type: lzReceive
    gasLimitBytes,
  ]);

  // Full options: version + worker ID + length + data
  return concat([
    toHex(0x0003, { size: 2 }), // Options type V2
    toHex(1, { size: 1 }), // Worker ID: Executor
    toHex(17, { size: 2 }), // Length of option data
    optionData,
  ]);
}
```

**Why bytes32 for addresses?**
LayerZero is chain-agnostic, so it uses 32-byte addresses instead of Ethereum's 20-byte format:

```typescript
// src/utils/address.ts

import { pad } from "viem";

export function addressToBytes32(address: Address): Hex {
  return pad(address, { size: 32 }); // Pads with leading zeros
}
```

#### Constructing SendParam

```typescript
// Building a SendParam for 100 PYUSD transfer to Arbitrum

const amountLD = parseUnits("100", 6); // 100000000n
const minAmountLD = (amountLD * 995n) / 1000n; // 99.5 (0.5% slippage)

const sendParam: SendParam = {
  dstEid: 30110, // Arbitrum
  to: addressToBytes32(recipientAddress), // bytes32 format
  amountLD,
  minAmountLD,
  extraOptions: buildLzReceiveOptions(200_000n),
  composeMsg: "0x", // No composition
  oftCmd: "0x", // No OFT command
};
```

#### Fetching the Quote

The OFT contract provides two functions for quoting: `quoteSend` and `quoteOFT`. We'll use both.

```typescript
// src/lib/oft.ts

export async function quoteSend(
  client: PublicClient,
  oftAddress: Address,
  sendParam: SendParam,
  payInLzToken: boolean = false
): Promise<QuoteResult> {
  // Get messaging fee (how much ETH to send)
  const messagingFee = await client.readContract({
    abi: ioftAbi,
    address: oftAddress,
    args: [sendParam, payInLzToken],
    functionName: "quoteSend",
  });
  // Returns: { nativeFee: bigint, lzTokenFee: bigint }

  // Get OFT-specific details (limits, fees, amounts)
  const [limit, feeDetails, receipt] = await client.readContract({
    abi: ioftAbi,
    address: oftAddress,
    args: [sendParam],
    functionName: "quoteOFT",
  });
  // Returns: [
  //   { minAmountLD, maxAmountLD },
  //   [{ description, feeAmountLD }],
  //   { amountSentLD, amountReceivedLD }
  // ]

  return {
    messagingFee,
    limit,
    feeDetails,
    receipt,
  };
}
```

#### Quote Command Output

```typescript
// src/commands/quote.ts

const quote = await quoteSend(client, config.pyusdAddress, sendParam);

console.log("PYUSD Transfer Quote");
console.log("─".repeat(50));
console.log(`Source:         Ethereum (EID: 30101)`);
console.log(`Destination:    Arbitrum (EID: 30110)`);
console.log(`Amount:         100 PYUSD`);
console.log("");
console.log("Fees");
console.log("─".repeat(50));
console.log(
  `LayerZero Fee:  ${formatUnits(quote.messagingFee.nativeFee, 18)} ETH`
);
console.log("");
console.log("Amounts");
console.log("─".repeat(50));
console.log(
  `Amount Sent:     ${formatUnits(quote.receipt.amountSentLD, 6)} PYUSD`
);
console.log(
  `Amount Received: ${formatUnits(quote.receipt.amountReceivedLD, 6)} PYUSD`
);
console.log(
  `Min Received:    ${formatUnits(minAmountLD, 6)} PYUSD (0.5% slippage)`
);
console.log("");
console.log("Limits");
console.log("─".repeat(50));
console.log(`Min Transfer:   ${formatUnits(quote.limit.minAmountLD, 6)} PYUSD`);
console.log(`Max Transfer:   ${formatUnits(quote.limit.maxAmountLD, 6)} PYUSD`);
```

**Output:**

```
PYUSD Transfer Quote
──────────────────────────────────────────────────
Source:         Ethereum (EID: 30101)
Destination:    Arbitrum (EID: 30110)
Recipient:      0x1234...5678
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

**Key Insight:** LayerZero fees are paid in the source chain's native currency (ETH on Ethereum, ETH on Arbitrum, POL on Polygon). The fee covers relayer costs for delivering your message to the destination chain.

---

### Step 5: Executing the Transfer

With approval handled and quote obtained, we're ready to send the cross-chain transfer.

#### The send() Function

```typescript
// src/lib/oft.ts

/**
 * OFTSent event signature
 * keccak256("OFTSent(bytes32,uint32,address,uint256,uint256)")
 */
const OFT_SENT_EVENT_SIGNATURE =
  "0x85496b760a4b7f8d66384b9df21b381f5d1b1e79f229a47aaf4c232edc2fe59a";

export async function send(
  walletClient: WalletClient,
  publicClient: PublicClient,
  oftAddress: Address,
  sendParam: SendParam,
  fee: MessagingFee,
  refundAddress: Address
): Promise<{ guid: Hex; txHash: Hex }> {
  // Call the OFT's send() function
  const hash = await walletClient.writeContract({
    abi: ioftAbi,
    account: walletClient.account!,
    address: oftAddress,
    args: [sendParam, fee, refundAddress],
    chain: walletClient.chain,
    functionName: "send",
    value: fee.nativeFee, // Send ETH for LayerZero fee
  });

  // Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Extract GUID from OFTSent event logs
  let guid: Hex = "0x";
  for (const log of receipt.logs) {
    if (log.topics[0] === OFT_SENT_EVENT_SIGNATURE) {
      guid = log.topics[1] as Hex; // GUID is first indexed topic
      break;
    }
  }

  return { guid, txHash: hash };
}
```

**What happens in this transaction?**

1. **On Source Chain (Ethereum):**
   - OFT Adapter locks your PYUSD tokens
   - Emits `OFTSent` event with a globally unique ID (GUID)
   - Calls LayerZero Endpoint with cross-chain message

2. **LayerZero Network:**
   - DVNs verify the message
   - Executor prepares to deliver on destination chain

3. **On Destination Chain (Arbitrum):**
   - LayerZero Endpoint receives message
   - Calls destination OFT's `lzReceive()` function
   - OFT mints/unlocks PYUSD to recipient

#### The Transfer Command (with full workflow)

```typescript
// src/commands/transfer.ts

export const transferCommand = new Command("transfer")
  .description("Execute a PYUSD cross-chain transfer")
  .argument("<source>", "Source chain")
  .argument("<destination>", "Destination chain")
  .argument("<amount>", "Amount of PYUSD")
  .option("--to <address>", "Recipient (defaults to sender)")
  .option("--slippage <percent>", "Slippage tolerance", "0.5")
  .option("--gas <limit>", "Destination gas limit", "200000")
  .option("--dry-run", "Simulate without sending", false)
  .action(async (source, destination, amount, options) => {
    const srcConfig = getChainConfig(source);
    const dstConfig = getChainConfig(destination);

    // Create clients
    const publicClient = createPublicClientForChain(source);
    const walletClient = createWalletClientForChain(
      source,
      process.env.PRIVATE_KEY
    );

    const senderAddress = walletClient.account!.address;
    const recipientAddress = (options.to || senderAddress) as `0x${string}`;

    // Build SendParam
    const sendParam = buildSendParam({
      amount,
      destinationEid: dstConfig.eid,
      recipient: recipientAddress,
      slippage: options.slippage,
      gas: options.gas,
    });

    console.log("");
    console.log("PYUSD Cross-Chain Transfer");
    console.log("─".repeat(50));
    console.log(`From:       ${srcConfig.name} → ${dstConfig.name}`);
    console.log(`Sender:     ${senderAddress}`);
    console.log(`Recipient:  ${recipientAddress}`);
    console.log(`Amount:     ${amount} PYUSD`);
    console.log("");

    // Step 1: Check balance
    console.log("Step 1/4: Checking balance...");
    const tokenAddress = await getTokenAddress(
      publicClient,
      srcConfig.pyusdAddress
    );
    const balance = await getBalance(publicClient, tokenAddress, senderAddress);

    if (balance < sendParam.amountLD) {
      console.error(`Insufficient balance`);
      process.exit(1);
    }
    console.log(`  ✓ Balance: ${formatAmount(balance)} PYUSD`);
    console.log("");

    // Step 2: Check/set approval
    console.log("Step 2/4: Checking approval...");
    const approvalResult = await checkAndApprove(
      walletClient,
      publicClient,
      srcConfig.pyusdAddress,
      sendParam.amountLD
    );

    if (approvalResult.approved) {
      console.log(`  ✓ Approved (tx: ${approvalResult.txHash})`);
    } else {
      console.log("  ✓ Sufficient allowance");
    }
    console.log("");

    // Step 3: Get quote
    console.log("Step 3/4: Getting quote...");
    const quote = await quoteSend(
      publicClient,
      srcConfig.pyusdAddress,
      sendParam
    );
    console.log(
      `  ✓ Fee: ${formatNativeFee(quote.messagingFee.nativeFee)} ${srcConfig.nativeCurrency.symbol}`
    );
    console.log(
      `  ✓ Will receive: ${formatAmount(quote.receipt.amountReceivedLD)} PYUSD`
    );
    console.log("");

    // Step 4: Send (or dry run)
    if (options.dryRun) {
      console.log("Step 4/4: Dry run (skipping actual send)");
      console.log("  ✓ Transaction simulation successful");
      return;
    }

    console.log("Step 4/4: Sending transaction...");
    const { guid, txHash } = await send(
      walletClient,
      publicClient,
      srcConfig.pyusdAddress,
      sendParam,
      quote.messagingFee,
      senderAddress
    );

    console.log(`  ✓ Transaction sent!`);
    console.log("");
    console.log("Results");
    console.log("─".repeat(50));
    console.log(`TX Hash:      ${txHash}`);
    console.log(`Explorer:     ${srcConfig.blockExplorer}/tx/${txHash}`);
    console.log(`LayerZero:    https://layerzeroscan.com/tx/${txHash}`);
    console.log("");
    console.log("Status: Pending (check LayerZero scan for delivery)");
  });
```

**Output:**

```
PYUSD Cross-Chain Transfer
──────────────────────────────────────────────────
From:       Ethereum → Arbitrum
Sender:     0x1234...5678
Recipient:  0x1234...5678
Amount:     100 PYUSD

Step 1/4: Checking balance...
  ✓ Balance: 1000.50 PYUSD

Step 2/4: Checking approval...
  ✓ Sufficient allowance

Step 3/4: Getting quote...
  ✓ Fee: 0.00123 ETH
  ✓ Will receive: 100.00 PYUSD

Step 4/4: Sending transaction...
  ✓ Transaction sent!

Results
──────────────────────────────────────────────────
TX Hash:      0xe4439a92...
Explorer:     https://etherscan.io/tx/0xe4439a92...
LayerZero:    https://layerzeroscan.com/tx/0xe4439a92...

Status: Pending (check LayerZero scan for delivery)
```

**Key Insight:** The step-by-step progress feedback creates a great developer experience. Users see exactly what's happening at each stage, making debugging and understanding the flow much easier.

---

### Step 6: Tracking Transfer Status

Cross-chain transfers don't complete instantly. LayerZero needs to verify the message and execute it on the destination chain. This can take anywhere from a few seconds to several minutes.

#### LayerZero Scan API

LayerZero provides a public API for tracking message status:

```typescript
// src/commands/status.ts

interface LayerZeroMessage {
  pathway: {
    srcEid: number;
    dstEid: number;
    sender: { address: string; chain?: string };
    receiver: { address: string; chain?: string };
  };
  source: {
    status: string;
    tx: {
      txHash: string;
      blockTimestamp: number;
      from: string;
    };
  };
  destination?: {
    status: string;
    tx?: {
      txHash: string;
      blockTimestamp: number;
    };
  };
  status: {
    name: string; // DELIVERED, INFLIGHT, CONFIRMING, etc.
    message: string; // Human-readable status
  };
  guid: string;
  created: string;
  updated: string;
}

export const statusCommand = new Command("status")
  .description("Check the status of a cross-chain transfer")
  .argument("<txHash>", "Source chain transaction hash")
  .action(async (txHash) => {
    // Query LayerZero Scan API
    const response = await fetch(
      `https://scan.layerzero-api.com/v1/messages/tx/${txHash}`
    );

    if (!response.ok) {
      console.error("Transfer not found or still indexing");
      process.exit(1);
    }

    const data = (await response.json()) as { messages: LayerZeroMessage[] };
    const message = data.messages[0];

    // Display status
    console.log("");
    console.log("Cross-Chain Transfer Status");
    console.log("─".repeat(60));

    const statusIcon = getStatusIcon(message.status.name);
    console.log(`Status:       ${statusIcon} ${message.status.name}`);
    console.log(`Message:      ${message.status.message}`);
    console.log(`GUID:         ${message.guid.slice(0, 12)}...`);
    console.log("");

    console.log("Source");
    console.log("─".repeat(60));
    console.log(`Chain:        ${message.pathway.sender.chain}`);
    console.log(`From:         ${message.source.tx.from}`);
    console.log(`TX Hash:      ${message.source.tx.txHash.slice(0, 12)}...`);
    console.log(
      `Timestamp:    ${new Date(message.source.tx.blockTimestamp * 1000).toLocaleString()}`
    );
    console.log("");

    if (message.destination?.tx) {
      console.log("Destination");
      console.log("─".repeat(60));
      console.log(`Chain:        ${message.pathway.receiver.chain}`);
      console.log(
        `TX Hash:      ${message.destination.tx.txHash.slice(0, 12)}...`
      );
      console.log(
        `Timestamp:    ${new Date(message.destination.tx.blockTimestamp * 1000).toLocaleString()}`
      );
    } else {
      console.log("Destination");
      console.log("─".repeat(60));
      console.log(`Status:       Pending...`);
    }
    console.log("");
  });

function getStatusIcon(status: string): string {
  switch (status) {
    case "DELIVERED":
      return "✓";
    case "INFLIGHT":
      return "⏳";
    case "FAILED":
      return "✗";
    case "BLOCKED":
      return "⚠";
    default:
      return "📦";
  }
}
```

**Output:**

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

**Message Lifecycle:**

1. **CONFIRMING:** LayerZero is waiting for source chain block confirmations
2. **INFLIGHT:** DVNs are verifying the message
3. **DELIVERED:** Message successfully executed on destination chain
4. **FAILED:** Execution failed (rare, usually due to insufficient gas)

**Key Insight:** The GUID from the `OFTSent` event is the universal identifier for tracking your message across the entire LayerZero network.

---

## Advanced Topics

Now that we understand the basic flow, let's dive deeper into some technical details.

### Binary Encoding: LayerZero Options V2

LayerZero requires execution options to be encoded in a specific binary format. Let's break down exactly what's happening:

```typescript
export function buildLzReceiveOptions(gasLimit: bigint = 200_000n): Hex {
  // Step 1: Encode gas limit as 16 bytes (128 bits)
  const gasLimitBytes = toHex(gasLimit, { size: 16 });
  // Example: 200000 → 0x00000000000000000000000000030d40

  // Step 2: Build option data
  // Format: [optionType(1 byte)] + [gasLimit(16 bytes)]
  const optionData = concat([
    toHex(1, { size: 1 }), // Option type 1 = lzReceive gas
    gasLimitBytes,
  ]);
  // Result: 17 bytes total

  // Step 3: Build complete options
  // Format: [version(2)] + [workerId(1)] + [length(2)] + [optionData(17)]
  return concat([
    toHex(0x0003, { size: 2 }), // Options V2 (type 3)
    toHex(1, { size: 1 }), // Worker ID 1 = Executor
    toHex(17, { size: 2 }), // Length of option data
    optionData, // The actual option
  ]);
  // Final result: 22 bytes total
}
```

**Byte-by-byte breakdown:**

```
0x0003   01   0011   01   00000000000000000000000000030d40
  │      │     │     │    └─ Gas limit (16 bytes)
  │      │     │     └────── Option type: lzReceive (1 byte)
  │      │     └──────────── Option data length (2 bytes)
  │      └────────────────── Worker ID: Executor (1 byte)
  └───────────────────────── Options version: V2 (2 bytes)
```

**Why this format?**

- **Extensible:** Can add multiple options (gas + value, multiple workers, etc.)
- **Efficient:** Compact binary encoding minimizes data size
- **Universal:** Works across all chains and LayerZero versions

### Address Format: bytes32 vs address

Ethereum addresses are 20 bytes, but LayerZero uses 32-byte addresses for chain-agnostic compatibility:

```typescript
// Ethereum address (20 bytes)
const ethereumAddress = "0x1234567890123456789012345678901234567890";

// LayerZero format (32 bytes, padded with leading zeros)
const bytes32Address =
  "0x0000000000000000000000001234567890123456789012345678901234567890";
```

This allows LayerZero to support non-EVM chains with different address formats (Solana, Aptos, etc.).

### SendParam Deep Dive

Let's examine each field in the `SendParam` structure:

```typescript
interface SendParam {
  dstEid: number; // Destination Endpoint ID
  // - Identifies target blockchain
  // - Example: 30110 for Arbitrum

  to: Hex; // Recipient address (bytes32)
  // - Padded to 32 bytes
  // - Allows cross-chain compatibility

  amountLD: bigint; // Amount in Local Decimals
  // - "LD" = Local Decimals (6 for PYUSD)
  // - Sent from source chain

  minAmountLD: bigint; // Minimum amount to receive
  // - Slippage protection
  // - Transaction reverts if received < min

  extraOptions: Hex; // Encoded execution options
  // - Gas limit for lzReceive()
  // - Additional executor parameters

  composeMsg: Hex; // Optional compose message
  // - For complex multi-step operations
  // - 0x for simple transfers

  oftCmd: Hex; // Optional OFT command
  // - For OFT-specific operations
  // - 0x for simple transfers
}
```

**Why minAmountLD?**
If there are protocol fees on the source or destination chain, the amount received might be slightly less than sent. The `minAmountLD` protects against unexpected fees:

```typescript
// Example: 100 PYUSD with 0.5% slippage tolerance
const amount = 100_000_000n; // 100 PYUSD (6 decimals)
const minAmount = 99_500_000n; // 99.5 PYUSD minimum

// If fees cause received amount < 99.5 PYUSD, transaction reverts
```

### Event Parsing: Extracting the GUID

When the OFT emits the `OFTSent` event, it includes critical information:

```solidity
event OFTSent(
    bytes32 indexed guid,       // Globally unique identifier
    uint32 indexed dstEid,      // Destination endpoint ID
    address indexed from,       // Sender address
    uint256 amountLD,           // Amount sent (local decimals)
    uint256 amountSD            // Amount in shared decimals
);
```

The event signature is the keccak256 hash of the event definition:

```typescript
const eventSignature = keccak256(
  "OFTSent(bytes32,uint32,address,uint256,uint256)"
);
// Result: 0x85496b760a4b7f8d66384b9df21b381f5d1b1e79f229a47aaf4c232edc2fe59a
```

**Extracting indexed topics:**

```typescript
// Receipt log structure
{
  topics: [
    '0x8549...',  // topics[0] = event signature
    '0xabcd...',  // topics[1] = guid (indexed)
    '0x0000...',  // topics[2] = dstEid (indexed)
    '0x1234...'   // topics[3] = from (indexed)
  ],
  data: '0x...'   // Non-indexed parameters (amountLD, amountSD)
}

// Extract GUID
const guid = log.topics[1]
```

**Why GUID matters:**

- Unique identifier for your message across all chains
- Used by LayerZero Scan to track delivery
- Necessary for troubleshooting stuck transactions

---

## Best Practices

### Error Handling

**1. Balance Validation**
Always check balance before attempting transfers:

```typescript
const balance = await getBalance(client, tokenAddress, sender);
if (balance < amount) {
  throw new Error(
    `Insufficient balance: have ${formatAmount(balance)}, need ${formatAmount(amount)}`
  );
}
```

**2. Transaction Confirmation**
Never assume a transaction succeeded without checking the receipt:

```typescript
const hash = await walletClient.writeContract({ ... })
const receipt = await publicClient.waitForTransactionReceipt({ hash })

if (receipt.status === 'reverted') {
  throw new Error('Transaction reverted')
}
```

**3. Clear Error Messages**
Provide actionable error messages:

```typescript
// ❌ Bad
console.error("Error");

// ✅ Good
console.error("Error: PRIVATE_KEY environment variable is required");
console.error("Set it in .env file or run: export PRIVATE_KEY=0x...");
```

### Security Considerations

**1. Private Key Management**
Never hardcode or log private keys:

```typescript
// ✅ Good: Load from environment
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("PRIVATE_KEY not set");
}

// ❌ Bad: Hardcoded
const privateKey = "0x1234..."; // NEVER DO THIS
```

**2. Approval Amounts**
Consider the trade-off between convenience and security:

```typescript
// Convenient: Approve max uint256 (one-time approval)
const maxApproval = 2n ** 256n - 1n;

// Secure: Approve exact amount (requires approval per transfer)
const exactApproval = amount;
```

For personal use, max approval is common. For protocols managing user funds, exact approvals are safer.

**3. Slippage Settings**
Default to conservative slippage, allow users to override:

```typescript
const DEFAULT_SLIPPAGE = "0.5"; // 0.5%

// For production, validate user input
const slippage = Number.parseFloat(options.slippage);
if (slippage < 0 || slippage > 5) {
  throw new Error("Slippage must be between 0% and 5%");
}
```

**4. Recipient Validation**
Validate addresses before sending:

```typescript
import { isAddress } from "viem";

if (options.to && !isAddress(options.to)) {
  throw new Error("Invalid recipient address");
}
```

### Performance Tips

**1. RPC Endpoint Configuration**
Use high-quality RPC endpoints for better performance:

```bash
# Free public RPCs (slower, rate-limited)
RPC_ETHEREUM=https://eth.llamarpc.com

# Paid services (faster, more reliable)
RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
```

**2. Client Reuse**
Reuse viem clients instead of creating new ones:

```typescript
// ❌ Creates new client every time
function getBalance() {
  const client = createPublicClient(...)  // Inefficient
  return client.readContract(...)
}

// ✅ Reuse client
const client = createPublicClient(...)
function getBalance() {
  return client.readContract(...)
}
```

**3. Batching RPC Calls (Future Optimization)**
For production, batch multiple reads into a single RPC call:

```typescript
// Note: This is a suggested optimization, not implemented in reference code
import { multicall } from 'viem'

const results = await multicall(client, {
  contracts: [
    { address: oftAddress, abi: ioftAbi, functionName: 'quoteSend', args: [...] },
    { address: oftAddress, abi: ioftAbi, functionName: 'quoteOFT', args: [...] }
  ]
})

// 1 RPC call instead of 2 (50% faster)
```

### User Experience

**1. Step-by-Step Feedback**
Show progress for long-running operations:

```typescript
console.log("Step 1/4: Checking balance...");
// ... do work ...
console.log("  ✓ Balance: 1000 PYUSD");

console.log("Step 2/4: Checking approval...");
// ... do work ...
console.log("  ✓ Approved");
```

**2. Dry-Run Mode**
Allow users to simulate transactions:

```typescript
if (options.dryRun) {
  console.log("Dry run: Transaction would succeed");
  console.log("Remove --dry-run to execute");
  return;
}
```

**3. Explorer Links**
Provide clickable links to block explorers:

```typescript
console.log(`Explorer:     ${config.blockExplorer}/tx/${txHash}`);
console.log(`LayerZero:    https://layerzeroscan.com/tx/${txHash}`);
```

**4. Confirmation Prompts (for production)**
Ask for confirmation before expensive operations:

```typescript
console.log(`This will cost ${formatFee(quote.messagingFee.nativeFee)} ETH`);
const confirmed = await confirm("Continue?");
if (!confirmed) {
  console.log("Cancelled");
  return;
}
```

---

## Conclusion

We've built a complete cross-chain PYUSD transfer system using LayerZero's OFT standard. Let's recap what we learned:

### Key Takeaways

1. **OFT Standard**
   - Enables native cross-chain token transfers
   - OFT Adapters wrap existing tokens
   - Native OFTs burn/mint directly

2. **LayerZero Architecture**
   - EIDs identify blockchains
   - DVNs verify messages
   - Executors deliver on destination
   - Pay fees on source chain

3. **Implementation Details**
   - Binary encoding for options
   - bytes32 addresses for compatibility
   - SendParam structure for transfers
   - GUID for tracking

4. **Developer Experience**
   - Step-by-step progress feedback
   - Clear error messages
   - Dry-run capability
   - Explorer links

### What's Next?

This reference implementation demonstrates the core concepts, but production applications should consider:

**For Production:**

- [ ] Comprehensive test suite (unit, integration, E2E)
- [ ] Runtime validation with libraries like Zod
- [ ] Structured error types and handling
- [ ] Client caching and connection pooling
- [ ] RPC call batching with multicall
- [ ] Metrics and monitoring
- [ ] Rate limiting and retry logic
- [ ] Gas price optimization
- [ ] Support for more chains

**For Learning:**

- [ ] Add support for other OFT tokens
- [ ] Implement compose messages
- [ ] Explore DVN configuration
- [ ] Build a simple web UI
- [ ] Add testnet transfer examples

### Resources

**LayerZero Documentation:**

- [LayerZero V2 Docs](https://docs.layerzero.network)
- [OFT Quickstart](https://docs.layerzero.network/v2/developers/evm/oft/quickstart)
- [LayerZero Scan](https://layerzeroscan.com)

**PYUSD:**

- [PayPal USD](https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd)
- [Paxos PYUSD Docs](https://docs.paxos.com/guides/stablecoin/pyusd)
- [PYUSD Testnet Faucet](https://faucet.paxos.com/)

**Viem:**

- [Viem Documentation](https://viem.sh)
- [Viem GitHub](https://github.com/wagmi-dev/viem)

**Code:**

- [This Project on GitHub](https://github.com/example/pyusd-lz) _(placeholder)_

---

### Thank You!

We hope this guide helps you understand cross-chain token transfers with LayerZero. The patterns and principles here apply to any OFT token, not just PYUSD.

**Questions or feedback?** Open an issue on GitHub or reach out on Twitter.

**Found this helpful?** Star the repository and share with other developers building cross-chain applications!

---

_This blog post and reference implementation were created to demonstrate LayerZero OFT integration. The code is provided for educational purposes and should be thoroughly tested and audited before production use._
