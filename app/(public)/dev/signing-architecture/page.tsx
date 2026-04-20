import * as React from 'react'
import type { Metadata } from 'next'
import { Shield, Lock, FileCheck } from 'lucide-react'
import { LitSignDemo } from './LitSignDemo'

export const metadata: Metadata = {
  title: 'Non-Custodial Payroll Signing | Remlo × Lit Protocol',
  description:
    'How Remlo uses Lit Protocol TEE-backed PKP wallets to sign payroll transactions — without a hot wallet, without a key custodian.',
}

const PKP_WALLET = '0x3324a8B644a78ed5c9EEBbD0e661b67FE417342F'
const ACTION_CID = 'QmSAfc7Hh6MPhe3T3fTBVEvryYR6ChaeHf2icins23aET7'

const WHY_CARDS = [
  {
    icon: Shield,
    title: 'Employer-delegated, non-custodial authorization',
    body: 'Remlo runs payroll on behalf of employers. With Lit, the employer\'s PKP wallet is the signing identity. Remlo holds a delegatee key that can trigger signing but cannot extract the private key or sign anything outside the authorized policy. The employer retains cryptographic ownership at all times.',
  },
  {
    icon: Lock,
    title: 'Spend policies enforced inside the TEE',
    body: 'The signing Lit Action restricts the PKP to only sign transactions targeting PayrollBatcher and YieldRouter on Tempo L1. This is not an application-layer promise — it\'s code running inside a Verified TEE that the enclave executes before returning a signature. The policy cannot be bypassed by Remlo\'s server.',
  },
  {
    icon: FileCheck,
    title: 'Verifiable on-chain audit trail',
    body: 'Every payroll disbursement produces a Tempo L1 transaction with a from address cryptographically linked to the Lit-managed PKP. An auditor can verify — without trusting Remlo\'s servers — that the signing key was controlled by the Lit TEE network, not a hot wallet on Remlo\'s infrastructure.',
  },
]

export default function LitPage() {
  return (
    <div className="space-y-20">

      {/* Hero */}
      <div className="space-y-6 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-xs font-medium text-[var(--accent)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          Lit Protocol · Chipotle TEE Network
        </div>
        <h1 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
          Non-custodial payroll signing via Lit Protocol TEE
        </h1>
        <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
          Remlo&apos;s autonomous payroll agent signs Tempo L1 transactions using a PKP wallet
          whose private key is generated and held inside Lit&apos;s distributed TEE network.
          The key never exists in one place. No single node can sign independently.
          Remlo&apos;s server never holds the key.
        </p>
      </div>

      {/* Why section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Why Remlo uses Lit</h2>
        <p className="text-[var(--text-secondary)] max-w-2xl">
          Payroll is the highest-stakes transaction an employer can authorize. Three properties
          of Lit Protocol are specific to this context and cannot be replicated with a hot wallet
          or a traditional HSM.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {WHY_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-3"
            >
              <div className="h-9 w-9 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                <card.icon className="h-4.5 w-4.5 text-[var(--accent)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{card.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">How it works</h2>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-center">
            {([
              { label: 'Remlo Agent',     sub: 'unsigned EIP-1559 tx',       dim: false },
              { label: 'Lit Chipotle API', sub: 'POST /lit_action',           dim: false },
              { label: 'Lit Action (TEE)', sub: 'getPrivateKey({ pkpId })',   dim: false },
              { label: 'PKP key store',   sub: 'private key — TEE only',     dim: true  },
              { label: 'Tempo L1',        sub: 'signed tx broadcast',         dim: false },
            ] as const).map((node, i, arr) => (
              <React.Fragment key={node.label}>
                <div className="flex flex-col items-center gap-1 min-w-0">
                  <div className={`rounded-xl border px-4 py-2.5 font-medium ${
                    node.dim
                      ? 'border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                      : 'border-[var(--accent)]/30 bg-[var(--accent)]/5 text-[var(--text-primary)]'
                  }`}>
                    {node.label}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] max-w-[120px]">{node.sub}</span>
                </div>
                {i < arr.length - 1 && (
                  <span className="text-[var(--text-muted)] text-lg hidden md:block">→</span>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--border-default)] grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">PKP Wallet</p>
              <p className="font-mono text-xs text-[var(--text-primary)] break-all">{PKP_WALLET}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Signing Action CID</p>
              <p className="font-mono text-xs text-[var(--text-primary)] break-all">{ACTION_CID}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Immutable — content-addressed on IPFS</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Network</p>
              <p className="text-xs text-[var(--text-primary)]">Lit Chipotle (api.dev.litprotocol.com)</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Persistent dev network · suitable for demos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live demo */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Live demo</h2>
          <p className="mt-2 text-[var(--text-secondary)] max-w-2xl">
            Click the button below to sign a real 0-value transaction via the Lit TEE network and
            broadcast it to Tempo Moderato. The proof shows the recovered signer address matches
            the PKP wallet — confirming the key lived inside the Lit enclave.
          </p>
        </div>
        <div className="max-w-xl">
          <LitSignDemo />
        </div>
      </div>

      {/* Footer note */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-6 text-sm text-[var(--text-secondary)] space-y-2">
        <p className="font-medium text-[var(--text-primary)]">Security model</p>
        <ul className="space-y-1.5 list-disc list-inside marker:text-[var(--text-muted)]">
          <li>The <code className="font-mono text-xs">LIT_API_KEY</code> (admin) is server-only — it can manage groups and mint PKPs</li>
          <li>The <code className="font-mono text-xs">LIT_USAGE_KEY</code> is execute-scoped only — it cannot rotate keys or manage groups</li>
          <li>Changing the signing action code produces a new IPFS CID that must be re-authorized before it can execute</li>
          <li>For production, the action code adds a contract whitelist: only PayrollBatcher and YieldRouter can be the call target</li>
        </ul>
      </div>

    </div>
  )
}
