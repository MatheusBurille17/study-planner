'use client'

import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Select } from '@/shared/components/ui/select'
import { Dialog } from '@/shared/components/ui/dialog'
import { Spinner } from '@/shared/components/ui/spinner'
import {
  ASSIGNMENT_STATUS_LABELS,
  AssignmentStatus,
  TASK_STATUS_LABELS,
  TaskStatus,
} from '@/shared/types/activity'

interface BulkActionBarProps {
  selectedIds: string[]
  onClear: () => void
  onBulkStatus: (status: string) => Promise<void>
  onBulkDelete: () => Promise<void>
  isBusy?: boolean
}

export function BulkActionBar({ selectedIds, onClear, onBulkStatus, onBulkDelete, isBusy }: BulkActionBarProps) {
  const [status, setStatus] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (selectedIds.length === 0) return null

  return (
    <>
      <div className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-soft backdrop-blur lg:bottom-6">
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-800">
          {selectedIds.length} selecionada{selectedIds.length === 1 ? '' : 's'}
        </span>

        <Select
          aria-label="Alterar status em lote"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-9 w-auto min-w-[150px] flex-1 text-xs"
        >
          <option value="">Alterar status…</option>
          <optgroup label="Tarefas">
            {Object.values(TaskStatus).map((value) => (
              <option key={value} value={value}>
                {TASK_STATUS_LABELS[value]}
              </option>
            ))}
          </optgroup>
          <optgroup label="Trabalhos">
            {Object.values(AssignmentStatus).map((value) => (
              <option key={value} value={value}>
                {ASSIGNMENT_STATUS_LABELS[value]}
              </option>
            ))}
          </optgroup>
        </Select>

        <Button
          size="sm"
          variant="soft"
          disabled={!status || isBusy}
          onClick={async () => {
            if (!status) return
            await onBulkStatus(status)
            setStatus('')
          }}
        >
          {isBusy ? <Spinner /> : null} Aplicar
        </Button>

        <Button size="sm" variant="destructive" onClick={() => setConfirmOpen(true)} disabled={isBusy}>
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </Button>

        <button
          type="button"
          onClick={onClear}
          aria-label="Limpar seleção"
          className="ml-auto rounded-full p-1.5 text-muted hover:bg-line/60 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Excluir atividades selecionadas?">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {selectedIds.length} atividade{selectedIds.length === 1 ? '' : 's'} será
            {selectedIds.length === 1 ? '' : 'ão'} movida{selectedIds.length === 1 ? '' : 's'} para a lixeira e
            poderá{selectedIds.length === 1 ? '' : 'ão'} ser restaurada{selectedIds.length === 1 ? '' : 's'} em até 30 dias.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isBusy}
              onClick={async () => {
                await onBulkDelete()
                setConfirmOpen(false)
              }}
            >
              {isBusy ? <Spinner /> : null} Excluir
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
