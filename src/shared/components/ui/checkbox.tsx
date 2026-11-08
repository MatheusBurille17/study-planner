'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/shared/utils/classNames'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    return (
      <label htmlFor={inputId} className="inline-flex cursor-pointer items-center gap-2">
        <span className="relative inline-flex h-5 w-5 items-center justify-center">
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            className={cn(
              'peer h-5 w-5 appearance-none rounded-md border border-line bg-surface transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              className,
            )}
            {...props}
          />
          <Check className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100" />
        </span>
        {label && <span className="text-sm text-ink">{label}</span>}
      </label>
    )
  },
)
Checkbox.displayName = 'Checkbox'
