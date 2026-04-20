import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token'
import { getCallerEmployer } from '@/lib/auth'
import { treasury, pathUsdToken } from '@/lib/contracts'
import { getEmployerOnchainIdentity, getEmployerOnchainIdentityError } from '@/lib/employer-onchain'
import { getRemloAgentWallets } from '@/lib/privy-server'
import {
  SOLANA_RPC_URL,
  SOLANA_USDC_MINT_DEVNET,
  SOLANA_USDC_MINT_MAINNET,
  SOLANA_USDC_DECIMALS,
  SOLANA_CLUSTER,
} from '@/lib/solana-constants'

/**
 * GET /api/x402/treasury/status
 * Cross-chain treasury balances: Tempo pathUSD + Solana USDC.
 * Authenticated via Privy JWT (no x402 gating yet — Phase F2).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const employer = await getCallerEmployer(req)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [tempoResult, solanaResult, agentWallet] = await Promise.all([
    readTempoBalance(employer),
    readSolanaBalance(employer.solana_treasury_address),
    readAgentWalletBalances(),
  ])

  const tempoUsd = tempoResult.balance
  const solanaUsd = solanaResult.balance

  return NextResponse.json({
    tempo: { balance: tempoUsd, currency: 'pathUSD', ...tempoResult.meta },
    solana: { balance: solanaUsd, currency: 'USDC', ...solanaResult.meta },
    total_usd: tempoUsd + solanaUsd,
    agent_wallet: agentWallet,
    timestamp: Date.now(),
  })
}

async function readAgentWalletBalances(): Promise<{
  tempo_address: string | null
  tempo_balance: number | null
  solana_address: string | null
  solana_balance: number | null
}> {
  const { tempoWallet, solanaWallet } = getRemloAgentWallets()

  let tempoBalance: number | null = null
  if (tempoWallet) {
    try {
      const raw = (await pathUsdToken.read.balanceOf([tempoWallet.address as `0x${string}`])) as bigint
      tempoBalance = Number(raw) / 1e6
    } catch {
      tempoBalance = null
    }
  }

  let solanaBalance: number | null = null
  if (solanaWallet) {
    try {
      const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
      const mint = new PublicKey(
        SOLANA_CLUSTER === 'mainnet-beta' ? SOLANA_USDC_MINT_MAINNET : SOLANA_USDC_MINT_DEVNET,
      )
      const owner = new PublicKey(solanaWallet.address)
      const ata = getAssociatedTokenAddressSync(mint, owner)
      const account = await getAccount(connection, ata)
      solanaBalance = Number(account.amount) / 10 ** SOLANA_USDC_DECIMALS
    } catch {
      // ATA not created yet (wallet unfunded) — report 0, not an error
      solanaBalance = solanaWallet ? 0 : null
    }
  }

  return {
    tempo_address: tempoWallet?.address ?? null,
    tempo_balance: tempoBalance,
    solana_address: solanaWallet?.address ?? null,
    solana_balance: solanaBalance,
  }
}

async function readTempoBalance(
  employer: Awaited<ReturnType<typeof getCallerEmployer>> & object,
): Promise<{ balance: number; meta: Record<string, unknown> }> {
  const onchainIdentity = getEmployerOnchainIdentity(employer)
  if (!onchainIdentity) {
    const err = getEmployerOnchainIdentityError(employer)
    return { balance: 0, meta: { error: err.error } }
  }

  try {
    const [available, locked] = await Promise.all([
      treasury.read.getAvailableBalance([onchainIdentity.employerAccountId]) as Promise<bigint>,
      treasury.read.getLockedBalance([onchainIdentity.employerAccountId]) as Promise<bigint>,
    ])
    return {
      balance: Number(available + locked) / 1e6,
      meta: {
        available_usd: Number(available) / 1e6,
        locked_usd: Number(locked) / 1e6,
      },
    }
  } catch (err) {
    return { balance: 0, meta: { error: err instanceof Error ? err.message : 'rpc_error' } }
  }
}

async function readSolanaBalance(
  solanaAddress: string | null,
): Promise<{ balance: number; meta: Record<string, unknown> }> {
  if (!solanaAddress) {
    return { balance: 0, meta: { error: 'wallet_not_configured' } }
  }

  try {
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
    const mintAddress = SOLANA_CLUSTER === 'mainnet-beta'
      ? SOLANA_USDC_MINT_MAINNET
      : SOLANA_USDC_MINT_DEVNET

    const owner = new PublicKey(solanaAddress)
    const mint = new PublicKey(mintAddress)
    const ata = getAssociatedTokenAddressSync(mint, owner)

    const account = await getAccount(connection, ata)
    const balance = Number(account.amount) / 10 ** SOLANA_USDC_DECIMALS

    return { balance, meta: { ata: ata.toBase58() } }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'rpc_error'
    const isAccountNotFound = message.includes('could not find account')
      || message.includes('TokenAccountNotFoundError')
    return {
      balance: 0,
      meta: { error: isAccountNotFound ? 'ata_not_found' : message },
    }
  }
}
