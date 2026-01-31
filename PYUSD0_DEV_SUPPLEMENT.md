# PYUSD0 Cross-Chain Transfers (Mesh Network)

Supplemental guide for PYUSD0-to-PYUSD0 transfers. See [PYUSD_STARGATE_DEV_GUIDE.md](./PYUSD_STARGATE_DEV_GUIDE.md) for the main guide.

## Overview

PYUSD0 chains form a **mesh network** where any PYUSD0 chain can transfer directly to any other PYUSD0 chain without routing through Arbitrum or Ethereum. This enables efficient transfers between chains like Avalanche, Sei, Ink, Abstract, and Plume.

**Important:** PYUSD0 token addresses vary across chains. Always fetch the correct address from the Stargate API rather than hardcoding values—addresses may change as new chains are added or contracts are upgraded.

## Discovering PYUSD0 Chains

Use the [Chains API](https://docs.stargate.finance/developers/api-docs/chains) to discover which chains support PYUSD0:

```typescript
interface StargateChain {
  key: string;
  chainId: number;
  name: string;
  tokens: Array<{ symbol: string; address: string }>;
}

async function getPYUSD0Chains(): Promise<StargateChain[]> {
  const response = await fetch("https://stargate.finance/api/v1/chains");
  const data = await response.json();

  // Filter chains that have PYUSD or PYUSD0 token
  return data.chains.filter((chain: StargateChain) =>
    chain.tokens?.some((t) => t.symbol === "PYUSD" || t.symbol === "PYUSD0"),
  );
}

// Usage
const pyusd0Chains = await getPYUSD0Chains();
console.log(pyusd0Chains.map((c) => c.key)); // ['ink', 'plumephoenix', 'avalanche', ...]
```

### Current PYUSD0 Chains (Reference Only)

| Chain     | Chain ID | Token Address                                |
| --------- | -------- | -------------------------------------------- |
| Avalanche | 43114    | `0x142cdc44890978b506e745bb3bd11607b7f7faef` |
| Sei       | 1329     | `0x142cdc44890978b506e745bb3bd11607b7f7faef` |
| Ink       | 57073    | `0x142cdc44890978b506e745bb3bd11607b7f7faef` |
| Abstract  | 2741     | `0x142cdc44890978b506e745bb3bd11607b7f7faef` |
| Plume     | 98866    | `0x142cdc44890978b506e745bb3bd11607b7f7faef` |
| Fraxtal   | 252      | `0x99af3eea856556646c98c8b9b2548fe815240750` |
| Polygon   | 137      | `0x99af3eea856556646c98c8b9b2548fe815240750` |
| Flow      | 747      | `0x99af3eea856556646c98c8b9b2548fe815240750` |

> ⚠️ These addresses are provided for reference. Always fetch current addresses from the Stargate API.

## Fetching Token Addresses from Stargate API

Use the [Tokens API](https://docs.stargate.finance/developers/api-docs/tokens) to get the PYUSD0 address for a specific chain:

```typescript
interface StargateToken {
  address: string;
  symbol: string;
  decimals: number;
  chainKey: string;
}

async function getPYUSD0Address(srcChainKey: string): Promise<string> {
  const response = await fetch(
    `https://stargate.finance/api/v1/tokens?` +
      new URLSearchParams({ srcChainKey }),
  );
  const data = await response.json();

  // Find PYUSD0 token for this chain
  const pyusd0 = data.tokens?.find(
    (t: StargateToken) => t.symbol === "PYUSD" || t.symbol === "PYUSD0",
  );

  if (!pyusd0) {
    throw new Error(`PYUSD0 not found on chain: ${srcChainKey}`);
  }

  return pyusd0.address;
}

// Usage
const inkPYUSD0 = await getPYUSD0Address("ink");
const plumePYUSD0 = await getPYUSD0Address("plumephoenix");
```

## Example: Ink → Plume Transfer

```typescript
import {
  createPublicClient,
  createWalletClient,
  http,
  erc20Abi,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Define custom chains (not in viem's built-in list)
const ink = defineChain({
  id: 57073,
  name: "Ink",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc-gel.inkonchain.com"] } },
});

async function transferPYUSD0(
  srcChainKey: string,
  dstChainKey: string,
  amount: string,
) {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  // 1. Fetch token addresses from Stargate API
  const srcToken = await getPYUSD0Address(srcChainKey);
  const dstToken = await getPYUSD0Address(dstChainKey);

  const publicClient = createPublicClient({
    chain: ink,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: ink,
    transport: http(),
  });

  // 2. Check balance on source chain
  const balance = await publicClient.readContract({
    abi: erc20Abi,
    address: srcToken as `0x${string}`,
    functionName: "balanceOf",
    args: [account.address],
  });

  const amountWei = BigInt(parseFloat(amount) * 1e6); // PYUSD0 has 6 decimals
  if (balance < amountWei) {
    throw new Error(`Insufficient PYUSD0 balance: ${balance} < ${amountWei}`);
  }

  // 3. Get quote from Stargate API
  const minAmount = ((amountWei * 995n) / 1000n).toString(); // 0.5% slippage

  const quoteResponse = await fetch(
    "https://stargate.finance/api/v1/quotes?" +
      new URLSearchParams({
        srcToken,
        dstToken,
        srcAddress: account.address,
        dstAddress: account.address,
        srcChainKey,
        dstChainKey,
        srcAmount: amountWei.toString(),
        dstAmountMin: minAmount,
      }),
  );

  const data = await quoteResponse.json();

  if (!data.quotes?.length) {
    throw new Error("No routes available for PYUSD0 transfer");
  }

  const quote = data.quotes[0];
  console.log(`Transferring ${amount} PYUSD0: ${srcChainKey} → ${dstChainKey}`);
  console.log(`Expected receive: ${quote.dstAmount} (min: ${minAmount})`);

  // 3. Execute transaction steps (approve + bridge)
  let bridgeTxHash: string | undefined;

  for (const step of quote.steps) {
    console.log(`Executing ${step.type} step...`);

    const hash = await walletClient.sendTransaction({
      to: step.transaction.to,
      data: step.transaction.data,
      value: step.transaction.value
        ? BigInt(step.transaction.value)
        : undefined,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ${step.type}: ${hash} (status: ${receipt.status})`);

    if (step.type === "bridge") {
      bridgeTxHash = hash;
    }
  }

  console.log(`\nTrack delivery: https://layerzeroscan.com/tx/${bridgeTxHash}`);
  return bridgeTxHash;
}

// Usage: Ink → Plume
transferPYUSD0("ink", "plumephoenix", "10").catch(console.error);
```

## Dynamic Chain Configuration

For applications supporting multiple PYUSD0 chains, fetch configuration dynamically:

```typescript
interface ChainConfig {
  chainKey: string;
  tokenAddress: string;
  chainId: number;
}

// Cache token addresses to avoid repeated API calls
const chainConfigCache = new Map<string, ChainConfig>();

async function getChainConfig(chainKey: string): Promise<ChainConfig> {
  if (chainConfigCache.has(chainKey)) {
    return chainConfigCache.get(chainKey)!;
  }

  const tokenAddress = await getPYUSD0Address(chainKey);

  // Chain IDs for reference (these are stable)
  const chainIds: Record<string, number> = {
    avalanche: 43114,
    sei: 1329,
    ink: 57073,
    abstract: 2741,
    plumephoenix: 98866,
    fraxtal: 252,
    polygon: 137,
    flow: 747,
  };

  const config: ChainConfig = {
    chainKey,
    tokenAddress,
    chainId: chainIds[chainKey] ?? 0,
  };

  chainConfigCache.set(chainKey, config);
  return config;
}

async function getQuoteParams(
  srcChainKey: string,
  dstChainKey: string,
  address: string,
  amount: bigint,
) {
  const [src, dst] = await Promise.all([
    getChainConfig(srcChainKey),
    getChainConfig(dstChainKey),
  ]);

  const minAmount = ((amount * 995n) / 1000n).toString();

  return {
    srcToken: src.tokenAddress,
    dstToken: dst.tokenAddress,
    srcAddress: address,
    dstAddress: address,
    srcChainKey: src.chainKey,
    dstChainKey: dst.chainKey,
    srcAmount: amount.toString(),
    dstAmountMin: minAmount,
  };
}

// Usage: Ink → Plume
const params = await getQuoteParams(
  "ink",
  "plumephoenix",
  "0x...",
  100_000_000n,
);
```

## Mesh Network Routes

All PYUSD0 chains can transfer directly to each other:

```
  Avalanche ←→ Sei ←→ Ink ←→ Abstract ←→ Plume
      ↑         ↑       ↑        ↑          ↑
      └─────────┴───────┴────────┴──────────┘
                  (mesh network)
```

This means:

- **No hub dependency**: Unlike PYUSD transfers that may need to route through Arbitrum
- **Lower fees**: Direct transfers avoid multi-hop gas costs
- **Faster settlement**: Single bridge transaction

## Resources

- [Main Developer Guide](./PYUSD_STARGATE_DEV_GUIDE.md)
- [Stargate API Documentation](https://docs.stargate.finance)
- [LayerZero Scan](https://layerzeroscan.com)
