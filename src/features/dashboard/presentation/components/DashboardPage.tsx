'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RefreshCw, WifiOff } from 'lucide-react'
import type { DashboardData } from '../../application/getDashboardSummary'
import { formatDashboardData } from '../../application/formatDashboardData'
import { DashboardHeader } from './DashboardHeader'
import { OverdueAlert } from './OverdueAlert'
import { TodayCard } from './TodayCard'
import { PendingTasksSection } from './PendingTasksSection'
import { UpcomingExamsSection } from './UpcomingExamsSection'
import { UpcomingAssignmentsSection } from './UpcomingAssignmentsSection'
import { QuickStatsSection } from './QuickStatsSection'
import { QuickActionsSection } from './QuickActionsSection'
import { MiniCalendar } from './MiniCalendar'
import { useIsOnline } from '@/shared/hooks/useIsOnline'
import { useToast } from '@/shared/components/ui/toast'
import { getDashboardDataAction } from '../actions/getDashboardData'
import { toggleActivityStatusAction } from '@/features/activities/presentation/actions/toggleActivityStatus'
import {
  readDashboardCache,
  saveDashboardCache,
} from '../lib/dashboardCache'

interface DashboardPageProps {
  initialData: DashboardData
  userName?: string
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function DashboardPage({ initialData, userName }: DashboardPageProps) {
  const [data, setData] = useState<DashboardData>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date(initialData.generatedAt))
  const [now, setNow] = useState(new Date())
  const isOnline = useIsOnline()
  const toast = useToast()

  const refresh = useCallback(async (showSpinner = true, fresh = false) => {
    if (showSpinner) setIsRefreshing(true)
    const result = await getDashboardDataAction({ fresh })
    if (result.success && result.data) {
      setData(result.data)
      setLastUpdated(new Date())
      setError(null)
      saveDashboardCache(result.data)
    } else {
      setError(result.error?.message ?? 'Não foi possível carregar o dashboard')
    }
    setIsRefreshing(false)
    setNow(new Date())
  }, [])

  useEffect(() => {
    saveDashboardCache(initialData)
    setNow(new Date())
  }, [initialData])

  useEffect(() => {
    if (!navigator.onLine) {
      const cached = readDashboardCache()
      if (cached) {
        setData(cached.data)
        setLastUpdated(new Date(cached.cachedAt))
      }
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh(false)
      }
    }, REFRESH_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [refresh])

  useEffect(() => {
    const handleOnline = () => void refresh(false)
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [refresh])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastUpdated.getTime() > REFRESH_INTERVAL_MS) {
        void refresh(false)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [lastUpdated, refresh])

  const formatted = useMemo(() => {
    const subjectNames = new Map(data.subjects.map((subject) => [subject.id, subject.name]))
    return formatDashboardData(data, subjectNames)
  }, [data])

  async function toggleTask(taskId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED'
    const result = await toggleActivityStatusAction(taskId, nextStatus)
    if (!result.success) {
      toast.error('Não foi possível atualizar', { description: result.error?.message })
      return
    }
    toast.success(nextStatus === 'COMPLETED' ? 'Tarefa concluída!' : 'Tarefa reaberta')
    await refresh(false, true)
  }

  const lastUpdatedLabel = formatDistanceToNow(lastUpdated, { addSuffix: true, locale: ptBR })

  return (
    <div className="page-shell max-w-6xl">
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo principal
      </a>

      <div className="mb-2 flex items-center justify-between gap-3">
        <DashboardHeader userName={userName ?? data.userName} now={now} />
        <button
          type="button"
          onClick={() => void refresh(true, true)}
          disabled={isRefreshing || !isOnline}
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] text-muted transition-colors hover:text-primary disabled:opacity-50 sm:inline-flex"
          aria-label="Atualizar dashboard"
        >
          <RefreshCw className={isRefreshing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          <span>{isRefreshing ? 'Atualizando…' : `Atualizado ${lastUpdatedLabel}`}</span>
        </button>
      </div>

      {!isOnline && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-line bg-line/40 px-4 py-2.5 text-xs text-muted">
          <WifiOff className="h-4 w-4" />
          Você está offline. Exibindo os últimos dados salvos ({lastUpdatedLabel}).
        </div>
      )}

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 text-sm text-[#b91c1c]" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refresh(true, true)}
            className="rounded-full bg-[#ef4444] px-3 py-1 text-xs font-semibold text-white hover:bg-[#dc2626]"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <OverdueAlert overdueCount={data.stats.overdueCount} />

      <div id="dashboard-main" className="grid grid-cols-1 gap-5 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="space-y-5">
          <TodayCard
            tasks={formatted.todayTasks}
            total={data.todayTotal}
            onToggle={(task) => void toggleTask(task.id, task.status)}
          />
          <PendingTasksSection
            tasks={formatted.tasks}
            total={data.totalPendingTasks}
            onToggle={(task) => void toggleTask(task.id, task.status)}
          />
          <UpcomingExamsSection exams={formatted.exams} total={data.totalUpcomingExams} />
          <UpcomingAssignmentsSection assignments={formatted.assignments} total={data.totalUpcomingAssignments} />
        </div>

        <div className="space-y-5">
          <MiniCalendar calendarDays={data.calendarDays} />
          <QuickStatsSection stats={formatted.stats} />
          <QuickActionsSection isOnline={isOnline} />
        </div>
      </div>
    </div>
  )
}
