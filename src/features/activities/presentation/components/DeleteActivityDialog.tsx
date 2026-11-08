'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Dialog } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Spinner } from '@/shared/components/ui/spinner'
import { useToast } from '@/shared/components/ui/toast'
import { useIsOnline } from '@/shared/hooks/useIsOnline'
import type { Activity } from '@/shared/types/activity'
import { deleteActivityAction } from '../actions/deleteActivity'
import { addToQueue } from '../../infrastructure/offlineQueue'

export function DeleteActivityDialog({
  activity,
  open,
  onOpenChange,
}: {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const toast = useToast()
  const isOnline = useIsOnline()

  async function confirm() {
    if (!activity) return
    if (!isOnline) {
      await addToQueue('DELETE', activity.id, { activityId: activity.id })
      toast.success('Exclusão salva localmente', {
        description: 'A atividade será movida para a lixeira ao reconectar.',
      })
      onOpenChange(false)
      return
    }
    setIsDeleting(true)
    const result = await deleteActivityAction(activity.id)
    setIsDeleting(false)
    if (!result.success) {
      toast.error('Não foi possível excluir', { description: result.error?.message })
      return
    }
    toast.success('Atividade movida para a lixeira', {
      description: 'Você pode restaurá-la em até 30 dias.',
    })
    onOpenChange(false)
    window.dispatchEvent(new CustomEvent('activity:changed'))
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Excluir atividade?">
      <div className="space-y-4">
        <div className="flex gap-3 rounded-2xl bg-rose/20 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#8a3d52]" />
          <p className="text-sm text-[#6d3042]">
            A atividade <strong className="font-semibold">{activity?.title}</strong> será removida de todas as
            visualizações. Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Spinner /> Excluindo…
              </>
            ) : (
              'Excluir'
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
