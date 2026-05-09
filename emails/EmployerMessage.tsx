import * as React from 'react'
import { EmailLayout, H1, P, PrimaryButton } from './_layout'

interface EmployerMessageEmailProps {
  firstName?: string | null
  companyName: string
  title: string
  body: string
  linkUrl?: string | null
  linkLabel?: string | null
}

export default function EmployerMessageEmail({
  firstName,
  companyName,
  title,
  body,
  linkUrl,
  linkLabel,
}: EmployerMessageEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,'

  return (
    <EmailLayout preview={`${companyName}: ${title}`}>
      <H1>{title}</H1>
      <P>{greeting}</P>
      <P>{body}</P>
      {linkUrl && (
        <PrimaryButton href={linkUrl}>{linkLabel ?? 'Open'}</PrimaryButton>
      )}
      <P small muted>
        Sent by {companyName} via Remlo. Reply to your employer directly with any questions.
      </P>
    </EmailLayout>
  )
}

EmployerMessageEmail.PreviewProps = {
  firstName: 'Tomi',
  companyName: 'Acme Co.',
  title: 'New benefits plan kicks in next pay period',
  body: 'Heads up — starting with the May payroll run, we are rolling out a new benefits plan. No action needed on your side, payslips will reflect the change automatically.',
  linkUrl: 'https://example.com/benefits',
  linkLabel: 'Read the details',
} satisfies EmployerMessageEmailProps
