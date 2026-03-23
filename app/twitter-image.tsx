import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Remlo — Borderless enterprise payroll on Tempo L1'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#08101D',
          color: 'white',
          fontFamily: 'Inter, Arial, sans-serif',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 20%, rgba(52,211,153,0.20) 0%, rgba(52,211,153,0) 34%), linear-gradient(180deg, #0B1220 0%, #08101D 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 44,
            borderRadius: 28,
            border: '1px solid rgba(148,163,184,0.14)',
            background: 'rgba(9,16,30,0.72)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '70px 84px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: '#0B1220',
                border: '1px solid rgba(148,163,184,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                fontWeight: 800,
              }}
            >
              R
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, letterSpacing: '-0.04em' }}>
                Remlo
              </div>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: '#34D399',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 860 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                color: '#34D399',
              }}
            >
              Borderless enterprise payroll
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                fontSize: 68,
                fontWeight: 700,
                lineHeight: 1.02,
                letterSpacing: '-0.05em',
              }}
            >
              AI payroll on Tempo with MPP, Bridge, and embedded wallets.
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                lineHeight: 1.4,
                color: '#94A3B8',
                maxWidth: 880,
              }}
            >
              Batch payroll, streaming salary, compliant transfers, and global employee spending
              in one operating surface.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 18 }}>
            {['TIP-20 memos', 'TIP-403 screening', 'MPP 402 payments'].map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  padding: '14px 18px',
                  borderRadius: 999,
                  background: 'rgba(15,23,42,0.72)',
                  border: '1px solid rgba(148,163,184,0.12)',
                  fontSize: 18,
                  color: '#E2E8F0',
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  )
}
