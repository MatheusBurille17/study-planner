import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import type { FormattedAssignment } from '../../application/formatDashboardData'
import { ASSIGNMENT_TYPE_LABELS } from '@/shared/types/activity'
import { relativeDayLabel, urgencyLevel } from '@/shared/utils/dateHelpers'
import { cn } from '@/shared/utils/classNames'

export function UpcomingAssignmentsSection({
  assignments,
  total,
}: {
  assignments: FormattedAssignment[]
  total: number
}) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-card" aria-labelledby="upcoming-assignments-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="upcoming-assignments-heading" className="flex items-center gap-2 font-serif text-xl text-ink">
          <BookOpen className="h-4.5 w-4.5 text-[#78b48c]" /> Próximas entregas
        </h2>
        {total > 5 && (
          <Link
            href="/assessments?type=assignment&sort=date_asc"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {assignments.length === 0 ? (
        <p className="rounded-xl bg-sage/20 px-4 py-4 text-center text-xs text-[#3c6b4d]">
          Nenhuma entrega nos próximos dias. Tudo em ordem!
        </p>
      ) : (
        <ul className="space-y-2">
          {assignments.map((assignment) => {
            const level = urgencyLevel(assignment.dueDate)
            return (
              <li key={assignment.id}>
                <Link
                  href={`/activities/${assignment.id}`}
                  className="flex items-center gap-3 rounded-xl border border-line/70 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary-50/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/40 text-[#3c6b4d]">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{assignment.shortTitle}</span>
                    <span className="block truncate text-[11px] text-muted">
                      {assignment.subjectName} · {ASSIGNMENT_TYPE_LABELS[assignment.assignmentType]}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                      level === 'high'
                        ? 'bg-rose/40 text-[#8a3d52]'
                        : level === 'medium'
                          ? 'bg-butter/50 text-[#7a6422]'
                          : 'bg-sage/40 text-[#3c6b4d]',
                    )}
                  >
                    {relativeDayLabel(assignment.dueDate)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
