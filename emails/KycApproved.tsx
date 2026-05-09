import * as React from 'react'
import { EmailLayout, H1, P, PrimaryButton, Card, KeyValue } from './_layout'

interface KycApprovedEmailProps {
  firstName?: string | null
  companyName: string
  portalUrl: string
}

export default function KycApprovedEmail({
  firstName,
  companyName,
  portalUrl,
}: KycApprovedEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,'

  return (
    <EmailLayout preview={`You're verified. ${companyName} can now pay you on Remlo.`}>
      <H1>You&rsquo;re verified</H1>
      <P>{greeting}</P>
      <P>
        Your identity check came back clean. {companyName} can now send your salary directly
        to your wallet — and any future paychecks land automatically without another step.
      </P>
      <PrimaryButton href={portalUrl}>Open your portal</PrimaryButton>
      <Card>
        <KeyValue label="What&rsquo;s next" value="Wait for your first payroll run, or set up your bank for off-ramp." />
      </Card>
    </EmailLayout>
  )
}

KycApprovedEmail.PreviewProps = {
  firstName: 'Tomi',
  companyName: 'Acme Co.',
  portalUrl: 'https://remlo.xyz/portal',
} satisfies KycApprovedEmailProps
