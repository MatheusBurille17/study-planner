import { ACTIVITY_COLORS, ACTIVITY_TYPE_LABELS } from '@/shared/types/activity'
import { cn } from '@/shared/utils/classNames'

export function ActivityTypeBadge({
  type,
  className,
}: {
  type: string
  className?: string
}) {
  const colors = ACTIVITY_COLORS[type] ?? ACTIVITY_COLORS.task
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium', colors.badge, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
      {ACTIVITY_TYPE_LABELS[type] ?? type}
    </span>
  )
}
