import {Args, Command, Flags} from '@oclif/core'

import type {SendParam} from '../types/index.js'

import {getChainConfig} from '../lib/chains.js'
import {createPublicClientForChain, getAddressFromPrivateKey} from '../lib/client.js'
import {quoteSend} from '../lib/oft.js'
import {buildLzReceiveOptions, DEFAULT_GAS_LIMIT} from '../lib/options.js'
import {addressToBytes32} from '../utils/address.js'
import {calculateMinAmount, formatAmount, formatNativeFee, parseAmount} from '../utils/format.js'

export default class Quote extends Command {
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
static description = 'Get a fee quote for a PYUSD cross-chain transfer'
static examples = [
    '<%= config.bin %> quote ethereum arbitrum 100',
    '<%= config.bin %> quote arbitrum polygon 50.5 --to 0x1234...',
    '<%= config.bin %> quote ethereum polygon 25 --slippage 1',
  ]
static flags = {
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
    const {args, flags} = await this.parse(Quote)

    // Get chain configs
    const srcConfig = getChainConfig(args.source)
    const dstConfig = getChainConfig(args.destination)

    // Parse amount
    const amountLD = parseAmount(args.amount)
    const slippagePercent = Number.parseFloat(flags.slippage)
    const minAmountLD = calculateMinAmount(amountLD, slippagePercent)

    // Determine recipient address
    let recipientAddress: `0x${string}`
    if (flags.to) {
      recipientAddress = flags.to as `0x${string}`
    } else {
      const privateKey = process.env.PYUSD_PRIVATE_KEY
      if (!privateKey) {
        this.error('Either --to flag or PYUSD_PRIVATE_KEY environment variable is required')
      }

      recipientAddress = getAddressFromPrivateKey(privateKey as `0x${string}`)
    }

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

    // Create client and get quote
    const client = createPublicClientForChain(args.source)

    this.log('')
    this.log('PYUSD Transfer Quote')
    this.log('─'.repeat(50))

    try {
      const quote = await quoteSend(client, srcConfig.pyusdAddress, sendParam)

      // Display results
      this.log(`Source:         ${srcConfig.name} (EID: ${srcConfig.eid})`)
      this.log(`Destination:    ${dstConfig.name} (EID: ${dstConfig.eid})`)
      this.log(`Recipient:      ${recipientAddress}`)
      this.log(`Amount:         ${args.amount} PYUSD`)
      this.log('')
      this.log('Fees')
      this.log('─'.repeat(50))
      this.log(`LayerZero Fee:  ${formatNativeFee(quote.messagingFee.nativeFee, srcConfig.nativeCurrency.symbol)}`)

      if (quote.feeDetails.length > 0) {
        for (const fee of quote.feeDetails) {
          this.log(`Protocol Fee:   ${formatAmount(fee.feeAmountLD)} PYUSD (${fee.description})`)
        }
      }

      this.log('')
      this.log('Amounts')
      this.log('─'.repeat(50))
      this.log(`Amount Sent:     ${formatAmount(quote.receipt.amountSentLD)} PYUSD`)
      this.log(`Amount Received: ${formatAmount(quote.receipt.amountReceivedLD)} PYUSD`)
      this.log(`Min Received:    ${formatAmount(minAmountLD)} PYUSD (${flags.slippage}% slippage)`)

      this.log('')
      this.log('Limits')
      this.log('─'.repeat(50))
      this.log(`Min Transfer:   ${formatAmount(quote.limit.minAmountLD)} PYUSD`)
      this.log(`Max Transfer:   ${formatAmount(quote.limit.maxAmountLD)} PYUSD`)
      this.log('')
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to get quote: ${error.message}`)
      }

      throw error
    }
  }
}
