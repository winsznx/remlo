import { Connection, PublicKey } from '@solana/web3.js'
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token'
import { treasury } from '@/lib/contracts'
import { getEmployerOnchainIdentity } from '@/lib/employer-onchain'
import { getEmployerById } from '@/lib/queries/employers'
import {
  SOLANA_RPC_URL,
  SOLANA_USDC_MINT_DEVNET,
  SOLANA_USDC_MINT_MAINNET,
  SOLANA_USDC_DECIMALS,
  SOLANA_CLUSTER,
} from '@/lib/solana-constants'

export interface TreasuryStatus {
  employer_id: string
  tempo_balance: number
  solana_balance: number
  total_usd: number
  sufficient_for_next_payroll: boolean
  shortfall?: number
}

export async function checkTreasuryBalance(
  employerId: string,
  requiredAmount = 0,
): Promise<TreasuryStatus> {
  const employer = await getEmployerById(employerId)

  let tempoBalance = 0
  if (employer) {
    const onchain = getEmployerOnchainIdentity(employer)
    if (onchain) {
      try {
        const [available, locked] = await Promise.all([
          treasury.read.getAvailableBalance([onchain.employerAccountId]) as Promise<bigint>,
          treasury.read.getLockedBalance([onchain.employerAccountId]) as Promise<bigint>,
        ])
        tempoBalance = Number(available + locked) / 1e6
      } catch {
        // RPC error — leave at 0
      }
    }
  }

  let solanaBalance = 0
  const solanaAddr = employer?.solana_treasury_address
  if (solanaAddr) {
    try {
      const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
      const mint = new PublicKey(
        SOLANA_CLUSTER === 'mainnet-beta' ? SOLANA_USDC_MINT_MAINNET : SOLANA_USDC_MINT_DEVNET,
      )
      const ata = getAssociatedTokenAddressSync(mint, new PublicKey(solanaAddr))
      const account = await getAccount(connection, ata)
      solanaBalance = Number(account.amount) / 10 ** SOLANA_USDC_DECIMALS
    } catch {
      // ATA not found or RPC error — leave at 0
    }
  }

  const total = tempoBalance + solanaBalance
  const sufficient = total >= requiredAmount
  const shortfall = sufficient ? undefined : requiredAmount - total

  return {
    employer_id: employerId,
    tempo_balance: tempoBalance,
    solana_balance: solanaBalance,
    total_usd: total,
    sufficient_for_next_payroll: sufficient,
    shortfall,
  }
}
