'use client'

import { cn } from '@/shared/utils/classNames'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
  hint?: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  columns?: number
  ariaLabel?: string
}

/** Controle segmentado acessível (radiogroup) usado em prioridade, status e tipos. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  columns,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('grid gap-2', className)}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all',
              selected
                ? 'border-primary/40 bg-primary-50 text-primary-800 shadow-sm'
                : 'border-line bg-surface text-muted hover:border-primary/20 hover:bg-primary-50/50',
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
