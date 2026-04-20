import { Keypair } from '@solana/web3.js'
import { encodeFunctionData, parseUnits } from 'viem'
import { buildBatchUsdcTransfer, estimateBatchCount, type PayrollRecipient } from '@/lib/solana-payroll'
import { PayrollBatcherABI } from '@/lib/abis/PayrollBatcher'
import { PAYROLL_BATCHER_ADDRESS } from '@/lib/constants'
import { SOLANA_CLUSTER } from '@/lib/solana-constants'
import { getEmployerById } from '@/lib/queries/employers'
import { getEmployerOnchainIdentity } from '@/lib/employer-onchain'

export interface BatchRecipient {
  employee_id: string
  address: string
  amount: number
}

export interface BatchResult {
  chain: 'tempo' | 'solana'
  total_amount: number
  recipient_count: number
  estimated_fee: number
  calldata?: `0x${string}`
  solana_tx_count?: number
}

export async function executeBatchPayroll(
  employerId: string,
  recipients: BatchRecipient[],
  chain: 'tempo' | 'solana',
): Promise<BatchResult> {
  const total = recipients.reduce((sum, r) => sum + r.amount, 0)

  if (chain === 'solana') {
    const txCount = estimateBatchCount(recipients.length)
    return {
      chain: 'solana',
      total_amount: total,
      recipient_count: recipients.length,
      estimated_fee: 0.000005 * txCount,
      solana_tx_count: txCount,
    }
  }

  const employer = await getEmployerById(employerId)
  if (!employer) throw new Error('Employer not found')

  const onchain = getEmployerOnchainIdentity(employer)
  if (!onchain) throw new Error('Employer on-chain identity not configured')

  const amounts = recipients.map((r) => parseUnits(r.amount.toFixed(6), 6))
  const addresses = recipients.map((r) => r.address as `0x${string}`)
  const memos = recipients.map(() => '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`)

  const calldata = encodeFunctionData({
    abi: PayrollBatcherABI,
    functionName: 'executeBatchPayroll',
    args: [addresses, amounts, memos, onchain.employerAccountId],
  })

  return {
    chain: 'tempo',
    total_amount: total,
    recipient_count: recipients.length,
    estimated_fee: 0,
    calldata,
  }
}
