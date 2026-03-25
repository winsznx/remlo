'use client'

import * as React from 'react'
import { useWallets } from '@privy-io/react-auth'
import { useQueryClient } from '@tanstack/react-query'
import { createWalletClient, custom, parseUnits, formatUnits, encodeFunctionData } from 'viem'
import { Loader2, ArrowRight, CheckCircle2, AlertCircle, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { publicClient } from '@/lib/contracts'
import { tempoChain } from '@/lib/privy'
import { PATHUSD_ADDRESS, PAYROLL_TREASURY_ADDRESS, TEMPO_EXPLORER_URL } from '@/lib/constants'
import { PayrollTreasuryABI } from '@/lib/abis/PayrollTreasury'
import type { Database } from '@/lib/database.types'

type Employer = Database['public']['Tables']['employers']['Row']

const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

type DepositStatus = 'idle' | 'approving' | 'depositing' | 'success'

interface Props {
  employer: Employer
}

export function OnChainDepositWidget({ employer }: Props) {
  const { wallets } = useWallets()
  const queryClient = useQueryClient()

  const [amount, setAmount] = React.useState('')
  const [status, setStatus] = React.useState<DepositStatus>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [approveTx, setApproveTx] = React.useState<`0x${string}` | null>(null)
  const [depositTx, setDepositTx] = React.useState<`0x${string}` | null>(null)
  const [walletBalance, setWalletBalance] = React.useState<bigint | null>(null)

  const adminWallet = employer.employer_admin_wallet as `0x${string}` | null
  const privyWallet =
    wallets.find((w) => adminWallet && w.address.toLowerCase() === adminWallet.toLowerCase()) ??
    wallets.find((w) => w.walletClientType === 'privy')

  React.useEffect(() => {
    if (!privyWallet) return
    let cancelled = false
    publicClient
      .readContract({
        address: PATHUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [privyWallet.address as `0x${string}`],
      })
      .then((bal) => {
        if (!cancelled) setWalletBalance(bal as bigint)
      })
      .catch(() => { if (!cancelled) setWalletBalance(null) })
    return () => { cancelled = true }
  }, [privyWallet])

  async function handleDeposit() {
    if (!privyWallet || !amount || Number(amount) <= 0) return
    setError(null)
    setApproveTx(null)
    setDepositTx(null)

    const amountWei = parseUnits(amount, 6)

    try {
      const provider = await privyWallet.getEthereumProvider()
      const walletClient = createWalletClient({
        account: privyWallet.address as `0x${string}`,
        chain: tempoChain,
        transport: custom(provider),
      })

      setStatus('approving')
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [PAYROLL_TREASURY_ADDRESS, amountWei],
      })
      const approveHash = await walletClient.sendTransaction({
        to: PATHUSD_ADDRESS,
        data: approveData,
      })
      setApproveTx(approveHash)
      await publicClient.waitForTransactionReceipt({ hash: approveHash })

      setStatus('depositing')
      const depositData = encodeFunctionData({
        abi: PayrollTreasuryABI,
        functionName: 'deposit',
        args: [amountWei, '0x0000000000000000000000000000000000000000000000000000000000000000'],
      })
      const depositHash = await walletClient.sendTransaction({
        to: PAYROLL_TREASURY_ADDRESS,
        data: depositData,
      })
      setDepositTx(depositHash)
      await publicClient.waitForTransactionReceipt({ hash: depositHash })

      setStatus('success')
      void queryClient.invalidateQueries({ queryKey: ['treasury'] })
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : 'Transaction failed. Please try again.')
    }
  }

  const isLoading = status === 'approving' || status === 'depositing'
  const parsedAmount = Number(amount) || 0
  const walletBalanceUsd = walletBalance !== null ? Number(formatUnits(walletBalance, 6)) : null
  const hasInsufficientBalance =
    walletBalanceUsd !== null && parsedAmount > 0 && parsedAmount > walletBalanceUsd
  const canDeposit =
    !isLoading && status !== 'success' && parsedAmount > 0 && Boolean(privyWallet) && !hasInsufficientBalance

  if (status === 'success') {
    return (
      <div className="rounded-xl border border-[var(--status-success)] bg-[var(--bg-subtle)] p-5 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-[var(--status-success)] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">Deposit confirmed</p>
          <p className="text-xs text-[var(--text-muted)]">
            ${parsedAmount.toLocaleString()} pathUSD deposited. Your payroll balance will update shortly.
          </p>
          {depositTx && (
            <a
              href={`${TEMPO_EXPLORER_URL}/tx/${depositTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-[var(--accent)] hover:underline"
            >
              View on explorer ↗
            </a>
          )}
          <button
            onClick={() => {
              setStatus('idle')
              setAmount('')
              setApproveTx(null)
              setDepositTx(null)
            }}
            className="mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Deposit more →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {privyWallet ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-subtle)]">
          <Wallet className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
          <p className="flex-1 min-w-0 text-xs font-mono text-[var(--text-secondary)] truncate">
            {privyWallet.address}
          </p>
          {walletBalanceUsd !== null && (
            <span className="text-xs text-[var(--text-muted)] shrink-0">
              {walletBalanceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} pathUSD
            </span>
          )}
        </div>
      ) : (
        <div className="px-3 py-2 rounded-lg bg-[var(--bg-subtle)] text-xs text-[var(--text-muted)]">
          No embedded wallet found. Sign in with email or SMS to use on-chain deposit.
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-[var(--text-muted)]">Amount (USD)</label>
        <div
          className={cn(
            'flex items-center gap-2 h-10 px-3 rounded-lg border bg-[var(--bg-base)] transition-colors',
            'focus-within:border-[var(--accent)]',
            hasInsufficientBalance
              ? 'border-[var(--status-error)]'
              : 'border-[var(--border-default)]',
          )}
        >
          <span className="text-sm text-[var(--text-muted)]">$</span>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none min-w-0"
          />
          <span className="text-xs text-[var(--text-muted)] shrink-0">pathUSD</span>
        </div>
        {hasInsufficientBalance && (
          <p className="text-xs text-[var(--status-error)]">
            Insufficient balance ({walletBalanceUsd?.toFixed(2)} pathUSD available)
          </p>
        )}
      </div>

      {(status === 'approving' || status === 'depositing' || approveTx) && (
        <div className="space-y-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
          <DepositStep
            index={1}
            label="Approve pathUSD"
            sublabel="Allow treasury contract to spend your tokens"
            done={Boolean(approveTx)}
            active={status === 'approving'}
            txHash={approveTx}
          />
          <DepositStep
            index={2}
            label="Deposit to treasury"
            sublabel="Transfer funds to the on-chain treasury contract"
            done={Boolean(depositTx)}
            active={status === 'depositing'}
            txHash={depositTx}
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--status-error)] px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-[var(--status-error)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--status-error)]">{error}</p>
        </div>
      )}

      <button
        onClick={() => { void handleDeposit() }}
        disabled={!canDeposit}
        className={cn(
          'w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-colors',
          canDeposit
            ? 'bg-[var(--accent)] text-white hover:opacity-90'
            : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed',
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {status === 'approving' ? 'Approving…' : 'Depositing…'}
          </>
        ) : (
          <>
            Deposit to treasury
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  )
}

function DepositStep({
  index,
  label,
  sublabel,
  done,
  active,
  txHash,
}: {
  index: number
  label: string
  sublabel: string
  done: boolean
  active: boolean
  txHash: `0x${string}` | null
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          done
            ? 'bg-[var(--status-success)]'
            : active
            ? 'bg-[var(--accent)]'
            : 'bg-[var(--bg-base)] border border-[var(--border-default)]',
        )}
      >
        {done ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
        ) : active ? (
          <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
        ) : (
          <span className="text-[10px] font-medium text-[var(--text-muted)]">{index}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-xs font-medium',
            done || active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
          )}
        >
          {label}
        </p>
        <p className="text-[11px] text-[var(--text-muted)]">{sublabel}</p>
        {txHash && (
          <a
            href={`${TEMPO_EXPLORER_URL}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-[var(--accent)] hover:underline"
          >
            {txHash.slice(0, 10)}…{txHash.slice(-6)}
          </a>
        )}
      </div>
    </div>
  )
}
