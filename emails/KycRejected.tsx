import * as React from 'react'
import { EmailLayout, H1, P, PrimaryButton, Card, KeyValue } from './_layout'

interface KycRejectedEmailProps {
  firstName?: string | null
  companyName: string
  reason: string | null
  retryUrl: string
}

export default function KycRejectedEmail({
  firstName,
  companyName,
  reason,
  retryUrl,
}: KycRejectedEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,'

  return (
    <EmailLayout preview="Your identity check needs another look.">
      <H1>Your verification didn&rsquo;t go through</H1>
      <P>{greeting}</P>
      <P>
        {companyName}&rsquo;s identity provider couldn&rsquo;t complete your check. This usually
        means a document was unclear or didn&rsquo;t match the details on file. You can retry
        with a fresh photo and selfie — most retries clear on the second pass.
      </P>
      <PrimaryButton href={retryUrl}>Retry verification</PrimaryButton>
      <Card>
        <KeyValue label="Reason" value={reason ?? 'Not provided'} />
        <KeyValue label="What helps" value="Better lighting, full ID in frame, no glare." />
      </Card>
      <P small muted>
        If the same issue keeps happening, reply to this email and a human will look into it.
      </P>
    </EmailLayout>
  )
}

KycRejectedEmail.PreviewProps = {
  firstName: 'Tomi',
  companyName: 'Acme Co.',
  reason: 'Document image was blurry or partially obscured.',
  retryUrl: 'https://remlo.xyz/kyc/preview-token',
} satisfies KycRejectedEmailProps
