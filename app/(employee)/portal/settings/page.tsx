'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell, Building2, ChevronRight, CreditCard, Loader2, LogOut, Shield, User, Wallet } from 'lucide-react'
import { useLinkWithPasskey, usePrivy } from '@privy-io/react-auth'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useEmployee, useEmployerForEmployee } from '@/lib/hooks/useEmployee'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePrivyAuthedFetch } from '@/lib/hooks/usePrivyAuthedFetch'
import { cn } from '@/lib/utils'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors duration-200',
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-subtle)]">
          <Icon className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-3.5 last:border-0">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="max-w-[55%] truncate text-right text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

const SETTINGS_STORAGE_KEY = 'remlo-employee-settings'

type NotificationPrefs = {
  paymentReceived: boolean
  cardUsed: boolean
  weeklySummary: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  paymentReceived: true,
  cardUsed: true,
  weeklySummary: false,
}

export default function SettingsPage() {
  const authedFetch = usePrivyAuthedFetch()
  const queryClient = useQueryClient()
  const { user, logout } = usePrivy()
  const { linkWithPasskey } = useLinkWithPasskey()
  const { data: employee, isLoading } = useEmployee()
  const { data: employer } = useEmployerForEmployee(employee?.employer_id)
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(DEFAULT_PREFS)
  const [profile, setProfile] = React.useState({ firstName: '', lastName: '', countryCode: '' })
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [linkingPasskey, setLinkingPasskey] = React.useState(false)

  React.useEffect(() => {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as NotificationPrefs
      setPrefs(parsed)
    } catch {
      // Ignore malformed local storage and keep defaults.
    }
  }, [])

  React.useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  React.useEffect(() => {
    setProfile({
      firstName: employee?.first_name ?? '',
      lastName: employee?.last_name ?? '',
      countryCode: employee?.country_code ?? '',
    })
  }, [employee?.country_code, employee?.first_name, employee?.last_name])

  async function handleSaveProfile() {
    if (!employee?.id) return

    setSavingProfile(true)
    try {
      const response = await authedFetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      const body = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to update profile')
      }

      toast.success('Profile updated.')
      await queryClient.invalidateQueries({ queryKey: ['employee', user?.id] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleLinkPasskey() {
    setLinkingPasskey(true)
    try {
      await linkWithPasskey()
      toast.success('Passkey linked.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to link passkey.')
    } finally {
      setLinkingPasskey(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[640px] space-y-4 px-4 pb-24 pt-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
        ))}
      </div>
    )
  }

  const hasPasskey = Boolean(user?.linkedAccounts?.some((account) => account.type === 'passkey'))

  return (
    <div className="mx-auto max-w-[640px] space-y-4 px-4 pb-24 pt-6">
      <Section icon={User} title="Profile">
        <div className="grid gap-4 border-b border-[var(--border-default)] px-5 py-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm text-[var(--text-muted)]">First name</p>
            <Input
              value={profile.firstName}
              onChange={(event) => setProfile((current) => ({ ...current, firstName: event.target.value }))}
              placeholder="First name"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-[var(--text-muted)]">Last name</p>
            <Input
              value={profile.lastName}
              onChange={(event) => setProfile((current) => ({ ...current, lastName: event.target.value }))}
              placeholder="Last name"
            />
          </div>
        </div>
        <ReadOnlyField label="Email" value={employee?.email ?? user?.email?.address ?? 'Not set'} />
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-3.5">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Country code</p>
            <Input
              value={profile.countryCode}
              onChange={(event) => setProfile((current) => ({ ...current, countryCode: event.target.value.toUpperCase() }))}
              placeholder="US"
              className="mt-2 w-24"
              maxLength={2}
            />
          </div>
          <Button onClick={() => void handleSaveProfile()} disabled={savingProfile}>
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save profile
          </Button>
        </div>
        <ReadOnlyField label="Company" value={employer?.company_name ?? 'Not set'} />
        <ReadOnlyField label="Role" value={employee?.job_title ?? 'Not set'} />
      </Section>

      <Section icon={Building2} title="Bank Account">
        <div className="px-5 py-4 text-sm leading-6 text-[var(--text-secondary)]">
          {employee?.bridge_bank_account_id
            ? 'A bank account is linked to your employee profile and ready for off-ramp transfers.'
            : 'No bank account is linked yet. Once your employer and Bridge setup are ready, use the off-ramp page to move funds to your bank.'}
        </div>
        <div className="border-t border-[var(--border-default)] px-5 py-4">
          <Button asChild className="w-full">
            <Link href="/portal/settings/offramp">
              <Wallet className="h-4 w-4" />
              Open Off-ramp Settings
            </Link>
          </Button>
        </div>
      </Section>

      <Section icon={Bell} title="Notifications">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-3.5">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Payment received</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Stored on this device for your employee portal.</p>
          </div>
          <Toggle checked={prefs.paymentReceived} onChange={(value) => setPrefs((current) => ({ ...current, paymentReceived: value }))} />
        </div>
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-3.5">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Card activity</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Use this toggle to keep transaction nudges enabled locally.</p>
          </div>
          <Toggle checked={prefs.cardUsed} onChange={(value) => setPrefs((current) => ({ ...current, cardUsed: value }))} />
        </div>
        <div className="flex items-center justify-between px-5 py-3.5">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Weekly summary</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">A lightweight preference for this browser session and future visits.</p>
          </div>
          <Toggle checked={prefs.weeklySummary} onChange={(value) => setPrefs((current) => ({ ...current, weeklySummary: value }))} />
        </div>
      </Section>

      <Section icon={Shield} title="Security">
        <ReadOnlyField
          label="Sign-in method"
          value={user?.email?.address ? `Email • ${user.email.address}` : 'Privy linked account'}
        />
        <ReadOnlyField label="Passkey" value={hasPasskey ? 'Linked in Privy' : 'No passkey linked'} />
        <div className="flex items-center justify-between border-t border-[var(--border-default)] px-5 py-3.5">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Passkey protection</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Add a device-bound passkey for faster and stronger sign-in on this account.
            </p>
          </div>
          <Button variant="outline" onClick={() => void handleLinkPasskey()} disabled={hasPasskey || linkingPasskey}>
            {linkingPasskey ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {hasPasskey ? 'Passkey linked' : 'Link passkey'}
          </Button>
        </div>

        <div className="border-t border-[var(--border-default)] px-5 py-3.5">
          <p className="text-sm font-medium text-[var(--text-primary)]">Current session</p>
          <p className="mt-1 text-xs leading-6 text-[var(--text-muted)]">
            This browser session is managed by Privy. Use sign out below if you are on a shared device or need to end the active session immediately.
          </p>
        </div>

        <Link
          href="/portal/card/activate"
          className="flex w-full items-center justify-between border-t border-[var(--border-default)] px-5 py-3.5 transition-colors hover:bg-[var(--bg-subtle)]"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-primary)]">Card Activation</span>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
        </Link>

        <div className="border-t border-[var(--border-default)] px-5 py-4">
          <button
            onClick={() => void logout()}
            className="flex items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--status-error)]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </Section>
    </div>
  )
}
