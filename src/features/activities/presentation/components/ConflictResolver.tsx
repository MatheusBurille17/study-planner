'use client'

import { AlertTriangle, RefreshCw, Save, Undo2 } from 'lucide-react'
import { Dialog } from '@/shared/components/ui/dialog'
import type { Subject } from '@/shared/types/subject'
import type { ConflictChoice, ConflictState } from '../hooks/useActivityCreation'
import { describeActivityChanges } from '../../application/useCases/describeActivityChanges'
import { formatDateTime } from '@/shared/utils/dateHelpers'

const OPTIONS: Array<{
  choice: ConflictChoice
  title: string
  description: string
  icon: typeof RefreshCw
  className: string
}> = [
  {
    choice: 'reload',
    title: 'Recarregar dados',
    description: 'Descarta suas mudanças e carrega a versão mais recente do servidor.',
    icon: RefreshCw,
    className: 'bg-sky/30 text-[#315a7d]',
  },
  {
    choice: 'discard',
    title: 'Descartar minhas mudanças',
    description: 'Fecha o editor e mantém a versão mais recente que está no servidor.',
    icon: Undo2,
    className: 'bg-line/70 text-muted',
  },
  {
    choice: 'keep-local',
    title: 'Manter minhas mudanças',
    description: 'Tenta salvar sua versão usando a versão do servidor como base.',
    icon: Save,
    className: 'bg-primary-50 text-primary-800',
  },
]

export function ConflictResolver({
  conflict,
  open,
  onResolve,
  subjects = [],
}: {
  conflict: ConflictState | null
  open: boolean
  onResolve: (choice: ConflictChoice) => void
  subjects?: Subject[]
}) {
  if (!conflict) return null

  const clientTitle = 'title' in conflict.clientData ? conflict.clientData.title : undefined
  const subjectNames = Object.fromEntries(subjects.map((subject) => [subject.id, subject.name]))
  const changes = describeActivityChanges(conflict.serverData, conflict.clientData, { subjectNames })

  return (
    <Dialog
      open={open}
      onOpenChange={() => onResolve('discard')}
      title="Conflito de edição"
      description="Esta atividade foi modificada em outro dispositivo desde que você abriu o editor."
      className="max-w-xl"
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-2xl bg-butter/30 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#7a6422]" />
          <div className="text-xs text-[#6d5a22]">
            <p>A versão do servidor é mais recente que a que você abriu.</p>
            <p className="mt-1">Suas mudanças ainda não foram salvas — escolha como continuar.</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted">Versão do servidor</p>
            <p className="mt-1 text-xs font-medium text-ink">{formatDateTime(conflict.serverData.updatedAt)}</p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary-50/50 p-3">
            <p className="text-[10px] uppercase tracking-wide text-primary-800/70">Sua versão</p>
            <p className="mt-1 text-xs font-medium text-primary-800">
              {conflict.clientUpdatedAt
                ? `Baseada na versão de ${formatDateTime(conflict.clientUpdatedAt)}`
                : 'Alterações não salvas'}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink">O que mudou</p>
            {changes.length > 0 && (
              <span className="text-[10px] text-muted">
                {changes.length} {changes.length === 1 ? 'campo' : 'campos'}
              </span>
            )}
          </div>

          {changes.length > 0 ? (
            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
              {changes.map((change) => (
                <div key={change.field} className="rounded-xl border border-line bg-surface p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{change.label}</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-line/40 p-2">
                      <p className="text-[9px] uppercase tracking-wide text-muted">Servidor</p>
                      <p className="mt-0.5 line-clamp-3 break-words text-[11px] text-ink">{change.serverValue}</p>
                    </div>
                    <div className="rounded-lg bg-primary-50 p-2">
                      <p className="text-[9px] uppercase tracking-wide text-primary-800/70">Sua versão</p>
                      <p className="mt-0.5 line-clamp-3 break-words text-[11px] font-medium text-primary-800">
                        {change.clientValue}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-dashed border-line bg-surface/60 p-3">
              <p className="text-center text-xs text-muted">
                Nenhuma diferença nos campos comparáveis. A alteração pode ter sido em lembretes ou em um campo não
                exibido.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-line/40 p-2">
                  <p className="text-[9px] uppercase tracking-wide text-muted">Servidor</p>
                  <p className="mt-0.5 line-clamp-2 break-words text-[11px] text-ink">{conflict.serverData.title}</p>
                </div>
                <div className="rounded-lg bg-primary-50 p-2">
                  <p className="text-[9px] uppercase tracking-wide text-primary-800/70">Sua versão</p>
                  <p className="mt-0.5 line-clamp-2 break-words text-[11px] font-medium text-primary-800">
                    {clientTitle ?? conflict.serverData.title}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.choice}
                type="button"
                onClick={() => onResolve(option.choice)}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${option.className}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">{option.title}</span>
                  <span className="block text-[11px] text-muted">{option.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Dialog>
  )
}
