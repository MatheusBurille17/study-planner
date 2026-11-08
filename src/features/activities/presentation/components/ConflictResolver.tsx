'use client'

import { AlertTriangle, RefreshCw, Save, Undo2 } from 'lucide-react'
import { Dialog } from '@/shared/components/ui/dialog'
import type { ConflictChoice, ConflictState } from '../hooks/useActivityCreation'
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
}: {
  conflict: ConflictState | null
  open: boolean
  onResolve: (choice: ConflictChoice) => void
}) {
  if (!conflict) return null

  const clientTitle = 'title' in conflict.clientData ? conflict.clientData.title : undefined

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
            <p>
              Servidor atualizado em <strong>{formatDateTime(conflict.serverData.updatedAt)}</strong>.
            </p>
            <p className="mt-1">Escolha como deseja continuar. Suas mudanças não foram perdidas ainda.</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted">Versão do servidor</p>
            <p className="mt-1 line-clamp-2 text-xs text-ink">{conflict.serverData.title}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted">Sua versão</p>
            <p className="mt-1 line-clamp-2 text-xs text-ink">{clientTitle ?? conflict.serverData.title}</p>
          </div>
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
