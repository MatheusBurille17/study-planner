'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/shared/utils/classNames'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
}

export function Dialog({ open, onOpenChange, children, className, title, description }: DialogProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onOpenChange])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div
        className="absolute inset-0 bg-[#2b2437]/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 w-full max-w-lg animate-slide-up rounded-t-3xl bg-background p-6 shadow-soft sm:animate-fade-in sm:rounded-3xl',
          className,
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted transition-colors hover:bg-line/60 hover:text-ink"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        {title && <h2 className="mb-1 pr-8 font-serif text-2xl text-ink">{title}</h2>}
        {description && <p className="mb-4 text-sm text-muted">{description}</p>}
        <div className={cn(title || description ? 'mt-4' : '')}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
