import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/utils/classNames'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden="true" />
}

export function Loading({ label = 'Carregando…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-10 text-sm text-muted', className)}>
      <Spinner />
      {label}
    </div>
  )
}
