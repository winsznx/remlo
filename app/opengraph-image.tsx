import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Remlo — Borderless enterprise payroll on Tempo L1'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

function RemloPreviewImage() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background: '#08101D',
        color: 'white',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 18% 22%, rgba(52,211,153,0.22) 0%, rgba(52,211,153,0) 34%), radial-gradient(circle at 82% 18%, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0) 30%), linear-gradient(180deg, #0B1220 0%, #08101D 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          top: 54,
          bottom: 54,
          borderRadius: 32,
          border: '1px solid rgba(148,163,184,0.14)',
          background: 'rgba(9,16,30,0.72)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          padding: '72px 84px',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 18,
              background: '#0B1220',
              border: '1px solid rgba(148,163,184,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 28,
                height: 28,
                right: 4,
                top: 3,
                borderRadius: 999,
                background: 'rgba(52,211,153,0.18)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: 24,
                height: 24,
                left: 5,
                bottom: 5,
                borderRadius: 999,
                background: 'rgba(5,150,105,0.20)',
              }}
            />
            <div
              style={{
                display: 'flex',
                fontSize: 34,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                color: '#FFFFFF',
              }}
            >
              R
            </div>
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
                boxShadow: '0 0 18px rgba(52,211,153,0.55)',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 820 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              textTransform: 'uppercase',
              letterSpacing: '0.24em',
              color: '#34D399',
            }}
          >
            Payroll for the onchain era
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-0.05em',
              color: '#F8FAFC',
            }}
          >
            Pay anyone,&nbsp;
            <span style={{ color: '#34D399' }}>anywhere</span>
            , in seconds.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              lineHeight: 1.45,
              color: '#94A3B8',
              maxWidth: 780,
            }}
          >
            Borderless enterprise payroll on Tempo L1. AI agents execute compliant batch
            payments via MPP, employees receive in 0.4s, and spend via Visa.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18 }}>
          {[
            { value: '0.4s', label: 'settlement time' },
            { value: '$0.01', label: 'per transaction' },
            { value: '47+', label: 'countries supported' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                minWidth: 180,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '18px 20px',
                borderRadius: 20,
                background: 'rgba(15,23,42,0.70)',
                border: '1px solid rgba(148,163,184,0.12)',
              }}
            >
              <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, letterSpacing: '-0.04em' }}>
                {stat.value}
              </div>
              <div style={{ display: 'flex', fontSize: 16, color: '#94A3B8' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OpenGraphImage() {
  return new ImageResponse(<RemloPreviewImage />, size)
}
