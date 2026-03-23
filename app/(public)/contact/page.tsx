import * as React from 'react'
import { Mail, MessageSquare } from 'lucide-react'

export const metadata = { title: 'Contact | Remlo' }

export default function ContactPage() {
  return (
    <div className="space-y-16">
      <div className="max-w-xl text-center mx-auto">
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Get in Touch</h1>
        <p className="text-lg text-[var(--text-secondary)]">We're here to help you scale your global payroll infrastructure.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <div className="p-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] mx-auto flex items-center justify-center">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Email Support</h2>
          <p className="text-sm text-[var(--text-secondary)]">For technical issues or account inquiries.</p>
          <p className="text-[var(--text-primary)] font-semibold">support@remlo.xyz</p>
        </div>

        <div className="p-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] mx-auto flex items-center justify-center">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Sales & Partnerships</h2>
          <p className="text-sm text-[var(--text-secondary)]">For demo requests and enterprise custom quotes.</p>
          <p className="text-[var(--text-primary)] font-semibold">hello@remlo.xyz</p>
        </div>
      </div>
    </div>
  )
}
