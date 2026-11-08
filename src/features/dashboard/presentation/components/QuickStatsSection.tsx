import { AlertTriangle, Clock3, ListChecks, Target } from 'lucide-react'
import type { DashboardStats } from '../../domain/dashboardRules'
import { formatEstimatedHours, formatPercent } from '../../application/formatDashboardData'

export function QuickStatsSection({ stats }: { stats: DashboardStats }) {
  const cards = [
    {
      label: 'Conclusão',
      value: formatPercent(stats.completionPercent),
      detail: `${stats.completedTasks} de ${stats.totalTasks} tarefas`,
      icon: Target,
      className: 'bg-primary-50 text-primary-800',
      iconClass: 'bg-primary-100 text-primary-700',
      aria: `Taxa de conclusão: ${formatPercent(stats.completionPercent)}`,
    },
    {
      label: 'Atrasadas',
      value: String(stats.overdueCount),
      detail: stats.overdueCount === 0 ? 'Nada atrasado' : 'Precisam de atenção',
      icon: AlertTriangle,
      className: 'bg-rose/20 text-[#8a3d52]',
      iconClass: 'bg-rose/40 text-[#8a3d52]',
      aria: `Atividades atrasadas: ${stats.overdueCount}`,
    },
    {
      label: 'Horas estimadas',
      value: formatEstimatedHours(stats.estimatedHours),
      detail: 'Para tarefas pendentes',
      icon: Clock3,
      className: 'bg-butter/30 text-[#7a6422]',
      iconClass: 'bg-butter/60 text-[#7a6422]',
      aria: `Horas estimadas de estudo: ${formatEstimatedHours(stats.estimatedHours)}`,
    },
    {
      label: 'Prioridades',
      value: `${stats.priorityBreakdown.high} alta${stats.priorityBreakdown.high === 1 ? '' : 's'}`,
      detail: `${stats.priorityBreakdown.medium} média · ${stats.priorityBreakdown.low} baixa`,
      icon: ListChecks,
      className: 'bg-sage/25 text-[#3c6b4d]',
      iconClass: 'bg-sage/50 text-[#3c6b4d]',
      aria: `Prioridades: ${stats.priorityBreakdown.high} alta, ${stats.priorityBreakdown.medium} média, ${stats.priorityBreakdown.low} baixa`,
    },
  ]

  return (
    <section aria-label="Estatísticas do dashboard" role="region">
      <h2 className="mb-3 font-serif text-xl text-ink">Visão rápida</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={`rounded-2xl border border-line p-3.5 ${card.className}`}
              aria-label={card.aria}
            >
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${card.iconClass}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide opacity-70">{card.label}</p>
              <p className="font-serif text-2xl leading-tight">{card.value}</p>
              <p className="mt-0.5 text-[10px] opacity-70">{card.detail}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
