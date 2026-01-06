// IOFT ABI - LayerZero Omnichain Fungible Token interface
// Source: https://github.com/LayerZero-Labs/devtools/blob/main/packages/oft-evm/contracts/interfaces/IOFT.sol

export const ioftAbi = [
  // Read functions
  {
    inputs: [],
    name: 'token',
    outputs: [{name: '', type: 'address'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'approvalRequired',
    outputs: [{name: '', type: 'bool'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'sharedDecimals',
    outputs: [{name: '', type: 'uint8'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'oftVersion',
    outputs: [
      {name: 'interfaceId', type: 'bytes4'},
      {name: 'version', type: 'uint64'},
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Quote functions
  {
    inputs: [
      {
        components: [
          {name: 'dstEid', type: 'uint32'},
          {name: 'to', type: 'bytes32'},
          {name: 'amountLD', type: 'uint256'},
          {name: 'minAmountLD', type: 'uint256'},
          {name: 'extraOptions', type: 'bytes'},
          {name: 'composeMsg', type: 'bytes'},
          {name: 'oftCmd', type: 'bytes'},
        ],
        name: '_sendParam',
        type: 'tuple',
      },
    ],
    name: 'quoteOFT',
    outputs: [
      {
        components: [
          {name: 'minAmountLD', type: 'uint256'},
          {name: 'maxAmountLD', type: 'uint256'},
        ],
        name: 'limit',
        type: 'tuple',
      },
      {
        components: [
          {name: 'feeAmountLD', type: 'int256'},
          {name: 'description', type: 'string'},
        ],
        name: 'oftFeeDetails',
        type: 'tuple[]',
      },
      {
        components: [
          {name: 'amountSentLD', type: 'uint256'},
          {name: 'amountReceivedLD', type: 'uint256'},
        ],
        name: 'receipt',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {name: 'dstEid', type: 'uint32'},
          {name: 'to', type: 'bytes32'},
          {name: 'amountLD', type: 'uint256'},
          {name: 'minAmountLD', type: 'uint256'},
          {name: 'extraOptions', type: 'bytes'},
          {name: 'composeMsg', type: 'bytes'},
          {name: 'oftCmd', type: 'bytes'},
        ],
        name: '_sendParam',
        type: 'tuple',
      },
      {name: '_payInLzToken', type: 'bool'},
    ],
    name: 'quoteSend',
    outputs: [
      {
        components: [
          {name: 'nativeFee', type: 'uint256'},
          {name: 'lzTokenFee', type: 'uint256'},
        ],
        name: 'msgFee',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Send function
  {
    inputs: [
      {
        components: [
          {name: 'dstEid', type: 'uint32'},
          {name: 'to', type: 'bytes32'},
          {name: 'amountLD', type: 'uint256'},
          {name: 'minAmountLD', type: 'uint256'},
          {name: 'extraOptions', type: 'bytes'},
          {name: 'composeMsg', type: 'bytes'},
          {name: 'oftCmd', type: 'bytes'},
        ],
        name: '_sendParam',
        type: 'tuple',
      },
      {
        components: [
          {name: 'nativeFee', type: 'uint256'},
          {name: 'lzTokenFee', type: 'uint256'},
        ],
        name: '_fee',
        type: 'tuple',
      },
      {name: '_refundAddress', type: 'address'},
    ],
    name: 'send',
    outputs: [
      {
        components: [
          {name: 'guid', type: 'bytes32'},
          {name: 'nonce', type: 'uint64'},
          {
            components: [
              {name: 'nativeFee', type: 'uint256'},
              {name: 'lzTokenFee', type: 'uint256'},
            ],
            name: 'fee',
            type: 'tuple',
          },
        ],
        name: 'msgReceipt',
        type: 'tuple',
      },
      {
        components: [
          {name: 'amountSentLD', type: 'uint256'},
          {name: 'amountReceivedLD', type: 'uint256'},
        ],
        name: 'oftReceipt',
        type: 'tuple',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  // Events
  {
    inputs: [
      {indexed: true, name: 'guid', type: 'bytes32'},
      {indexed: false, name: 'dstEid', type: 'uint32'},
      {indexed: true, name: 'fromAddress', type: 'address'},
      {indexed: false, name: 'amountSentLD', type: 'uint256'},
      {indexed: false, name: 'amountReceivedLD', type: 'uint256'},
    ],
    name: 'OFTSent',
    type: 'event',
  },
  {
    inputs: [
      {indexed: true, name: 'guid', type: 'bytes32'},
      {indexed: false, name: 'srcEid', type: 'uint32'},
      {indexed: true, name: 'toAddress', type: 'address'},
      {indexed: false, name: 'amountReceivedLD', type: 'uint256'},
    ],
    name: 'OFTReceived',
    type: 'event',
  },
] as const
