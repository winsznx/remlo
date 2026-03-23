import type { CSSProperties } from 'react'

import styles from './HyperspeedHeroBackground.module.css'

type Trail = {
  id: string
  topLeft: string
  topRight: string
  bottomLeft: string
  bottomRight: string
  core: string
  edge: string
  duration: string
  delay: string
  opacity: number
}

const TRAILS: Trail[] = [
  {
    id: 'emerald-left-edge',
    topLeft: '49.4%',
    topRight: '49.85%',
    bottomLeft: '-2%',
    bottomRight: '8%',
    core: 'rgba(52, 211, 153, 0.88)',
    edge: 'rgba(52, 211, 153, 0.16)',
    duration: '9.5s',
    delay: '-2.4s',
    opacity: 0.52,
  },
  {
    id: 'mint-left-main',
    topLeft: '49.65%',
    topRight: '50.1%',
    bottomLeft: '6%',
    bottomRight: '18%',
    core: 'rgba(45, 212, 191, 0.92)',
    edge: 'rgba(45, 212, 191, 0.18)',
    duration: '8.8s',
    delay: '-1.8s',
    opacity: 0.64,
  },
  {
    id: 'teal-left-inner',
    topLeft: '49.8%',
    topRight: '50.12%',
    bottomLeft: '16%',
    bottomRight: '25%',
    core: 'rgba(20, 184, 166, 0.84)',
    edge: 'rgba(20, 184, 166, 0.18)',
    duration: '8.1s',
    delay: '-4.2s',
    opacity: 0.58,
  },
  {
    id: 'center-silver',
    topLeft: '49.97%',
    topRight: '50.1%',
    bottomLeft: '45%',
    bottomRight: '55%',
    core: 'rgba(226, 232, 240, 0.8)',
    edge: 'rgba(148, 163, 184, 0.16)',
    duration: '7.8s',
    delay: '-0.7s',
    opacity: 0.34,
  },
  {
    id: 'blue-center-right',
    topLeft: '50.18%',
    topRight: '50.48%',
    bottomLeft: '61%',
    bottomRight: '70%',
    core: 'rgba(59, 130, 246, 0.82)',
    edge: 'rgba(59, 130, 246, 0.16)',
    duration: '8.6s',
    delay: '-3.4s',
    opacity: 0.56,
  },
  {
    id: 'cyan-right-main',
    topLeft: '50.32%',
    topRight: '50.7%',
    bottomLeft: '70%',
    bottomRight: '80%',
    core: 'rgba(34, 211, 238, 0.92)',
    edge: 'rgba(34, 211, 238, 0.18)',
    duration: '8.9s',
    delay: '-2.6s',
    opacity: 0.66,
  },
  {
    id: 'sky-right-edge',
    topLeft: '50.55%',
    topRight: '50.92%',
    bottomLeft: '82%',
    bottomRight: '94%',
    core: 'rgba(125, 211, 252, 0.82)',
    edge: 'rgba(125, 211, 252, 0.16)',
    duration: '9.4s',
    delay: '-4.8s',
    opacity: 0.5,
  },
]

export function HyperspeedHeroBackground() {
  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.sky} />
      <div className={styles.horizonGlow} />
      <div className={styles.roadbed} />
      <div className={styles.field}>
        {TRAILS.map((trail) => (
          <span
            key={trail.id}
            className={styles.trail}
            style={
              {
                '--top-left': trail.topLeft,
                '--top-right': trail.topRight,
                '--bottom-left': trail.bottomLeft,
                '--bottom-right': trail.bottomRight,
                '--trail-core': trail.core,
                '--trail-edge': trail.edge,
                '--trail-duration': trail.duration,
                '--trail-delay': trail.delay,
                '--trail-opacity': trail.opacity,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className={styles.radialMask} />
      <div className={styles.bottomFade} />
    </div>
  )
}
