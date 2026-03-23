import type { CSSProperties } from 'react'

import styles from './HyperspeedHeroBackground.module.css'

type Trail = {
  id: string
  topLeft: string
  topRight: string
  bottomLeft: string
  bottomRight: string
  fade: string
  core: string
  glow: string
  duration: string
  delay: string
  opacity: number
  blur: string
}

const TRAILS: Trail[] = [
  {
    id: 'emerald-left-edge',
    topLeft: '49.4%',
    topRight: '49.85%',
    bottomLeft: '-4%',
    bottomRight: '9%',
    fade: 'rgba(52, 211, 153, 0.14)',
    core: 'rgba(52, 211, 153, 0.88)',
    glow: 'rgba(52, 211, 153, 0.5)',
    duration: '13s',
    delay: '-3.4s',
    opacity: 0.8,
    blur: '0px',
  },
  {
    id: 'mint-left-main',
    topLeft: '49.65%',
    topRight: '50.1%',
    bottomLeft: '6%',
    bottomRight: '18%',
    fade: 'rgba(45, 212, 191, 0.12)',
    core: 'rgba(45, 212, 191, 0.92)',
    glow: 'rgba(45, 212, 191, 0.55)',
    duration: '12.5s',
    delay: '-2.1s',
    opacity: 0.9,
    blur: '0px',
  },
  {
    id: 'teal-left-inner',
    topLeft: '49.8%',
    topRight: '50.12%',
    bottomLeft: '16%',
    bottomRight: '25%',
    fade: 'rgba(20, 184, 166, 0.12)',
    core: 'rgba(20, 184, 166, 0.84)',
    glow: 'rgba(20, 184, 166, 0.48)',
    duration: '11.2s',
    delay: '-5.6s',
    opacity: 0.78,
    blur: '0px',
  },
  {
    id: 'cyan-center-left',
    topLeft: '49.95%',
    topRight: '50.26%',
    bottomLeft: '28%',
    bottomRight: '36%',
    fade: 'rgba(56, 189, 248, 0.12)',
    core: 'rgba(56, 189, 248, 0.82)',
    glow: 'rgba(56, 189, 248, 0.44)',
    duration: '10.8s',
    delay: '-1.3s',
    opacity: 0.76,
    blur: '0px',
  },
  {
    id: 'blue-center-right',
    topLeft: '50.18%',
    topRight: '50.48%',
    bottomLeft: '61%',
    bottomRight: '70%',
    fade: 'rgba(59, 130, 246, 0.12)',
    core: 'rgba(59, 130, 246, 0.82)',
    glow: 'rgba(59, 130, 246, 0.45)',
    duration: '11.4s',
    delay: '-4.5s',
    opacity: 0.74,
    blur: '0px',
  },
  {
    id: 'cyan-right-main',
    topLeft: '50.32%',
    topRight: '50.7%',
    bottomLeft: '70%',
    bottomRight: '80%',
    fade: 'rgba(34, 211, 238, 0.12)',
    core: 'rgba(34, 211, 238, 0.92)',
    glow: 'rgba(34, 211, 238, 0.56)',
    duration: '12.2s',
    delay: '-2.7s',
    opacity: 0.88,
    blur: '0px',
  },
  {
    id: 'sky-right-edge',
    topLeft: '50.55%',
    topRight: '50.92%',
    bottomLeft: '82%',
    bottomRight: '95%',
    fade: 'rgba(125, 211, 252, 0.12)',
    core: 'rgba(125, 211, 252, 0.8)',
    glow: 'rgba(125, 211, 252, 0.42)',
    duration: '13.4s',
    delay: '-6.2s',
    opacity: 0.68,
    blur: '0px',
  },
  {
    id: 'signal-left-echo',
    topLeft: '49.5%',
    topRight: '49.7%',
    bottomLeft: '2%',
    bottomRight: '7%',
    fade: 'rgba(110, 231, 183, 0.08)',
    core: 'rgba(110, 231, 183, 0.54)',
    glow: 'rgba(110, 231, 183, 0.28)',
    duration: '15s',
    delay: '-7.4s',
    opacity: 0.48,
    blur: '1px',
  },
  {
    id: 'signal-right-echo',
    topLeft: '50.62%',
    topRight: '50.84%',
    bottomLeft: '86%',
    bottomRight: '94%',
    fade: 'rgba(147, 197, 253, 0.08)',
    core: 'rgba(147, 197, 253, 0.56)',
    glow: 'rgba(147, 197, 253, 0.28)',
    duration: '14.6s',
    delay: '-3.8s',
    opacity: 0.46,
    blur: '1px',
  },
]

const PARTICLES = [
  { id: 'p1', left: '18%', top: '22%', size: '5px', delay: '-1s', duration: '7.5s' },
  { id: 'p2', left: '29%', top: '34%', size: '3px', delay: '-4.2s', duration: '8.8s' },
  { id: 'p3', left: '42%', top: '18%', size: '4px', delay: '-2.5s', duration: '7.2s' },
  { id: 'p4', left: '57%', top: '27%', size: '4px', delay: '-5.1s', duration: '9.3s' },
  { id: 'p5', left: '71%', top: '21%', size: '5px', delay: '-2.2s', duration: '8.4s' },
  { id: 'p6', left: '82%', top: '31%', size: '3px', delay: '-6.1s', duration: '10s' },
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
                '--trail-fade': trail.fade,
                '--trail-core': trail.core,
                '--trail-glow': trail.glow,
                '--trail-duration': trail.duration,
                '--trail-delay': trail.delay,
                '--trail-opacity': trail.opacity,
                '--trail-blur': trail.blur,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className={styles.particleLayer}>
        {PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className={styles.particle}
            style={
              {
                '--particle-left': particle.left,
                '--particle-top': particle.top,
                '--particle-size': particle.size,
                '--particle-delay': particle.delay,
                '--particle-duration': particle.duration,
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
