'use client'

import * as React from 'react'
import { motion, useInView } from 'framer-motion'

export function ForceDark() {
  React.useEffect(() => {
    const root = document.documentElement
    const prev = root.className
    if (!root.classList.contains('dark')) {
      root.classList.add('dark')
    }
    return () => {
      root.className = prev
    }
  }, [])
  return null
}

export function FadeInUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
