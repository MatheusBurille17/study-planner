'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { Activity } from '@/shared/types/activity'
import type { Subject } from '@/shared/types/subject'
import { useToast } from '@/shared/components/ui/toast'
import { Button } from '@/shared/components/ui/button'
import {
  applyFilterCriteria,
} from '../../application/useCases/filterActivities'
import {
  serializeFilterCriteria,
  type FilterCriteria,
  type SortOption,
} from '../schemas/filterSchema'
import { SearchBar } from '../components/SearchBar'
import { ActivityFilters, ActiveFilterChips } from '../components/ActivityFilters'
import { SortSelector } from '../components/SortSelector'
import { ActivityList } from '../components/ActivityList'
import { ActivityTypeSelector } from '../components/ActivityTypeSelector'
import { DeleteActivityDialog } from '../components/DeleteActivityDialog'
import { BulkActionBar } from '../components/BulkActionBar'
import { useActivityRealtime } from '../hooks/useActivityRealtime'
import { toggleActivityStatusAction } from '../actions/toggleActivityStatus'
import { bulkDeleteAction, bulkUpdateStatusAction } from '../actions/bulkActions'

interface ActivityListPageProps {
  activities: Activity[]
  subjects: Subject[]
  userId: string
  initialFilters: FilterCriteria
  title: string
  subtitle: string
  fixedTypes?: Array<'task' | 'exam' | 'assignment' | 'seminar'>
  showTypeTabs?: boolean
}

export function ActivityListPage({
  activities,
  subjects,
  userId,
  initialFilters,
  title,
  subtitle,
  fixedTypes,
  showTypeTabs,
}: ActivityListPageProps) {
  const [filters, setFilters] = useState<FilterCriteria>(initialFilters)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkBusy, setIsBulkBusy] = useState(false)
  const router = useRouter()
  const toast = useToast()

  useActivityRealtime(userId)

  useEffect(() => {
    const handleChange = () => router.refresh()
    window.addEventListener('activity:changed', handleChange)
    return () => window.removeEventListener('activity:changed', handleChange)
  }, [router])

  useEffect(() => {
    /*
     * Filtros são 100% client-side. Atualizamos a URL com history.replaceState
     * em vez de router.replace: o link continua compartilhável, mas não
     * disparamos uma nova requisição RSC ao servidor a cada tecla/busca.
     */
    const query = serializeFilterCriteria(filters)
    const target = query ? `?${query}` : ''
    const nextUrl = `${window.location.pathname}${target}`
    const currentUrl = `${window.location.pathname}${window.location.search}`
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, '', nextUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const filtered = useMemo(
    () => {
      const allowedTypes = fixedTypes ?? filters.types
      const selectedTypes =
        fixedTypes && filters.types?.length
          ? filters.types.filter((type) => fixedTypes.includes(type as never))
          : allowedTypes
      return applyFilterCriteria(activities, { ...filters, types: selectedTypes })
    },
    [activities, filters, fixedTypes],
  )

  const paginated = useMemo(
    () => {
      const limit = filters.limit ?? 20
      const page = filters.page ?? 1
      const items = filtered.slice(0, page * limit)
      return { items, hasMore: items.length < filtered.length }
    },
    [filtered, filters.page, filters.limit],
  )

  async function handleToggleStatus(activity: Activity) {
    if (activity.type !== 'task' && activity.type !== 'assignment') return
    const nextStatus =
      activity.type === 'task'
        ? activity.status === 'COMPLETED'
          ? 'TODO'
          : 'COMPLETED'
        : activity.status === 'PENDING'
          ? 'SUBMITTED'
          : 'PENDING'
    const result = await toggleActivityStatusAction(activity.id, nextStatus)
    if (!result.success) {
      toast.error('Não foi possível atualizar', { description: result.error?.message })
      return
    }
    toast.success(nextStatus === 'COMPLETED' ? 'Tarefa concluída!' : 'Status atualizado')
    // O listener de `activity:changed` abaixo já faz um único router.refresh().
    window.dispatchEvent(new CustomEvent('activity:changed'))
  }

  async function handleBulkStatus(status: string) {
    setIsBulkBusy(true)
    const result = await bulkUpdateStatusAction(selectedIds, status)
    setIsBulkBusy(false)
    if (!result.success) {
      toast.error('Não foi possível atualizar em lote', { description: result.error?.message })
      return
    }
    toast.success(`Status atualizado em ${result.affected ?? selectedIds.length} atividades`)
    setSelectedIds([])
    window.dispatchEvent(new CustomEvent('activity:changed'))
  }

  async function handleBulkDelete() {
    setIsBulkBusy(true)
    const result = await bulkDeleteAction(selectedIds)
    setIsBulkBusy(false)
    if (!result.success) {
      toast.error('Não foi possível excluir em lote', { description: result.error?.message })
      return
    }
    toast.success(`${result.affected ?? selectedIds.length} atividades movidas para a lixeira`)
    setSelectedIds([])
    window.dispatchEvent(new CustomEvent('activity:changed'))
  }

  return (
    <div className="page-shell">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Sua organização</p>
          <h1 className="section-heading">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/activities/trash"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-xs font-medium text-muted hover:border-primary/30 hover:text-primary"
          >
            <Trash2 className="h-3.5 w-3.5" /> Lixeira
          </Link>
          <Button onClick={() => setSelectorOpen(true)}>
            <Plus className="h-4 w-4" /> Nova atividade
          </Button>
        </div>
      </header>

      {showTypeTabs && fixedTypes && fixedTypes.length > 1 && (
        <div className="mb-4 flex gap-1 rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Filtrar por tipo">
          {[
            { value: undefined, label: 'Todos' },
            ...(fixedTypes.includes('exam') ? [{ value: 'exam' as const, label: 'Provas' }] : []),
            ...(fixedTypes.includes('assignment') ? [{ value: 'assignment' as const, label: 'Trabalhos' }] : []),
          ].map((tab) => {
            const active = tab.value
              ? filters.types?.length === 1 && filters.types[0] === tab.value
              : !filters.types?.length
            return (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    types: tab.value ? [tab.value] : undefined,
                    page: 1,
                  }))
                }
                className={`flex-1 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  active ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-primary-50 hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <SearchBar
          value={filters.search ?? ''}
          onSearch={(term) => setFilters((current) => ({ ...current, search: term || undefined, page: 1 }))}
          resultCount={filtered.length}
          totalCount={activities.length}
        />
        <SortSelector
          value={(filters.sort ?? 'date_asc') as SortOption}
          onChange={(sort) => setFilters((current) => ({ ...current, sort, page: 1 }))}
        />
      </div>

      <div className="mb-3">
        <ActiveFilterChips
          filters={filters}
          subjects={subjects}
          onChange={setFilters}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <ActivityFilters
          filters={filters}
          subjects={subjects}
          onChange={setFilters}
          onClear={() =>
            setFilters({ sort: filters.sort, page: 1, limit: filters.limit })
          }
        />

        <div className="min-w-0">
          <ActivityList
            activities={paginated.items}
            subjects={subjects}
            total={filtered.length}
            hasMore={paginated.hasMore}
            onLoadMore={() => setFilters((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}
            onToggleStatus={handleToggleStatus}
            onEdit={(activity) => router.push(`/activities/${activity.id}/edit`)}
            onDelete={(activity) => setActivityToDelete(activity)}
            selectable
            selectedIds={selectedIds}
            onToggleSelected={(activity) =>
              setSelectedIds((current) =>
                current.includes(activity.id)
                  ? current.filter((id) => id !== activity.id)
                  : [...current, activity.id],
              )
            }
          />
        </div>
      </div>

      <ActivityTypeSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelectType={(type) => {
          setSelectorOpen(false)
          router.push(`/activities/new?type=${type}`)
        }}
      />

      <DeleteActivityDialog
        activity={activityToDelete}
        open={Boolean(activityToDelete)}
        onOpenChange={(open) => !open && setActivityToDelete(null)}
      />

      <BulkActionBar
        selectedIds={selectedIds}
        onClear={() => setSelectedIds([])}
        onBulkStatus={handleBulkStatus}
        onBulkDelete={handleBulkDelete}
        isBusy={isBulkBusy}
      />
    </div>
  )
}
