'use client'

import * as React from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/shared/utils/classNames'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: ToastAction
  actions?: ToastAction[]
}

interface ToastItem extends ToastOptions {
  id: string
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string
  success: (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) => string
  error: (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) => string
  info: (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) => string
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext)
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = React.useCallback(
    (options: ToastOptions) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((current) => [...current, { ...options, id }])
      const duration = options.duration ?? (options.variant === 'error' ? 5000 : 3000)
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id))
      }, duration)
      return id
    },
    [],
  )

  const success = React.useCallback(
    (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
      toast({ ...options, title, variant: 'success' }),
    [toast],
  )
  const error = React.useCallback(
    (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
      toast({ ...options, title, variant: 'error' }),
    [toast],
  )
  const info = React.useCallback(
    (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
      toast({ ...options, title, variant: 'info' }),
    [toast],
  )

  return (
    <ToastContext.Provider value={{ toast, success, error, info, dismiss }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-2xl border bg-surface p-4 shadow-soft',
              item.variant === 'success' && 'border-sage/60',
              item.variant === 'error' && 'border-[#ef4444]/40',
              item.variant === 'info' && 'border-line',
            )}
          >
            {item.variant === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#4f8a63]" />}
            {item.variant === 'error' && <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#ef4444]" />}
            {(item.variant === 'info' || !item.variant) && (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              {item.description && <p className="mt-0.5 text-xs text-muted">{item.description}</p>}
              {(item.actions ?? (item.action ? [item.action] : [])).map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    action.onClick()
                    dismiss(item.id)
                  }}
                  className="mt-2 mr-3 text-xs font-semibold text-primary hover:underline"
                >
                  {action.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Fechar notificação"
              className="rounded-full p-1 text-muted hover:bg-line/60 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
