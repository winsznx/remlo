// TIP-403 Compliance Registry precompile ABI
// Precompile address: 0x403c000000000000000000000000000000000000

export const TIP403RegistryABI = [
  {
    type: 'function',
    name: 'isAuthorized',
    inputs: [
      { name: 'policyId', type: 'uint64', internalType: 'uint64' },
      { name: 'wallet', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'createPolicy',
    inputs: [
      { name: 'admin', type: 'address', internalType: 'address' },
      { name: 'rules', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: 'policyId', type: 'uint64', internalType: 'uint64' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updatePolicy',
    inputs: [
      { name: 'policyId', type: 'uint64', internalType: 'uint64' },
      { name: 'rules', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getPolicyAdmin',
    inputs: [{ name: 'policyId', type: 'uint64', internalType: 'uint64' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
] as const
