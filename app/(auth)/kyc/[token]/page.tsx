import Link from 'next/link'
import { AlertCircle, ArrowRight, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react'
import { RemloLogo } from '@/components/brand/RemloLogo'
import { Button } from '@/components/ui/button'
import { createServerClient } from '@/lib/supabase-server'
import { ensureEmployeeKycLink } from '@/lib/employee-onboarding'

type PageProps = {
  params: Promise<{ token: string }>
}

async function getKycState(token: string) {
  const supabase = createServerClient()
  const { data: employee } = await supabase
    .from('employees')
    .select('id, employer_id, email, first_name, last_name, bridge_customer_id, kyc_status, kyc_verified_at')
    .eq('id', token)
    .single()

  if (!employee) {
    return { state: 'error' as const, title: 'Invalid verification link', description: 'This KYC link is not valid anymore. Ask your employer to generate a fresh onboarding link.' }
  }

  const { data: employer } = await supabase
    .from('employers')
    .select('company_name')
    .eq('id', employee.employer_id)
    .maybeSingle()

  const companyName = employer?.company_name
  const displayName = [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email

  if (employee.kyc_status === 'approved') {
    return {
      state: 'completed' as const,
      title: 'Identity verification complete',
      description: `${displayName} is already cleared for Remlo payroll.`,
      companyName,
    }
  }

  try {
    const link = await ensureEmployeeKycLink(employee)
    if (!link?.kycUrl) {
      return {
        state: 'error' as const,
        title: 'KYC is not available in this environment',
        description: 'Bridge is not configured for live KYC link generation here yet.',
        companyName,
      }
    }

    return {
      state: 'ready' as const,
      title: 'Complete your payroll verification',
      description: 'Finish Bridge identity checks to unlock wallet funding, card issuance, and bank off-ramp access.',
      companyName,
      kycUrl: link.kycUrl,
      displayName,
      verifiedAt: employee.kyc_verified_at,
    }
  } catch (error) {
    return {
      state: 'error' as const,
      title: 'Unable to start verification',
      description: error instanceof Error ? error.message : 'KYC link generation failed.',
      companyName,
    }
  }
}

function StateIcon({ state }: { state: 'ready' | 'completed' | 'error' }) {
  if (state === 'completed') {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)]">
        <CheckCircle2 className="h-7 w-7" />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-[var(--status-error)]">
        <AlertCircle className="h-7 w-7" />
      </div>
    )
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)]">
      <ShieldCheck className="h-7 w-7" />
    </div>
  )
}

export default async function KycVerificationPage({ params }: PageProps) {
  const { token } = await params
  const data = await getKycState(token)

  return (
    <div className="min-h-screen bg-[var(--bg-base)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xl shadow-black/10 sm:p-8">
          <RemloLogo
            className="mb-8"
            markClassName="h-7 w-7"
            labelClassName="text-[var(--text-primary)] text-base"
          />

          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-5">
              <StateIcon state={data.state} />
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  Employee verification
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {data.title}
                </h1>
                <p className="max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                  {data.description}
                </p>
              </div>

              {'companyName' in data && data.companyName ? (
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Employer</p>
                  <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{data.companyName}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-5 sm:p-6">
              {data.state === 'ready' ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">What happens here</p>
                    <ul className="mt-3 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                      <li>Bridge verifies identity and sanctions requirements for payroll delivery.</li>
                      <li>Approved employees can receive wallet funding, salary streams, bank off-ramp access, and card issuance.</li>
                      <li>Remlo writes the updated status back into your payroll profile after the Bridge flow completes.</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Employee</p>
                    <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{data.displayName}</p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild className="flex-1">
                      <Link href={data.kycUrl} target="_blank" rel="noreferrer">
                        Start Bridge verification
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <Link href="/login">
                        Go to Remlo
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}

              {data.state === 'completed' ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Status</p>
                    <p className="mt-1 text-sm font-medium text-[var(--accent)]">Approved for payroll access</p>
                  </div>
                  <Button asChild className="w-full">
                    <Link href="/login">
                      Continue to Remlo
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : null}

              {data.state === 'error' ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm leading-6 text-[var(--text-secondary)]">
                    If this came from your employer invite, ask them to refresh your onboarding link from the team directory.
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/contact">Contact support</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
