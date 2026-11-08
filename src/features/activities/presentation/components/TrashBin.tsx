'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Trash2, TrashIcon } from 'lucide-react'
import type { Activity } from '@/shared/types/activity'
import { ActivityTypeBadge } from './ActivityTypeBadge'
import { Button } from '@/shared/components/ui/button'
import { Dialog } from '@/shared/components/ui/dialog'
import { Spinner } from '@/shared/components/ui/spinner'
import { useToast } from '@/shared/components/ui/toast'
import { formatDate } from '@/shared/utils/dateHelpers'
import {
  permanentlyDeleteActivityAction,
  restoreActivityAction,
} from '../actions/restoreActivity'

function daysRemaining(deletedAt?: Date): number {
  if (!deletedAt) return 30
  const diff = Date.now() - deletedAt.getTime()
  return Math.max(0, 30 - Math.floor(diff / 86_400_000))
}

export function TrashBin({ activities }: { activities: Activity[] }) {
  const [target, setTarget] = useState<Activity | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const router = useRouter()
  const toast = useToast()

  async function restore(activity: Activity) {
    setBusyId(activity.id)
    const result = await restoreActivityAction(activity.id)
    setBusyId(null)
    if (!result.success) {
      toast.error('Não foi possível restaurar', { description: result.error?.message })
      return
    }
    toast.success('Atividade restaurada', { description: activity.title })
    window.dispatchEvent(new CustomEvent('activity:changed'))
    router.refresh()
  }

  async function permanentDelete() {
    if (!target) return
    setBusyId(target.id)
    const result = await permanentlyDeleteActivityAction(target.id)
    setBusyId(null)
    if (!result.success) {
      toast.error('Não foi possível excluir', { description: result.error?.message })
      return
    }
    toast.success('Atividade excluída permanentemente')
    setTarget(null)
    router.refresh()
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-line/50 text-muted">
          <TrashIcon className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-serif text-xl text-ink">Nenhuma atividade na lixeira</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Atividades excluídas ficam aqui por 30 dias antes de serem removidas permanentemente.
        </p>
      </div>
    )
  }

  return (
    <>
      <ul className="space-y-3">
        {activities.map((activity) => {
          const remaining = daysRemaining(activity.deletedAt)
          return (
            <li key={activity.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ActivityTypeBadge type={activity.type} />
                    <span className="rounded-full bg-butter/40 px-2 py-0.5 text-[10px] text-[#7a6422]">
                      {remaining} {remaining === 1 ? 'dia restante' : 'dias restantes'}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate font-serif text-lg text-ink">{activity.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Excluída em {formatDate(activity.deletedAt, 'dd/MM/yyyy')} · será removida permanentemente
                    após 30 dias.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => void restore(activity)}
                    disabled={busyId === activity.id}
                  >
                    {busyId === activity.id ? <Spinner /> : <RotateCcw className="h-3.5 w-3.5" />} Restaurar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setTarget(activity)}
                    disabled={busyId === activity.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <Dialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)} title="Excluir permanentemente?">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            A atividade <strong className="text-ink">{target?.title}</strong> será removida para sempre. Não será
            possível restaurá-la.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void permanentDelete()} disabled={Boolean(busyId)}>
              {busyId ? <Spinner /> : null} Excluir permanentemente
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
