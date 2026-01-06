import {Args, Command, Flags} from '@oclif/core'

import type {SendParam} from '../types/index.js'

import {getChainConfig} from '../lib/chains.js'
import {createPublicClientForChain, createWalletClientForChain, getAddressFromPrivateKey} from '../lib/client.js'
import {checkAndApprove, getBalance, getTokenAddress, quoteSend, send} from '../lib/oft.js'
import {buildLzReceiveOptions, DEFAULT_GAS_LIMIT} from '../lib/options.js'
import {addressToBytes32} from '../utils/address.js'
import {calculateMinAmount, formatAmount, formatNativeFee, parseAmount, truncateAddress} from '../utils/format.js'

export default class Send extends Command {
  static args = {
    amount: Args.string({
      description: 'Amount of PYUSD to transfer',
      required: true,
    }),
    destination: Args.string({
      description: 'Destination chain',
      required: true,
    }),
    source: Args.string({
      description: 'Source chain (e.g., ethereum, arbitrum, polygon)',
      required: true,
    }),
  }
static description = 'Execute a PYUSD cross-chain transfer'
static examples = [
    'PYUSD_PRIVATE_KEY=0x... <%= config.bin %> send ethereum arbitrum 100',
    'PYUSD_PRIVATE_KEY=0x... <%= config.bin %> send arbitrum polygon 50 --to 0x1234...',
    'PYUSD_PRIVATE_KEY=0x... <%= config.bin %> send ethereum polygon 25 --dry-run',
  ]
static flags = {
    'dry-run': Flags.boolean({
      default: false,
      description: 'Simulate transaction without sending',
    }),
    gas: Flags.integer({
      default: Number(DEFAULT_GAS_LIMIT),
      description: 'Gas limit for destination lzReceive',
    }),
    slippage: Flags.string({
      default: '0.5',
      description: 'Slippage tolerance in percent',
    }),
    to: Flags.string({
      description: 'Recipient address on destination chain (defaults to sender)',
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Send)

    // Require private key
    const privateKey = process.env.PYUSD_PRIVATE_KEY
    if (!privateKey) {
      this.error('PYUSD_PRIVATE_KEY environment variable is required for sending')
    }

    // Get chain configs
    const srcConfig = getChainConfig(args.source)
    const dstConfig = getChainConfig(args.destination)

    // Get sender address
    const senderAddress = getAddressFromPrivateKey(privateKey as `0x${string}`)

    // Determine recipient
    const recipientAddress = (flags.to || senderAddress) as `0x${string}`

    // Parse amount
    const amountLD = parseAmount(args.amount)
    const slippagePercent = Number.parseFloat(flags.slippage)
    const minAmountLD = calculateMinAmount(amountLD, slippagePercent)

    // Build send parameters
    const sendParam: SendParam = {
      amountLD,
      composeMsg: '0x',
      dstEid: dstConfig.eid,
      extraOptions: buildLzReceiveOptions(BigInt(flags.gas)),
      minAmountLD,
      oftCmd: '0x',
      to: addressToBytes32(recipientAddress),
    }

    // Create clients
    const publicClient = createPublicClientForChain(args.source)
    const walletClient = createWalletClientForChain(args.source, privateKey as `0x${string}`)

    this.log('')
    this.log('PYUSD Cross-Chain Transfer')
    this.log('─'.repeat(50))
    this.log(`From:       ${srcConfig.name} → ${dstConfig.name}`)
    this.log(`Sender:     ${truncateAddress(senderAddress)}`)
    this.log(`Recipient:  ${truncateAddress(recipientAddress)}`)
    this.log(`Amount:     ${args.amount} PYUSD`)
    this.log('')

    try {
      // Step 1: Check balance
      this.log('Step 1/4: Checking balance...')
      const tokenAddress = await getTokenAddress(publicClient, srcConfig.pyusdAddress)
      const balance = await getBalance(publicClient, tokenAddress, senderAddress)

      if (balance < amountLD) {
        this.error(`Insufficient balance: have ${formatAmount(balance)} PYUSD, need ${args.amount} PYUSD`)
      }

      this.log(`  ✓ Balance: ${formatAmount(balance)} PYUSD`)
      this.log('')

      // Step 2: Check/set approval
      this.log('Step 2/4: Checking approval...')
      const approvalResult = await checkAndApprove(walletClient, publicClient, srcConfig.pyusdAddress, amountLD)

      if (approvalResult.approved) {
        this.log(`  ✓ Approved (tx: ${truncateAddress(approvalResult.txHash!)})`)
      } else {
        this.log('  ✓ Sufficient allowance (no approval needed)')
      }

      this.log('')

      // Step 3: Get quote
      this.log('Step 3/4: Getting quote...')
      const quote = await quoteSend(publicClient, srcConfig.pyusdAddress, sendParam)
      this.log(`  ✓ Fee: ${formatNativeFee(quote.messagingFee.nativeFee, srcConfig.nativeCurrency.symbol)}`)
      this.log(`  ✓ Will receive: ${formatAmount(quote.receipt.amountReceivedLD)} PYUSD`)
      this.log('')

      // Step 4: Send (or dry run)
      if (flags['dry-run']) {
        this.log('Step 4/4: Dry run (skipping actual send)')
        this.log('  ✓ Transaction simulation successful')
        this.log('')
        this.log('─'.repeat(50))
        this.log('Dry run complete. Remove --dry-run flag to execute.')
        this.log('')
        return
      }

      this.log('Step 4/4: Sending transaction...')
      const {guid, txHash} = await send(
        walletClient,
        publicClient,
        srcConfig.pyusdAddress,
        sendParam,
        quote.messagingFee,
        senderAddress,
      )

      this.log(`  ✓ Transaction sent!`)
      this.log('')

      // Display results
      this.log('Results')
      this.log('─'.repeat(50))
      this.log(`TX Hash:      ${txHash}`)
      this.log(`Explorer:     ${srcConfig.blockExplorer}/tx/${txHash}`)
      if (guid !== '0x') {
        this.log(`LayerZero:    https://layerzeroscan.com/tx/${txHash}`)
      }

      this.log('')
      this.log('Status: Pending (check LayerZero scan for cross-chain delivery)')
      this.log('')
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Transaction failed: ${error.message}`)
      }

      throw error
    }
  }
}
