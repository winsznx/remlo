'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Building2, Globe, DollarSign, ShieldCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AddressDisplay } from '@/components/wallet/AddressDisplay'
import { GasSponsored } from '@/components/wallet/GasSponsored'
import { TxStatus } from '@/components/wallet/TxStatus'
import { ComplianceBadge } from '@/components/employee/ComplianceBadge'
import { VisaCardDisplay } from '@/components/card/VisaCardDisplay'
import { MemoDecoder } from '@/components/payroll/MemoDecoder'

// ─── Mock data (replaced in T35) ─────────────────────────────────────────────

const MOCK_EMPLOYEE = {
  id: 'emp-1',
  first_name: 'Sofia',
  last_name: 'Mendez',
  email: 'sofia.mendez@acme.com',
  job_title: 'Senior Engineer',
  department: 'Engineering',
  country_code: 'MX',
  salary_amount: 95000,
  salary_currency: 'USD',
  pay_frequency: 'monthly',
  wallet_address: '0x71a2BA383d2C8ec15310705A13693F054271531f',
  kyc_status: 'approved' as const,
  kyc_verified_at: '2026-01-10T12:00:00Z',
  bridge_card_id: 'card-1',
  bridge_bank_account_id: 'bank-1',
}

const MOCK_PAYMENTS = [
  {
    id: 'pay-1',
    run_id: 'run-1',
    amount: 7916.67,
    status: 'confirmed' as const,
    tx_hash: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
    memo: '0x706169630000000000000001000000020003202603010000001200000000abcd1234' as `0x${string}`,
    created_at: '2026-03-15T10:00:00Z',
  },
  {
    id: 'pay-2',
    run_id: 'run-2',
    amount: 7916.67,
    status: 'confirmed' as const,
    tx_hash: '0xdef456abc123def456abc123def456abc123def456abc123def456abc123def4',
    memo: '0x706169630000000000000001000000020003202602010000001200000000abcd1234' as `0x${string}`,
    created_at: '2026-02-15T09:45:00Z',
  },
  {
    id: 'pay-3',
    run_id: 'run-3',
    amount: 7583.33,
    status: 'pending' as const,
    tx_hash: null,
    memo: null,
    created_at: '2026-01-15T10:00:00Z',
  },
]

const MOCK_COMPLIANCE_LOG = [
  {
    id: 'ce-1',
    event_type: 'kyc_approved',
    result: 'CLEAR' as const,
    description: 'KYC verified by Bridge — all documents approved.',
    created_at: '2026-01-10T12:00:00Z',
  },
  {
    id: 'ce-2',
    event_type: 'mpp_check',
    result: 'CLEAR' as const,
    description: 'TIP-403 policy check passed.',
    created_at: '2026-03-15T09:55:00Z',
  },
  {
    id: 'ce-3',
    event_type: 'mpp_check',
    result: 'CLEAR' as const,
    description: 'TIP-403 policy check passed.',
    created_at: '2026-02-15T09:40:00Z',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function formatFrequency(freq: string): string {
  return { monthly: 'Monthly', biweekly: 'Bi-weekly', weekly: 'Weekly', stream: 'Streaming' }[freq] ?? freq
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ employee }: { employee: typeof MOCK_EMPLOYEE }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Wallet info */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Wallet & Identity</h3>
        <div className="space-y-3">
          {employee.wallet_address ? (
            <>
              <div className="space-y-1">
                <p className="text-xs text-[var(--text-muted)]">Wallet Address</p>
                <AddressDisplay address={employee.wallet_address} />
              </div>
              <GasSponsored />
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)] italic">No wallet connected — invite pending.</p>
          )}
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">Email</p>
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-primary)]">{employee.email}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">Department</p>
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-primary)]">{employee.department || '—'}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">Country</p>
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-primary)]">{employee.country_code || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Salary info */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Compensation</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">Annual Salary</p>
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span className="font-mono text-xl font-bold text-[var(--text-primary)]">
                {employee.salary_amount != null ? formatCurrency(employee.salary_amount, employee.salary_currency) : '—'}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">Pay Frequency</p>
            <span className="text-sm text-[var(--text-primary)]">{formatFrequency(employee.pay_frequency)}</span>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">Per-payment amount</p>
            <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
              {employee.salary_amount != null && employee.pay_frequency === 'monthly'
                ? formatCurrency(employee.salary_amount / 12, employee.salary_currency)
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Visa card */}
      {employee.bridge_card_id && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Visa Prepaid Card</h3>
          <VisaCardDisplay
            last4="4242"
            holderName={`${employee.first_name} ${employee.last_name}`}
            expiryMonth={12}
            expiryYear={28}
            status="active"
          />
        </div>
      )}

      {/* Bank account */}
      {employee.bridge_bank_account_id && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Bank Account</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Account type</span>
              <span className="text-[var(--text-primary)]">ACH Checking</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Status</span>
              <span className="text-[var(--status-success)] font-medium">Connected</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Payment History ─────────────────────────────────────────────────────

function PaymentHistoryTab() {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-default)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Payment History</h3>
      </div>
      <div className="divide-y divide-[var(--border-default)]">
        {MOCK_PAYMENTS.map((payment) => (
          <div key={payment.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {formatCurrency(payment.amount)}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{formatDate(payment.created_at)}</p>
              </div>
              <TxStatus
                status={payment.status === 'confirmed' ? 'confirmed' : payment.status === 'pending' ? 'pending' : 'failed'}
                txHash={payment.tx_hash ?? undefined}
              />
            </div>
            {payment.memo && (
              <div className="rounded-lg bg-[var(--bg-subtle)] p-3">
                <MemoDecoder memoHex={payment.memo} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Compliance ──────────────────────────────────────────────────────────

function ComplianceTab({ employee }: { employee: typeof MOCK_EMPLOYEE }) {
  const kycStatus = employee.kyc_status as 'approved' | 'pending' | 'rejected' | 'expired'

  return (
    <div className="space-y-4">
      {/* KYC + TIP-403 status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">KYC Status</h3>
          </div>
          <ComplianceBadge status={kycStatus} />
          {employee.kyc_verified_at && (
            <p className="text-xs text-[var(--text-muted)]">
              Verified {formatDate(employee.kyc_verified_at)} via Bridge
            </p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">TIP-403 Policy</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--accent-subtle)] text-[var(--accent)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            AUTHORIZED
          </span>
          <p className="text-xs text-[var(--text-muted)]">Policy ID: 1 · BLACKLIST type</p>
        </div>
      </div>

      {/* Audit log */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Compliance Audit Log</h3>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {MOCK_COMPLIANCE_LOG.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 px-5 py-4">
              <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${entry.result === 'CLEAR' ? 'bg-[var(--status-success)]' : 'bg-[var(--status-error)]'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--text-primary)]">{entry.description}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {entry.event_type} · {formatDate(entry.created_at)}
                </p>
              </div>
              <span className={`text-xs font-medium shrink-0 ${entry.result === 'CLEAR' ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
                {entry.result}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  // In T35 this will fetch by params.id
  const employee = MOCK_EMPLOYEE

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-sm font-bold text-[var(--accent)] shrink-0">
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                {employee.first_name} {employee.last_name}
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                {employee.job_title} · {employee.department}
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm">Edit</Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-[var(--bg-subtle)] p-1 rounded-lg">
          <TabsTrigger value="overview" className="rounded-md text-sm">Overview</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-md text-sm">Payment History</TabsTrigger>
          <TabsTrigger value="compliance" className="rounded-md text-sm">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab employee={employee} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <PaymentHistoryTab />
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <ComplianceTab employee={employee} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
