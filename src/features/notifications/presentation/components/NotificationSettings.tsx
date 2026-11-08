'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellOff, Send, ShieldCheck, Smartphone, Volume2 } from 'lucide-react'
import type { NotificationPreferences, PushSubscriptionRecord } from '@/shared/types/notification'
import { Button } from '@/shared/components/ui/button'
import { Dialog } from '@/shared/components/ui/dialog'
import { Spinner } from '@/shared/components/ui/spinner'
import { useToast } from '@/shared/components/ui/toast'
import { formatDateTime } from '@/shared/utils/dateHelpers'
import { describePreferences } from '../../domain/rules'
import {
  sendTestNotificationAction,
  unsubscribeFromNotifications,
  updateNotificationPreferences,
} from '../actions/notificationActions'
import { subscribeBrowserToPush, unsubscribeBrowserPush } from '../lib/pushSubscription'
import { useNotificationPermission } from '../hooks/useNotificationPermission'
import { Switch } from './Switch'

export function NotificationSettings({
  initialPreferences,
  initialSubscriptions,
}: {
  initialPreferences: NotificationPreferences
  initialSubscriptions: PushSubscriptionRecord[]
}) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [subscribing, setSubscribing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const { permission, isSupported } = useNotificationPermission()
  const router = useRouter()
  const toast = useToast()

  const hasSubscription = initialSubscriptions.length > 0
  const vapidConfigured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)

  async function update(partial: Partial<NotificationPreferences>) {
    const previous = preferences
    setPreferences((current) => ({ ...current, ...partial, updatedAt: new Date() }))
    const result = await updateNotificationPreferences(partial)
    if (!result.success) {
      setPreferences(previous)
      toast.error('Não foi possível salvar', { description: result.error?.message })
      return
    }
    if (result.data) setPreferences(result.data)
  }

  async function activate() {
    setSubscribing(true)
    const result = await subscribeBrowserToPush()
    setSubscribing(false)
    if (!result.success) {
      toast.error('Não foi possível ativar', { description: result.error })
      return
    }
    if (result.simulated) {
      toast.success('Ativação simulada', {
        description: 'Configure as chaves VAPID para receber notificações reais.',
      })
    } else {
      toast.success('Notificações ativadas neste dispositivo')
    }
    router.refresh()
  }

  async function disable() {
    setDisabling(true)
    await unsubscribeFromNotifications()
    await unsubscribeBrowserPush()
    setDisabling(false)
    setConfirmDisable(false)
    toast.success('Notificações desativadas')
    router.refresh()
  }

  async function sendTest() {
    setTesting(true)
    const result = await sendTestNotificationAction()
    setTesting(false)
    if (!result.success) {
      toast.error('Não foi possível enviar', { description: result.error?.message })
      return
    }
    toast.success(result.message ?? 'Notificação de teste enviada')
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-xl text-ink">
              <Bell className="h-4.5 w-4.5 text-primary" /> Status das notificações
            </h2>
            <p className="mt-1 text-xs text-muted">
              Permissão do navegador:{' '}
              <strong className="text-ink">
                {!isSupported
                  ? 'Não suportado'
                  : permission === 'granted'
                    ? 'Permitida'
                    : permission === 'denied'
                      ? 'Bloqueada'
                      : 'Não solicitada'}
              </strong>
              {hasSubscription ? ' · dispositivo inscrito' : ' · nenhum dispositivo inscrito'}
            </p>
          </div>
          {permission === 'granted' && hasSubscription ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/30 px-3 py-1 text-[11px] text-[#3c6b4d]">
              <ShieldCheck className="h-3.5 w-3.5" /> Ativo
            </span>
          ) : (
            <Button size="sm" onClick={activate} disabled={subscribing || !isSupported}>
              {subscribing ? <Spinner /> : <Bell className="h-3.5 w-3.5" />} Ativar neste dispositivo
            </Button>
          )}
        </div>

        {!vapidConfigured && (
          <p className="mt-3 rounded-xl bg-butter/30 px-3 py-2 text-[11px] text-[#7a6422]">
            Modo demonstração: as notificações push são simuladas. Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY e
            VAPID_PRIVATE_KEY para envio real.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
        <h2 className="font-serif text-xl text-ink">O que você quer receber</h2>
        <div className="mt-2 divide-y divide-line">
          <Switch
            label="Lembretes ativados"
            description="Chave geral de todos os lembretes"
            checked={preferences.remindersEnabled}
            onChange={(checked) => void update({ remindersEnabled: checked })}
          />
          <Switch
            label="Provas"
            description="24 horas antes da prova"
            checked={preferences.examsEnabled}
            onChange={(checked) => void update({ examsEnabled: checked })}
            disabled={!preferences.remindersEnabled}
          />
          <Switch
            label="Entregas de trabalhos"
            description="24 horas antes do prazo"
            checked={preferences.assignmentsEnabled}
            onChange={(checked) => void update({ assignmentsEnabled: checked })}
            disabled={!preferences.remindersEnabled}
          />
          <Switch
            label="Tarefas"
            description="Algumas horas antes do prazo"
            checked={preferences.tasksEnabled}
            onChange={(checked) => void update({ tasksEnabled: checked })}
            disabled={!preferences.remindersEnabled}
          />
          <Switch
            label="Som"
            description="Tocar som ao receber"
            checked={preferences.soundEnabled}
            onChange={(checked) => void update({ soundEnabled: checked })}
          />
          <Switch
            label="Vibração"
            description="Vibrar em dispositivos compatíveis"
            checked={preferences.vibrationEnabled}
            onChange={(checked) => void update({ vibrationEnabled: checked })}
          />
        </div>

        <div className="mt-4 space-y-4 rounded-2xl bg-primary-50/40 p-4">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="taskHours" className="text-sm text-ink">
                Antecedência para tarefas
              </label>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-primary">
                {preferences.taskRemindersHours}h
              </span>
            </div>
            <input
              id="taskHours"
              type="range"
              min={0}
              max={6}
              step={1}
              value={preferences.taskRemindersHours}
              onChange={(event) => void update({ taskRemindersHours: Number(event.target.value) })}
              disabled={!preferences.remindersEnabled}
              className="mt-2 w-full accent-[#7c3aed]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="quietStart" className="text-[11px] font-medium text-muted">
                Silêncio a partir de
              </label>
              <input
                id="quietStart"
                type="time"
                value={preferences.quietHoursStart ?? '22:00'}
                onChange={(event) => void update({ quietHoursStart: event.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="quietEnd" className="text-[11px] font-medium text-muted">
                Silêncio até
              </label>
              <input
                id="quietEnd"
                type="time"
                value={preferences.quietHoursEnd ?? '07:00'}
                onChange={(event) => void update({ quietHoursEnd: event.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-line/30 px-3 py-2.5 text-[11px] text-muted">
          <Volume2 className="mr-1 inline h-3.5 w-3.5" />
          {describePreferences(preferences)}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-serif text-xl text-ink">
          <Smartphone className="h-4.5 w-4.5 text-primary" /> Dispositivos inscritos
        </h2>
        {initialSubscriptions.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-line px-4 py-5 text-center text-xs text-muted">
            Nenhum dispositivo inscrito. Ative as notificações acima.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {initialSubscriptions.map((subscription) => (
              <li key={subscription.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs text-ink">{subscription.deviceInfo ?? 'Dispositivo'}</p>
                  <p className="text-[10px] text-muted">Inscrito em {formatDateTime(subscription.createdAt)}</p>
                </div>
                <span className="rounded-full bg-sage/30 px-2 py-0.5 text-[10px] text-[#3c6b4d]">Ativo</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="soft" size="sm" onClick={() => void sendTest()} disabled={testing}>
            {testing ? <Spinner /> : <Send className="h-3.5 w-3.5" />} Enviar notificação de teste
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmDisable(true)}>
            <BellOff className="h-3.5 w-3.5" /> Desabilitar notificações
          </Button>
        </div>
      </section>

      <Dialog open={confirmDisable} onOpenChange={setConfirmDisable} title="Desabilitar notificações?">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Todos os dispositivos serão desinscritos. Você poderá ativar novamente quando quiser.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDisable(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void disable()} disabled={disabling}>
              {disabling ? <Spinner /> : null} Desabilitar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
