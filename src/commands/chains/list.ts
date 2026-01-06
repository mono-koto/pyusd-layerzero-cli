import {Command, Flags} from '@oclif/core'

import {getSupportedChains} from '../../lib/chains.js'

export default class ChainsList extends Command {
  static description = 'List all chains where PYUSD is available via LayerZero'
static examples = ['<%= config.bin %> chains list', '<%= config.bin %> chains list --format json']
static flags = {
    format: Flags.string({
      char: 'f',
      default: 'table',
      description: 'Output format',
      options: ['table', 'json'],
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(ChainsList)
    const chains = getSupportedChains()

    if (flags.format === 'json') {
      this.log(JSON.stringify(chains, null, 2))
      return
    }

    // Table format
    this.log('')
    this.log('Supported PYUSD Chains')
    this.log('─'.repeat(80))
    this.log(
      `${'Chain'.padEnd(15)} ${'EID'.padEnd(8)} ${'Chain ID'.padEnd(10)} ${'PYUSD OFT Address'.padEnd(44)}`,
    )
    this.log('─'.repeat(80))

    for (const chain of chains) {
      this.log(
        `${chain.name.padEnd(15)} ${chain.eid.toString().padEnd(8)} ${chain.chainId.toString().padEnd(10)} ${chain.pyusdAddress}`,
      )
    }

    this.log('')
    this.log(`Total: ${chains.length} chains`)
    this.log('')
  }
}
