import { createPublicClient, createWalletClient, http, getContract } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import {
  TEMPO_RPC_URL,
  PATHUSD_ADDRESS,
  TIP403_REGISTRY,
  PAYROLL_TREASURY_ADDRESS,
  PAYROLL_BATCHER_ADDRESS,
  EMPLOYEE_REGISTRY_ADDRESS,
  STREAM_VESTING_ADDRESS,
  YIELD_ROUTER_ADDRESS,
} from '@/lib/constants'
import { PayrollTreasuryABI } from '@/lib/abis/PayrollTreasury'
import { PayrollBatcherABI } from '@/lib/abis/PayrollBatcher'
import { EmployeeRegistryABI } from '@/lib/abis/EmployeeRegistry'
import { StreamVestingABI } from '@/lib/abis/StreamVesting'
import { YieldRouterABI } from '@/lib/abis/YieldRouter'
import { TIP403RegistryABI } from '@/lib/abis/TIP403Registry'

const Tip20BalanceAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const

export const tempoTransport = http(TEMPO_RPC_URL)

export const publicClient = createPublicClient({
  transport: tempoTransport,
  chain: {
    id: 42431,
    name: 'Tempo Moderato',
    nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 6 },
    rpcUrls: { default: { http: [TEMPO_RPC_URL] } },
  },
})

/**
 * Returns a wallet client for the given private key.
 * Used in server-side route handlers only — never expose private keys to client.
 */
export function getServerWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey)
  return createWalletClient({
    account,
    transport: tempoTransport,
    chain: publicClient.chain,
  })
}

export const treasury = getContract({
  address: PAYROLL_TREASURY_ADDRESS,
  abi: PayrollTreasuryABI,
  client: publicClient,
})

export const pathUsdToken = getContract({
  address: PATHUSD_ADDRESS,
  abi: Tip20BalanceAbi,
  client: publicClient,
})

export const payrollBatcher = getContract({
  address: PAYROLL_BATCHER_ADDRESS,
  abi: PayrollBatcherABI,
  client: publicClient,
})

export const employeeRegistry = getContract({
  address: EMPLOYEE_REGISTRY_ADDRESS,
  abi: EmployeeRegistryABI,
  client: publicClient,
})

export const streamVesting = getContract({
  address: STREAM_VESTING_ADDRESS,
  abi: StreamVestingABI,
  client: publicClient,
})

export const yieldRouter = getContract({
  address: YIELD_ROUTER_ADDRESS,
  abi: YieldRouterABI,
  client: publicClient,
})

export const tip403Registry = getContract({
  address: TIP403_REGISTRY as `0x${string}`,
  abi: TIP403RegistryABI,
  client: publicClient,
})
