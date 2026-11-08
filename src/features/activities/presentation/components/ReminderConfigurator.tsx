'use client'

import { useState } from 'react'
import { Bell, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { REMINDER_TYPE_LABELS, ReminderType, type ReminderInput } from '@/shared/types/activity'
import { calculateReminderTimestamp } from '../../domain/rules'
import { formatDate } from '@/shared/utils/dateHelpers'
import { cn } from '@/shared/utils/classNames'

interface ReminderConfiguratorProps {
  reminders: ReminderInput[]
  onChange: (reminders: ReminderInput[]) => void
  eventDate?: Date
  maxReminders?: number
  disabled?: boolean
}

const TYPE_OPTIONS = Object.values(ReminderType)

const DEFAULT_DRAFT: ReminderInput = {
  reminderType: ReminderType.ONE_HOUR_BEFORE,
  reminderTime: '09:00',
}

export function ReminderConfigurator({
  reminders,
  onChange,
  eventDate,
  maxReminders = 3,
  disabled,
}: ReminderConfiguratorProps) {
  const [enabled, setEnabled] = useState(reminders.length > 0)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<ReminderInput>(DEFAULT_DRAFT)
  const [error, setError] = useState<string | null>(null)

  const canAddMore = reminders.length < maxReminders

  function toggleEnabled(next: boolean) {
    setEnabled(next)
    if (!next) {
      onChange([])
      setShowForm(false)
      setError(null)
    } else {
      setShowForm(true)
    }
  }

  function addReminder() {
    setError(null)
    if (!eventDate) {
      setError('Defina a data da atividade primeiro')
      return
    }
    if (!draft.reminderTime) {
      setError('Informe a hora do lembrete')
      return
    }
    if (draft.reminderType === ReminderType.CUSTOM && !draft.reminderOffset) {
      setError('Informe o offset do lembrete personalizado')
      return
    }

    const timestamp = calculateReminderTimestamp(
      eventDate,
      draft.reminderType,
      draft.reminderTime,
      draft.reminderOffset,
    )
    if (timestamp.getTime() >= eventDate.getTime()) {
      setError('O lembrete deve ser anterior ao evento')
      return
    }
    if (timestamp.getTime() < Date.now()) {
      setError('O lembrete não pode estar no passado')
      return
    }
    const duplicate = reminders.some(
      (reminder) =>
        calculateReminderTimestamp(
          eventDate,
          reminder.reminderType,
          reminder.reminderTime,
          reminder.reminderOffset,
        ).getTime() === timestamp.getTime(),
    )
    if (duplicate) {
      setError('Este lembrete já foi adicionado')
      return
    }

    onChange([...reminders, draft])
    setDraft(DEFAULT_DRAFT)
    setShowForm(false)
    setEnabled(true)
  }

  function getPreview(reminder: ReminderInput): string | null {
    if (!eventDate) return null
    const timestamp = calculateReminderTimestamp(
      eventDate,
      reminder.reminderType,
      reminder.reminderTime,
      reminder.reminderOffset,
    )
    return formatDate(timestamp, "dd 'de' MMMM 'às' HH:mm")
  }

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-primary-50/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Bell className="h-4 w-4 text-primary" /> Lembretes
          </p>
          <p className="mt-0.5 text-xs text-muted">Você receberá uma notificação antes do prazo.</p>
        </div>
        <Checkbox
          checked={enabled}
          disabled={disabled}
          onChange={(event) => toggleEnabled(event.target.checked)}
          aria-label="Receber lembrete"
        />
      </div>

      {enabled && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted">Receber lembrete?</p>
            <span className="text-[11px] text-muted">
              {reminders.length}/{maxReminders} lembretes
            </span>
          </div>

          {reminders.length > 0 && (
            <ul className="space-y-2">
              {reminders.map((reminder, index) => (
                <li
                  key={`${reminder.reminderType}-${reminder.reminderTime}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink">{REMINDER_TYPE_LABELS[reminder.reminderType]}</p>
                    <p className="truncate text-[11px] text-muted">
                      {getPreview(reminder) ?? 'Defina a data para visualizar'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange(reminders.filter((_, itemIndex) => itemIndex !== index))}
                    className="rounded-full p-1.5 text-muted transition-colors hover:bg-rose/20 hover:text-[#8a3d52]"
                    aria-label="Remover lembrete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!showForm && canAddMore && (
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Adicionar lembrete
            </Button>
          )}

          {!canAddMore && (
            <p className="rounded-xl bg-butter/30 px-3 py-2 text-[11px] text-[#7a6422]">
              Limite de {maxReminders} lembretes atingido.
            </p>
          )}

          {showForm && (
            <div className="space-y-3 rounded-xl border border-line bg-surface p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted">Quando?</label>
                  <Select
                    value={draft.reminderType}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        reminderType: event.target.value as ReminderType,
                      }))
                    }
                  >
                    {TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {REMINDER_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted">Que horas?</label>
                  <Input
                    type="time"
                    value={draft.reminderTime}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, reminderTime: event.target.value }))
                    }
                  />
                </div>
              </div>

              {draft.reminderType === ReminderType.CUSTOM && (
                <div className="grid grid-cols-[1fr_1.3fr] gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    placeholder="Qtd."
                    value={draft.reminderOffset?.value ?? ''}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        reminderOffset: {
                          value: Number(event.target.value),
                          unit: current.reminderOffset?.unit ?? 'HOURS',
                        },
                      }))
                    }
                  />
                  <Select
                    value={draft.reminderOffset?.unit ?? 'HOURS'}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        reminderOffset: {
                          value: current.reminderOffset?.value ?? 1,
                          unit: event.target.value as 'MINUTES' | 'HOURS' | 'DAYS',
                        },
                      }))
                    }
                  >
                    <option value="MINUTES">Minutos</option>
                    <option value="HOURS">Horas</option>
                    <option value="DAYS">Dias</option>
                  </Select>
                </div>
              )}

              <p className={cn('text-[11px]', error ? 'text-[#ef4444]' : 'text-muted')}>
                {error ?? getPreview(draft) ?? 'Defina a data da atividade para ver o horário do lembrete.'}
              </p>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="button" size="sm" onClick={addReminder}>
                  Adicionar
                </Button>
              </div>
            </div>
          )}

          {!eventDate && (
            <p className="text-[11px] text-[#8a6a2f]">Defina a data da atividade para calcular os lembretes.</p>
          )}
        </div>
      )}
    </div>
  )
}
