'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/shared/components/ui/toast'
import { useIsOnline } from '@/shared/hooks/useIsOnline'
import type { CreateActivityDTO } from '../../application/dto/CreateActivityDTO'
import type { Activity, CreateActivityResult } from '@/shared/types/activity'
import type { UpdateActivityInput } from '../schemas/updateActivitySchema'
import { createActivityAction } from '../actions/createActivity'
import { updateActivityAction } from '../actions/updateActivity'
import { saveActivityOffline } from '../lib/offlineSync'
import { addToQueue } from '../../infrastructure/offlineQueue'

interface SubmitMeta {
  title: string
  type: string
}

export interface ConflictState {
  serverData: Activity
  clientData: Partial<Activity>
}

export type ConflictChoice = 'reload' | 'discard' | 'keep-local'

/** Orquestra submissão online/offline, conflitos e feedback visual. */
export function useActivityCreation() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ConflictState | null>(null)
  const router = useRouter()
  const toast = useToast()
  const isOnline = useIsOnline()

  async function submit(payload: CreateActivityDTO, meta: SubmitMeta): Promise<CreateActivityResult> {
    setServerError(null)

    if (!isOnline) {
      const saved = await saveActivityOffline({ payload, title: meta.title, type: meta.type })
      if (saved) {
        toast.success('Salvo localmente', {
          description: 'Você está offline. A atividade será sincronizada ao conectar.',
          duration: 5000,
        })
        window.dispatchEvent(new CustomEvent('activity:changed'))
        router.push('/activities?offline=1')
        router.refresh()
        return { success: true }
      }
      setServerError('Não foi possível salvar offline neste navegador')
      return { success: false, error: { code: 'OFFLINE_SAVE_FAILED', message: 'Não foi possível salvar offline' } }
    }

    setIsSubmitting(true)
    const result = await createActivityAction(payload)
    setIsSubmitting(false)

    if (!result.success) {
      setServerError(result.error?.message ?? 'Erro ao criar atividade')
      toast.error('Não foi possível salvar', { description: result.error?.message })
      return result
    }

    toast.success('Atividade criada com sucesso', {
      description: meta.title,
      actions: [
        { label: 'Abrir', onClick: () => router.push(`/activities/${result.activity?.id ?? ''}`) },
        { label: 'Nova', onClick: () => router.push('/activities/new') },
      ],
    })

    window.dispatchEvent(new CustomEvent('activity:changed'))
    router.push('/activities')
    router.refresh()
    return result
  }

  async function update(
    payload: CreateActivityDTO & { id: string; expectedUpdatedAt?: string },
    meta: SubmitMeta,
  ): Promise<CreateActivityResult> {
    setServerError(null)

    if (!isOnline) {
      await addToQueue('UPDATE', payload.id, payload as unknown as UpdateActivityInput)
      toast.success('Edição salva localmente', {
        description: 'Será sincronizada quando a conexão voltar.',
      })
      router.push(`/activities/${payload.id}`)
      router.refresh()
      return { success: true }
    }

    setIsSubmitting(true)
    const result = await updateActivityAction(payload)
    setIsSubmitting(false)

    if (!result.success) {
      if (result.error?.code === 'CONFLICT' && result.error.serverData) {
        setConflict({
          serverData: result.error.serverData,
          clientData: (result.error.clientData ?? payload) as Partial<Activity>,
        })
        return result
      }
      setServerError(result.error?.message ?? 'Erro ao atualizar atividade')
      toast.error('Não foi possível atualizar', { description: result.error?.message })
      return result
    }

    toast.success('Atividade atualizada', { description: meta.title })
    window.dispatchEvent(new CustomEvent('activity:changed'))
    router.push(`/activities/${payload.id}`)
    router.refresh()
    return result
  }

  async function resolveConflict(choice: ConflictChoice): Promise<void> {
    if (!conflict) return
    const { serverData, clientData } = conflict
    setConflict(null)

    if (choice === 'reload') {
      router.refresh()
      window.location.reload()
      return
    }
    if (choice === 'discard') {
      toast.info('Alterações descartadas', { description: 'A versão mais recente foi mantida.' })
      router.push(`/activities/${serverData.id}`)
      router.refresh()
      return
    }

    setIsSubmitting(true)
    const result = await updateActivityAction({
      ...(clientData as CreateActivityDTO),
      id: serverData.id,
      expectedUpdatedAt: serverData.updatedAt.toISOString(),
    })
    setIsSubmitting(false)
    if (!result.success) {
      toast.error('Ainda há conflito', { description: result.error?.message })
      return
    }
    toast.success('Alterações mantidas')
    router.push(`/activities/${serverData.id}`)
    router.refresh()
  }

  return { submit, update, resolveConflict, conflict, isSubmitting, serverError, isOnline, setServerError }
}
