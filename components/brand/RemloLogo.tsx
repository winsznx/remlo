import * as React from 'react'
import { cn } from '@/lib/utils'

interface RemloMarkProps extends React.SVGProps<SVGSVGElement> {}

export function RemloMark({ className, ...props }: RemloMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
      {...props}
    >
      <rect x="1" y="1" width="30" height="30" rx="10" fill="#0B1220" />
      <rect x="1.5" y="1.5" width="29" height="29" rx="9.5" stroke="#1E293B" />
      <circle cx="24.5" cy="8.5" r="7" fill="#34D399" fillOpacity="0.14" />
      <circle cx="10" cy="24.5" r="6.5" fill="#059669" fillOpacity="0.2" />
      <path
        d="M10 8.75V23.25"
        stroke="#FFFFFF"
        strokeWidth="3.25"
        strokeLinecap="round"
      />
      <path
        d="M10 8.75H17.25C19.5962 8.75 21.5 10.6538 21.5 13C21.5 15.3462 19.5962 17.25 17.25 17.25H10"
        stroke="#FFFFFF"
        strokeWidth="3.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.25 17.25L22.25 23.25"
        stroke="#FFFFFF"
        strokeWidth="3.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="20.25" y="8" width="4" height="1.5" rx="0.75" fill="#34D399" />
      <rect
        x="21"
        y="10.75"
        width="3.25"
        height="1.5"
        rx="0.75"
        fill="#34D399"
        fillOpacity="0.6"
      />
    </svg>
  )
}

interface RemloLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  showWordmark?: boolean
  markClassName?: string
  labelClassName?: string
}

export function RemloLogo({
  className,
  showWordmark = true,
  markClassName,
  labelClassName,
  ...props
}: RemloLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)} {...props}>
      <RemloMark className={cn('h-7 w-7', markClassName)} />
      {showWordmark ? (
        <span className={cn('font-semibold tracking-tight', labelClassName)}>Remlo</span>
      ) : null}
    </span>
  )
}
