import * as React from 'react'
import { cn } from '@/shared/utils/classNames'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'soft'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium',
        variant === 'default' && 'bg-primary-100 text-primary-800',
        variant === 'outline' && 'border border-line bg-surface text-muted',
        variant === 'soft' && 'bg-line/60 text-ink',
        className,
      )}
      {...props}
    />
  )
}
