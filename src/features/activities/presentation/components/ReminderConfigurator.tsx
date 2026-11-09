'use client'

import { useState } from 'react'
import { Bell, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { REMINDER_TYPE_LABELS, ReminderType, type ReminderInput } from '@/shared/types/activity'
import { calculateReminderTimestamp, isCalendarDayReminder } from '../../domain/rules'
import { formatDate } from '@/shared/utils/dateHelpers'
import { cn } from '@/shared/utils/classNames'

interface ReminderConfiguratorProps {
  reminders: ReminderInput[]
  onChange: (reminders: ReminderInput[]) => void
  eventDate?: Date
  /** Indica se o evento tem horário definido (senão usamos 23:59). */
  eventHasTime?: boolean
  maxReminders?: number
  disabled?: boolean
  /** Erro de validação vindo do schema do formulário. */
  error?: string
}

const TYPE_OPTIONS = Object.values(ReminderType)
const DEFAULT_TIME = '09:00'
const DEFAULT_DRAFT: ReminderInput = {
  reminderType: ReminderType.ONE_HOUR_BEFORE,
  reminderTime: DEFAULT_TIME,
}

const UNIT_LABELS: Record<'MINUTES' | 'HOURS' | 'DAYS', string> = {
  MINUTES: 'minutos antes',
  HOURS: 'horas antes',
  DAYS: 'dias antes',
}

function formatPreview(date: Date): string {
  return formatDate(date, "EEE, dd/MM 'às' HH:mm")
}

export function ReminderConfigurator({
  reminders,
  onChange,
  eventDate,
  eventHasTime = false,
  maxReminders = 3,
  disabled,
  error: externalError,
}: ReminderConfiguratorProps) {
  const [enabled, setEnabled] = useState(reminders.length > 0)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<ReminderInput>(DEFAULT_DRAFT)
  const [error, setError] = useState<string | null>(null)

  const canAddMore = reminders.length < maxReminders
  const now = new Date()
  const showTime = isCalendarDayReminder(draft.reminderType, draft.reminderOffset)

  function previewFor(reminder: ReminderInput): Date | null {
    if (!eventDate) return null
    try {
      return calculateReminderTimestamp(
        eventDate,
        reminder.reminderType,
        reminder.reminderTime,
        reminder.reminderOffset,
      )
    } catch {
      return null
    }
  }

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

  function changeType(next: ReminderType) {
    setError(null)
    setDraft((current) => {
      const reminderOffset =
        next === ReminderType.CUSTOM
          ? current.reminderOffset ?? { value: 1, unit: 'HOURS' as const }
          : undefined

      const reminderTime =
        next === ReminderType.ON_DAY
          ? eventHasTime && eventDate
            ? format(eventDate, 'HH:mm')
            : DEFAULT_TIME
          : current.reminderTime || DEFAULT_TIME

      return { ...current, reminderType: next, reminderOffset, reminderTime }
    })
  }

  function addReminder() {
    setError(null)
    if (!eventDate) {
      setError('Defina a data do evento primeiro')
      return
    }
    if (draft.reminderType === ReminderType.CUSTOM && !draft.reminderOffset) {
      setError('Informe a quantidade do lembrete personalizado')
      return
    }

    const timestamp = previewFor(draft)
    if (!timestamp) {
      setError('Não foi possível calcular o horário do lembrete')
      return
    }
    if (timestamp.getTime() >= eventDate.getTime()) {
      setError('Escolha um horário antes do evento')
      return
    }
    if (timestamp.getTime() < now.getTime()) {
      setError('Esse horário já passou. Escolha um horário futuro.')
      return
    }

    const duplicate = reminders.some(
      (reminder) => previewFor(reminder)?.getTime() === timestamp.getTime(),
    )
    if (duplicate) {
      setError('Já existe um lembrete nesse mesmo horário')
      return
    }

    onChange([
      ...reminders,
      {
        ...draft,
        reminderOffset: draft.reminderOffset ? { ...draft.reminderOffset } : undefined,
      },
    ])
    setDraft({ ...DEFAULT_DRAFT })
    setShowForm(false)
    setEnabled(true)
  }

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-primary-50/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Bell className="h-4 w-4 text-primary" /> Lembretes
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Escolha até {maxReminders} avisos. Você receberá uma notificação antes do prazo.
          </p>
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
            <p className="text-xs font-medium text-muted">Avisos configurados</p>
            <span className="text-[11px] text-muted">
              {reminders.length} de {maxReminders}
            </span>
          </div>

          {reminders.length > 0 && (
            <ul className="space-y-2">
              {reminders.map((reminder, index) => {
                const timestamp = previewFor(reminder)
                const past = timestamp ? timestamp.getTime() < now.getTime() : false
                return (
                  <li
                    key={`${reminder.reminderType}-${reminder.reminderTime}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink">
                        {REMINDER_TYPE_LABELS[reminder.reminderType]}
                        {past && <span className="ml-1 text-[10px] font-normal text-muted">(já passou)</span>}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {timestamp ? formatPreview(timestamp) : 'Defina a data para visualizar'}
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
                )
              })}
            </ul>
          )}

          {externalError && <p className="text-[11px] text-[#ef4444]">{externalError}</p>}

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
              <div className={cn('grid gap-3', showTime ? 'sm:grid-cols-2' : 'grid-cols-1')}>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted">Quando avisar?</label>
                  <Select
                    value={draft.reminderType}
                    onChange={(event) => changeType(event.target.value as ReminderType)}
                  >
                    {TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {REMINDER_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                </div>
                {showTime && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted">Horário do aviso</label>
                    <Input
                      type="time"
                      value={draft.reminderTime}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, reminderTime: event.target.value }))
                      }
                    />
                  </div>
                )}
              </div>

              {draft.reminderType === ReminderType.CUSTOM && (
                <div className="grid grid-cols-[1fr_1.3fr] gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted">Quantidade</label>
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
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted">Unidade</label>
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
                      {Object.entries(UNIT_LABELS).map(([unit, label]) => (
                        <option key={unit} value={unit}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}

              {!showTime && (
                <p className="text-[11px] text-muted">
                  O horário é calculado a partir do horário do evento
                  {eventHasTime ? '' : ' (sem horário definido, usamos 23:59)'}.
                </p>
              )}

              <p className={cn('text-[11px]', error ? 'text-[#ef4444]' : 'text-muted')}>
                {error ?? (previewFor(draft) ? `Aviso: ${formatPreview(previewFor(draft)!)}` : 'Defina a data do evento para calcular.')}
              </p>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false)
                    setError(null)
                  }}
                >
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

          {eventDate && !eventHasTime && (
            <p className="text-[11px] text-[#8a6a2f]">
              O evento não tem horário definido; lembretes relativos usam 23:59 como referência.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
