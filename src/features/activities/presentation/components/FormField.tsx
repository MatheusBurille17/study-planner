import * as React from 'react'
import { Label } from '@/shared/components/ui/label'
import { cn } from '@/shared/utils/classNames'

interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  maxLength?: number
  currentLength?: number
  children: React.ReactNode
  className?: string
}

/** Wrapper reutilizável de campo com label, erro, dica e contador. */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  maxLength,
  currentLength,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={htmlFor} className="flex items-center gap-1">
          {label}
          {required && <span className="text-[#ef4444]">*</span>}
        </Label>
        {maxLength !== undefined && (
          <span className={cn('text-[11px] text-muted', (currentLength ?? 0) > maxLength && 'text-[#ef4444]')}>
            {currentLength ?? 0}/{maxLength}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-[#ef4444]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
