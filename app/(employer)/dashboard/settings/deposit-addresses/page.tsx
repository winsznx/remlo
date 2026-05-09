'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Users,
  Wallet,
} from 'lucide-react'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { useTeam } from '@/lib/hooks/useDashboard'
import { usePrivyAuthedFetch, usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { deriveEmployeeDepositAddress } from '@/lib/tempo/virtual-addresses'

/**
 * /dashboard/settings/deposit-addresses
 *
 * Employer-facing registration of a TIP-1022 virtual-address master, plus
 * a per-employee preview of the deposit addresses that become available
 * once registration confirms on-chain.
 *
 * Mining the salt is a server-side proof-of-work step (~2^32 keccak
 * iterations expected). The /api/employers/.../virtual-master POST runs
 * the loop, broadcasts registerVirtualMaster, and caches the result on
 * the employer row.
 */

interface VirtualMasterStatus {
  registered: boolean
  masterId: string | null
  masterAddress: string | null
  txHash: string | null
  explorerUrl: string | null
  registeredAt: string | null
}

export default function DepositAddressesPage(): React.ReactElement {
  const { data: employer } = useEmployer()
  const fetchJson = usePrivyAuthedJson()
  const authedFetch = usePrivyAuthedFetch()
  const queryClient = useQueryClient()

  const status = useQuery<VirtualMasterStatus>({
    queryKey: ['virtual-master', employer?.id],
    queryFn: () => fetchJson(`/api/employers/${employer!.id}/virtual-master`),
    enabled: Boolean(employer?.id),
  })

  const team = useTeam(employer?.id)

  const register = useMutation({
    mutationFn: async () => {
      const res = await authedFetch(`/api/employers/${employer!.id}/virtual-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error ?? 'Registration failed')
      }
      return res.json() as Promise<{ masterId: string; txHash: string }>
    },
    onSuccess: () => {
      toast.success('Master registered. Per-employee deposit addresses are now derivable.')
      void queryClient.invalidateQueries({ queryKey: ['virtual-master', employer?.id] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Registration failed'),
  })

  const masterId = status.data?.masterId ?? null
  const employees = team.data?.employees ?? []

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </Link>

      <SectionHeader
        title="Per-employee deposit addresses"
        description="TIP-1022 virtual addresses route inbound TIP-20 stablecoin deposits to your treasury, with the employee tagged in the on-chain event log. One on-chain registration unlocks trillions of derivable addresses."
      />

      <ExplainerCard />

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Registration status
            </p>
            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
              {status.isLoading
                ? 'Loading…'
                : status.data?.registered
                  ? 'Master registered — addresses are live'
                  : 'Not registered yet'}
            </p>
            {status.data?.registered && status.data.masterId && (
              <div className="mt-2 grid gap-1 text-xs text-[var(--text-muted)]">
                <span>
                  Master ID: <span className="font-mono text-[var(--text-secondary)]">{status.data.masterId}</span>
                </span>
                {status.data.masterAddress && (
                  <span>
                    Master wallet:{' '}
                    <span className="font-mono text-[var(--text-secondary)]">{status.data.masterAddress}</span>
                  </span>
                )}
                {status.data.explorerUrl && (
                  <a
                    href={status.data.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                  >
                    Registration tx
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="shrink-0">
            {!status.isLoading && !status.data?.registered && (
              <Button
                onClick={() => register.mutate()}
                disabled={register.isPending}
                className="gap-2"
              >
                {register.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wallet className="h-3.5 w-3.5" />
                )}
                Register master
              </Button>
            )}
            {status.data?.registered && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--status-success)]/30 bg-[var(--status-success)]/10 px-2 py-1 text-xs text-[var(--status-success)]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Live
              </span>
            )}
          </div>
        </div>
        {register.isPending && (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Mining a valid salt and broadcasting on-chain. ~2^32 iterations of keccak — usually 30–90 seconds.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <header className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Per-employee addresses
            </h2>
          </div>
          {status.data?.registered && employees.length > 0 && (
            <span className="text-xs text-[var(--text-muted)]">
              {employees.length} {employees.length === 1 ? 'employee' : 'employees'}
            </span>
          )}
        </header>

        {!masterId ? (
          <div className="px-5 py-12 text-center text-xs text-[var(--text-muted)]">
            Register a master above to derive per-employee deposit addresses.
          </div>
        ) : employees.length === 0 ? (
          <div className="px-5 py-12 text-center text-xs text-[var(--text-muted)]">
            No employees on the roster yet.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-default)]">
            {employees.slice(0, 50).map((emp) => (
              <EmployeeAddressRow
                key={emp.id}
                employerId={employer!.id}
                masterId={masterId}
                employeeId={emp.id}
                name={[emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email}
                email={emp.email}
              />
            ))}
            {employees.length > 50 && (
              <li className="px-5 py-3 text-center text-xs text-[var(--text-muted)]">
                Showing first 50 of {employees.length}. The rest derive identically — same masterId, different userTag.
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  )
}

function ExplainerCard() {
  return (
    <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-5">
      <div className="flex items-start gap-3">
        <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />
        <div className="text-sm leading-6 text-[var(--text-secondary)]">
          <p className="font-medium text-[var(--text-primary)]">How the addresses work</p>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>Tempo's Address Registry assigns you a 4-byte master ID after one on-chain registration.</li>
            <li>Each employee gets a deterministic 6-byte tag derived from their employee ID — no on-chain action needed per employee.</li>
            <li>The full 20-byte address routes inbound TIP-20 transfers to your treasury wallet, with the employee tagged in the event log.</li>
            <li>Remlo's indexer picks up these inflows and surfaces them on the employee's activity feed.</li>
          </ol>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Only TIP-20 stablecoins resolve correctly. Anything else (NFTs, LP positions) sent to a virtual address is unrecoverable — surface this warning whenever you publish a deposit address externally.
          </p>
        </div>
      </div>
    </div>
  )
}

interface EmployeeRowProps {
  employerId: string
  masterId: string
  employeeId: string
  name: string
  email: string
}

function EmployeeAddressRow({ employerId, masterId, employeeId, name, email }: EmployeeRowProps) {
  const address = React.useMemo(() => {
    try {
      return deriveEmployeeDepositAddress({
        masterId: masterId as `0x${string}`,
        employerId,
        employeeId,
      })
    } catch {
      return null
    }
  }, [employerId, masterId, employeeId])

  async function copy() {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      toast.success('Address copied')
    } catch {
      toast.error('Could not copy')
    }
  }

  return (
    <li className="px-5 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">{name}</p>
          <p className="text-xs text-[var(--text-muted)]">{email}</p>
        </div>
        <div className="flex items-center gap-2">
          {address ? (
            <>
              <code className="text-xs text-[var(--text-secondary)] font-mono break-all">
                {address.slice(0, 10)}…{address.slice(-8)}
              </code>
              <Button variant="outline" size="sm" onClick={() => void copy()} className="gap-1.5">
                <Copy className="h-3 w-3" />
                Copy
              </Button>
            </>
          ) : (
            <span className="text-xs text-[var(--status-error)] inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Derivation failed
            </span>
          )}
        </div>
      </div>
    </li>
  )
}
