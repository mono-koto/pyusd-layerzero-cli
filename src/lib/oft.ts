import type {Address, Hex, PublicClient, WalletClient} from 'viem'
import {toEventSignature} from 'viem'

import type {MessagingFee, QuoteResult, SendParam} from '../types/index'

import {erc20Abi} from './abi/erc20'
import {ioftAbi} from './abi/ioft'

/**
 * OFTSent event definition
 * Emitted when tokens are sent cross-chain. The GUID (first indexed topic)
 * is a globally unique identifier used to track the message across LayerZero network.
 */
const OFT_SENT_EVENT = {
  type: 'event',
  name: 'OFTSent',
  inputs: [
    {name: 'guid', type: 'bytes32', indexed: true},
    {name: 'dstEid', type: 'uint32', indexed: true},
    {name: 'fromAddress', type: 'address', indexed: true},
    {name: 'amountSentLD', type: 'uint256', indexed: false},
    {name: 'amountReceivedLD', type: 'uint256', indexed: false},
  ],
} as const

const OFT_SENT_EVENT_SIGNATURE = toEventSignature(OFT_SENT_EVENT)

/**
 * Get the underlying ERC20 token address for an OFT
 * Falls back to the address itself if it's not an OFT adapter (e.g., raw token on testnet)
 */
export async function getTokenAddress(client: PublicClient, oftAddress: Address): Promise<Address> {
  try {
    return await client.readContract({
      abi: ioftAbi,
      address: oftAddress,
      functionName: 'token',
    }) as Address
  } catch {
    // If token() doesn't exist, assume the address is the token itself
    return oftAddress
  }
}

/**
 * Check if ERC20 approval is required for the OFT
 */
export async function isApprovalRequired(client: PublicClient, oftAddress: Address): Promise<boolean> {
  return client.readContract({
    abi: ioftAbi,
    address: oftAddress,
    functionName: 'approvalRequired',
  }) as Promise<boolean>
}

/**
 * Get PYUSD balance for an address
 */
export async function getBalance(client: PublicClient, tokenAddress: Address, account: Address): Promise<bigint> {
  return client.readContract({
    abi: erc20Abi,
    address: tokenAddress,
    args: [account],
    functionName: 'balanceOf',
  }) as Promise<bigint>
}

/**
 * Get current allowance for the OFT contract
 */
export async function getAllowance(
  client: PublicClient,
  tokenAddress: Address,
  owner: Address,
  spender: Address,
): Promise<bigint> {
  return client.readContract({
    abi: erc20Abi,
    address: tokenAddress,
    args: [owner, spender],
    functionName: 'allowance',
  }) as Promise<bigint>
}

/**
 * Approve the OFT contract to spend tokens
 */
export async function approve(
  walletClient: WalletClient,
  publicClient: PublicClient,
  tokenAddress: Address,
  spender: Address,
  amount: bigint,
): Promise<Hex> {
  const hash = await walletClient.writeContract({
    abi: erc20Abi,
    account: walletClient.account!,
    address: tokenAddress,
    args: [spender, amount],
    chain: walletClient.chain,
    functionName: 'approve',
  })

  // Wait for transaction confirmation
  await publicClient.waitForTransactionReceipt({hash})

  return hash
}

/**
 * Get a quote for sending tokens cross-chain
 * Returns messaging fee and OFT-specific details (limits, fees, receipt preview)
 */
export async function quoteSend(
  client: PublicClient,
  oftAddress: Address,
  sendParam: SendParam,
  payInLzToken: boolean = false,
): Promise<QuoteResult> {
  // Get messaging fee
  const messagingFee = (await client.readContract({
    abi: ioftAbi,
    address: oftAddress,
    args: [sendParam, payInLzToken],
    functionName: 'quoteSend',
  })) as {lzTokenFee: bigint; nativeFee: bigint;}

  // Get OFT-specific quote (limits, fees, receipt)
  const [limit, feeDetails, receipt] = (await client.readContract({
    abi: ioftAbi,
    address: oftAddress,
    args: [sendParam],
    functionName: 'quoteOFT',
  })) as [
    {maxAmountLD: bigint; minAmountLD: bigint;},
    Array<{description: string; feeAmountLD: bigint;}>,
    {amountReceivedLD: bigint; amountSentLD: bigint;},
  ]

  return {
    feeDetails: feeDetails.map((f) => ({
      description: f.description,
      feeAmountLD: f.feeAmountLD,
    })),
    limit: {
      maxAmountLD: limit.maxAmountLD,
      minAmountLD: limit.minAmountLD,
    },
    messagingFee: {
      lzTokenFee: messagingFee.lzTokenFee,
      nativeFee: messagingFee.nativeFee,
    },
    receipt: {
      amountReceivedLD: receipt.amountReceivedLD,
      amountSentLD: receipt.amountSentLD,
    },
  }
}

/**
 * Send tokens cross-chain
 * Returns the transaction hash
 */
export async function send(
  walletClient: WalletClient,
  publicClient: PublicClient,
  oftAddress: Address,
  sendParam: SendParam,
  fee: MessagingFee,
  refundAddress: Address,
): Promise<{guid: Hex; txHash: Hex;}> {
  const hash = await walletClient.writeContract({
    abi: ioftAbi,
    account: walletClient.account!,
    address: oftAddress,
    args: [sendParam, fee, refundAddress],
    chain: walletClient.chain,
    functionName: 'send',
    value: fee.nativeFee,
  })

  // Wait for transaction and get receipt to extract guid
  const receipt = await publicClient.waitForTransactionReceipt({hash})

  // Extract guid from OFTSent event logs
  // The guid is the first indexed topic in the OFTSent event
  let guid: Hex = '0x'
  for (const log of receipt.logs) {
    if (log.topics[0] === OFT_SENT_EVENT_SIGNATURE) {
      guid = log.topics[1] as Hex
      break
    }
  }

  return {guid, txHash: hash}
}

/**
 * Check and approve tokens if needed
 * Returns true if approval was performed
 */
export async function checkAndApprove(
  walletClient: WalletClient,
  publicClient: PublicClient,
  oftAddress: Address,
  amount: bigint,
): Promise<{approved: boolean; txHash?: Hex}> {
  // Check if approval is required for this OFT
  const needsApproval = await isApprovalRequired(publicClient, oftAddress)
  if (!needsApproval) {
    return {approved: false}
  }

  // Get the underlying token address
  const tokenAddress = await getTokenAddress(publicClient, oftAddress)

  // Get current allowance
  const owner = walletClient.account!.address
  const currentAllowance = await getAllowance(publicClient, tokenAddress, owner, oftAddress)

  // If allowance is sufficient, no approval needed
  if (currentAllowance >= amount) {
    return {approved: false}
  }

  // Approve max uint256 for convenience (common pattern)
  const maxApproval = 2n ** 256n - 1n
  const txHash = await approve(walletClient, publicClient, tokenAddress, oftAddress, maxApproval)

  return {approved: true, txHash}
}
