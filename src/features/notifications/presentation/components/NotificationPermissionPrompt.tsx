'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useToast } from '@/shared/components/ui/toast'
import { useNotificationPermission } from '../hooks/useNotificationPermission'
import { subscribeBrowserToPush } from '../lib/pushSubscription'

const STORAGE_SEEN = 'hasSeenNotificationPrompt'
const STORAGE_CHOICE = 'notificationChoice'
const STORAGE_NEXT_ASK = 'notificationNextAsk'

export function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const { permission, requestPermission, isSupported } = useNotificationPermission()
  const toast = useToast()

  useEffect(() => {
    if (!isSupported || permission !== 'default') {
      setVisible(false)
      return
    }
    const choice = window.localStorage.getItem(STORAGE_CHOICE)
    if (choice === 'never') {
      setVisible(false)
      return
    }
    const nextAsk = Number(window.localStorage.getItem(STORAGE_NEXT_ASK) ?? 0)
    if (nextAsk && nextAsk > Date.now()) {
      setVisible(false)
      return
    }
    setVisible(true)
  }, [permission, isSupported])

  async function allow() {
    setRequesting(true)
    const result = await requestPermission()
    if (result === 'granted') {
      const subscription = await subscribeBrowserToPush()
      window.localStorage.setItem(STORAGE_SEEN, 'true')
      window.localStorage.setItem(STORAGE_CHOICE, 'granted')
      if (subscription.success) {
        toast.success(
          subscription.simulated ? 'Notificações ativadas (modo demo)' : 'Notificações ativadas',
          { description: subscription.simulated ? subscription.error : 'Você receberá lembretes neste dispositivo.' },
        )
      } else {
        toast.info('Permissão concedida', { description: subscription.error })
      }
      window.dispatchEvent(new CustomEvent('notifications:changed'))
    } else {
      toast.error('Permissão não concedida', {
        description: 'Você pode ativar depois em Configurações → Notificações.',
      })
    }
    setRequesting(false)
    setVisible(false)
  }

  function askLater() {
    const next = Date.now() + 7 * 24 * 60 * 60 * 1000
    window.localStorage.setItem(STORAGE_SEEN, 'true')
    window.localStorage.setItem(STORAGE_CHOICE, 'later')
    window.localStorage.setItem(STORAGE_NEXT_ASK, String(next))
    setVisible(false)
  }

  function never() {
    window.localStorage.setItem(STORAGE_SEEN, 'true')
    window.localStorage.setItem(STORAGE_CHOICE, 'never')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <section
      aria-label="Ativar notificações"
      className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-butter bg-butter/30 p-4"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-butter/70 text-[#7a6422]">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Não perca nenhum prazo</p>
        <p className="text-xs text-muted">
          Ative notificações para receber lembretes de provas, entregas e tarefas.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={never} disabled={requesting}>
          Nunca
        </Button>
        <Button size="sm" variant="outline" onClick={askLater} disabled={requesting}>
          Agora não
        </Button>
        <Button size="sm" onClick={allow} disabled={requesting}>
          <Bell className="h-3.5 w-3.5" /> {requesting ? 'Ativando…' : 'Permitir'}
        </Button>
      </div>
    </section>
  )
}
