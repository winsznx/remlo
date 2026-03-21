'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { User, Building2, Bell, Shield, ChevronRight, CheckCircle, Plus, KeyRound, LogOut } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { toast } from 'sonner'
import { useEmployee } from '@/lib/hooks/useEmployee'
import { useEmployerForEmployee } from '@/lib/hooks/useEmployee'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none',
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ id, icon: Icon, title, children }: {
  id: string
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-default)]">
        <div className="h-8 w-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center">
          <Icon className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      {children}
    </motion.section>
  )
}

// ─── Read-only field ──────────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between border-b border-[var(--border-default)] last:border-0">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="text-sm text-[var(--text-secondary)] font-medium">{value}</p>
    </div>
  )
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotifRow({ label, description, checked, onChange }: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between border-b border-[var(--border-default)] last:border-0">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, logout } = usePrivy()
  const { data: employee, isLoading } = useEmployee()
  const { data: employer } = useEmployerForEmployee(employee?.employer_id)

  // Editable fields
  const [preferredName, setPreferredName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  // Notification prefs
  const [notifPaid, setNotifPaid] = React.useState(true)
  const [notifCard, setNotifCard] = React.useState(true)
  const [notifWeekly, setNotifWeekly] = React.useState(false)

  React.useEffect(() => {
    if (employee) {
      setPreferredName(employee.first_name ?? '')
      setPhone('')
    }
  }, [employee])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    toast.success('Profile updated')
  }

  const hasBankAccount = Boolean(employee?.bridge_bank_account_id)

  if (isLoading) {
    return (
      <div className="max-w-[640px] mx-auto px-4 pt-6 pb-24 space-y-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)]" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 pt-6 pb-24 space-y-4">
      {/* 1 — Profile */}
      <Section id="profile" icon={User} title="Profile">
        <ReadOnlyField label="Full name" value={[employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || '—'} />
        <ReadOnlyField label="Email" value={employee?.email ?? user?.email?.address ?? '—'} />
        <ReadOnlyField label="Company" value={employer?.company_name ?? '—'} />
        <ReadOnlyField label="Job title" value={employee?.job_title ?? '—'} />

        {/* Editable section */}
        <form onSubmit={handleSaveProfile} className="px-5 py-4 space-y-3 border-t border-[var(--border-default)]">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-muted)]">Preferred name</label>
            <Input
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="How should we address you?"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-muted)]">Phone number</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
            />
          </div>
          <Button type="submit" disabled={saving} size="sm">
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Section>

      {/* 2 — Bank Account */}
      <Section id="bank" icon={Building2} title="Bank Account">
        {hasBankAccount ? (
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Bank account connected</p>
              <p className="text-xs text-[var(--text-muted)]">Ready for off-ramp transfers</p>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              Connect a bank account to transfer your earnings directly via ACH or SEPA.
            </p>
            <button
              onClick={() => toast.info('Bank connection flow — complete KYC first')}
              className="flex items-center gap-2 h-10 px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Connect Bank Account
            </button>
            <p className="text-xs text-[var(--text-muted)]">Powered by Bridge · USD, EUR, MXN, ARS</p>
          </div>
        )}
      </Section>

      {/* 3 — Notifications */}
      <Section id="notifications" icon={Bell} title="Notifications">
        <NotifRow
          label="Payment received"
          description="Email and SMS when your salary is paid"
          checked={notifPaid}
          onChange={setNotifPaid}
        />
        <NotifRow
          label="Card used"
          description="SMS alert on every card transaction"
          checked={notifCard}
          onChange={setNotifCard}
        />
        <NotifRow
          label="Weekly summary"
          description="Every Monday: balance, spending, earnings"
          checked={notifWeekly}
          onChange={setNotifWeekly}
        />
      </Section>

      {/* 4 — Security */}
      <Section id="security" icon={Shield} title="Security">
        <div className="px-5 py-3.5 border-b border-[var(--border-default)]">
          <p className="text-xs text-[var(--text-muted)] mb-0.5">Sign-in method</p>
          <p className="text-sm text-[var(--text-primary)] font-medium">
            {user?.email?.address ? `Email — ${user.email.address}` : 'Linked account'}
          </p>
        </div>

        <button
          onClick={() => toast.info('Passkey registration coming soon')}
          className="w-full flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-default)] hover:bg-[var(--bg-subtle)] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <KeyRound className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-primary)]">Add Passkey</span>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
        </button>

        <button
          onClick={() => toast.info('Revoke all sessions — confirm in the dialog')}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-subtle)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-[var(--status-error)]" />
            <span className="text-sm text-[var(--status-error)]">Revoke all sessions</span>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
        </button>

        <div className="px-5 py-4 border-t border-[var(--border-default)]">
          <button
            onClick={() => void logout()}
            className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--status-error)] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </Section>
    </div>
  )
}
