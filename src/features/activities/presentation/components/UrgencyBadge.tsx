import { AlertCircle, CalendarClock, CheckCircle2 } from 'lucide-react'
import { relativeDayLabel, urgencyLevel } from '@/shared/utils/dateHelpers'
import { cn } from '@/shared/utils/classNames'

export function UrgencyBadge({
  date,
  completed,
  className,
}: {
  date?: Date | string
  completed?: boolean
  className?: string
}) {
  if (!date) {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full bg-line/60 px-2 py-0.5 text-[10px] text-muted', className)}>
        <CalendarClock className="h-3 w-3" /> Sem prazo
      </span>
    )
  }

  const level = urgencyLevel(date)
  const label = relativeDayLabel(date)

  if (completed) {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full bg-sage/40 px-2 py-0.5 text-[10px] text-[#3c6b4d]', className)}>
        <CheckCircle2 className="h-3 w-3" /> Concluída
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        level === 'high' && 'bg-rose/40 text-[#8a3d52]',
        level === 'medium' && 'bg-butter/50 text-[#7a6422]',
        level === 'low' && 'bg-sage/30 text-[#3c6b4d]',
        className,
      )}
    >
      {level === 'high' ? <AlertCircle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
      {label}
    </span>
  )
}
