import {Args, Command, Flags} from '@oclif/core'

import {getChainConfig} from '../lib/chains.js'
import {createPublicClientForChain, getAddressFromPrivateKey} from '../lib/client.js'
import {getBalance, getTokenAddress} from '../lib/oft.js'
import {formatAmount} from '../utils/format.js'

export default class Balance extends Command {
  static args = {
    chain: Args.string({
      description: 'Chain to check balance on (e.g., ethereum, arbitrum, polygon)',
      required: true,
    }),
  }
static description = 'Check PYUSD balance on a chain'
static examples = [
    '<%= config.bin %> balance ethereum',
    '<%= config.bin %> balance arbitrum',
    'PYUSD_PRIVATE_KEY=0x... <%= config.bin %> balance polygon',
  ]
static flags = {
    address: Flags.string({
      char: 'a',
      description: 'Address to check (defaults to address derived from PYUSD_PRIVATE_KEY)',
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Balance)

    // Get chain config
    const chainConfig = getChainConfig(args.chain)

    // Determine address to check
    let address: `0x${string}`
    if (flags.address) {
      address = flags.address as `0x${string}`
    } else {
      const privateKey = process.env.PYUSD_PRIVATE_KEY
      if (!privateKey) {
        this.error('Either --address flag or PYUSD_PRIVATE_KEY environment variable is required')
      }

      address = getAddressFromPrivateKey(privateKey as `0x${string}`)
    }

    // Create client and fetch balance
    const client = createPublicClientForChain(args.chain)

    this.log('')
    this.log(`Checking PYUSD balance on ${chainConfig.name}...`)
    this.log('')

    try {
      // Get the underlying token address from the OFT
      const tokenAddress = await getTokenAddress(client, chainConfig.pyusdAddress)

      // Get balance
      const balance = await getBalance(client, tokenAddress, address)
      const formattedBalance = formatAmount(balance)

      this.log(`Address:  ${address}`)
      this.log(`Chain:    ${chainConfig.name} (EID: ${chainConfig.eid})`)
      this.log(`Balance:  ${formattedBalance} PYUSD`)
      this.log('')
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to fetch balance: ${error.message}`)
      }

      throw error
    }
  }
}
