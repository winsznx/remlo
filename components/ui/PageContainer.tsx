import * as React from 'react'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  narrow?: boolean
}

export function PageContainer({ children, className = '', narrow = false }: PageContainerProps) {
  return (
    <div className={`mx-auto w-full ${narrow ? 'max-w-3xl' : 'max-w-7xl'} ${className}`}>
      {children}
    </div>
  )
}
