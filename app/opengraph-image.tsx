import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Remlo — Payroll for the AI era'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const LOGO_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDMyIDMyIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHg9IjEiIHk9IjEiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgcng9IjEwIiBmaWxsPSIjMEIxMjIwIi8+CiAgPHJlY3QgeD0iMS41IiB5PSIxLjUiIHdpZHRoPSIyOSIgaGVpZ2h0PSIyOSIgcng9IjkuNSIgc3Ryb2tlPSIjMUUyOTNCIi8+CiAgPGNpcmNsZSBjeD0iMjQuNSIgY3k9IjguNSIgcj0iNyIgZmlsbD0iIzM0RDM5OSIgZmlsbC1vcGFjaXR5PSIwLjE0Ii8+CiAgPGNpcmNsZSBjeD0iMTAiIGN5PSIyNC41IiByPSI2LjUiIGZpbGw9IiMwNTk2NjkiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CiAgPHBhdGggZD0iTTEwIDguNzVWMjMuMjUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIzLjI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8cGF0aCBkPSJNMTAgOC43NUgxNy4yNUMxOS41OTYyIDguNzUgMjEuNSAxMC42NTM4IDIxLjUgMTNDMjEuNSAxNS4zNDYyIDE5LjU5NjIgMTcuMjUgMTcuMjUgMTcuMjVIMTAiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIzLjI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KICA8cGF0aCBkPSJNMTYuMjUgMTcuMjVMMjIuMjUgMjMuMjUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIzLjI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KICA8cmVjdCB4PSIyMC4yNSIgeT0iOCIgd2lkdGg9IjQiIGhlaWdodD0iMS41IiByeD0iMC43NSIgZmlsbD0iIzM0RDM5OSIvPgogIDxyZWN0IHg9IjIxIiB5PSIxMC43NSIgd2lkdGg9IjMuMjUiIGhlaWdodD0iMS41IiByeD0iMC43NSIgZmlsbD0iIzM0RDM5OSIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPC9zdmc+Cg=='

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#05080F',
          overflow: 'hidden',
          fontFamily: 'Inter, Arial, sans-serif',
          color: 'white',
        }}
      >
        {/* Ambient glow behind logo */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 78% 50%, rgba(52,211,153,0.14) 0%, transparent 45%)',
          }}
        />

        {/* Left — text content */}
        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 0,
            bottom: 0,
            width: 640,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 13,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#34D399',
              fontWeight: 500,
            }}
          >
            Tempo × MPP
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 82,
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: '-0.05em',
              color: '#F8FAFC',
            }}
          >
            <span style={{ display: 'flex' }}>Payroll for</span>
            <span style={{ display: 'flex' }}>
              the&nbsp;
              <span style={{ color: '#34D399' }}>AI era.</span>
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              color: '#475569',
              letterSpacing: '-0.01em',
              marginTop: 4,
            }}
          >
            remlo.xyz
          </div>
        </div>

        {/* Right — actual logo */}
        <div
          style={{
            position: 'absolute',
            right: 96,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SRC}
            width={190}
            height={190}
            alt="Remlo"
            style={{ borderRadius: 40 }}
          />
        </div>
      </div>
    ),
    size
  )
}
