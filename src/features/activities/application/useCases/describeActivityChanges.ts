import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_TYPE_LABELS,
  EXAM_TYPE_LABELS,
  PRIORITY_LABELS,
  REMINDER_TYPE_LABELS,
  TASK_STATUS_LABELS,
  type Activity,
  type ReminderType,
} from '@/shared/types/activity'
import { formatDateShort, formatDateTime, formatTime, toDate } from '@/shared/utils/dateHelpers'
import { formatMinutes } from '@/shared/utils/formatting'

type FieldKind =
  | 'text'
  | 'date'
  | 'dateTime'
  | 'time'
  | 'minutes'
  | 'array'
  | 'reminders'
  | 'subject'
  | 'labels'

interface FieldConfig {
  key: string
  label: string
  kind: FieldKind
  labels?: Record<string, string>
}

export interface ActivityFieldChange {
  field: string
  label: string
  serverValue: string
  clientValue: string
}

const COMMON_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Título', kind: 'text' },
  { key: 'description', label: 'Descrição', kind: 'text' },
  { key: 'subjectId', label: 'Disciplina', kind: 'subject' },
]

const FIELDS_BY_TYPE: Record<string, FieldConfig[]> = {
  task: [
    { key: 'dueDate', label: 'Prazo', kind: 'date' },
    { key: 'dueTime', label: 'Horário do prazo', kind: 'time' },
    { key: 'priority', label: 'Prioridade', kind: 'labels', labels: PRIORITY_LABELS },
    { key: 'status', label: 'Status', kind: 'labels', labels: TASK_STATUS_LABELS },
    { key: 'estimatedTimeMinutes', label: 'Tempo estimado', kind: 'minutes' },
    { key: 'tags', label: 'Tags', kind: 'array' },
    { key: 'reminders', label: 'Lembretes', kind: 'reminders' },
  ],
  exam: [
    { key: 'date', label: 'Data da prova', kind: 'date' },
    { key: 'time', label: 'Horário', kind: 'time' },
    { key: 'examType', label: 'Tipo de prova', kind: 'labels', labels: EXAM_TYPE_LABELS },
    { key: 'content', label: 'Conteúdo', kind: 'array' },
    { key: 'location', label: 'Local', kind: 'text' },
    { key: 'notes', label: 'Observações', kind: 'text' },
    { key: 'reminders', label: 'Lembretes', kind: 'reminders' },
  ],
  assignment: [
    { key: 'dueDate', label: 'Data de entrega', kind: 'date' },
    { key: 'dueTime', label: 'Horário de entrega', kind: 'time' },
    {
      key: 'assignmentType',
      label: 'Tipo de trabalho',
      kind: 'labels',
      labels: ASSIGNMENT_TYPE_LABELS,
    },
    { key: 'criteria', label: 'Critérios', kind: 'text' },
    { key: 'status', label: 'Status', kind: 'labels', labels: ASSIGNMENT_STATUS_LABELS },
    { key: 'submittedAt', label: 'Entregue em', kind: 'dateTime' },
    { key: 'gradedAt', label: 'Avaliado em', kind: 'dateTime' },
    { key: 'reminders', label: 'Lembretes', kind: 'reminders' },
  ],
  seminar: [
    { key: 'date', label: 'Data', kind: 'date' },
    { key: 'time', label: 'Horário', kind: 'time' },
    { key: 'topic', label: 'Tema', kind: 'text' },
    { key: 'location', label: 'Local', kind: 'text' },
    { key: 'format', label: 'Formato', kind: 'labels', labels: { PRESENCIAL: 'Presencial', ONLINE: 'Online' } },
    { key: 'responsible', label: 'Responsável', kind: 'text' },
    { key: 'reminders', label: 'Lembretes', kind: 'reminders' },
  ],
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function normalizeReminders(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .map((item) => {
      const reminder = item as { reminderType?: string; reminderTime?: string }
      return `${reminder.reminderType ?? ''}@${reminder.reminderTime ?? ''}`
    })
    .sort()
    .join('|')
}

function normalizeForCompare(value: unknown, kind: FieldKind): string | number | null {
  if (isEmptyValue(value)) return null
  switch (kind) {
    case 'date':
    case 'dateTime': {
      const date = toDate(value)
      return date ? date.getTime() : null
    }
    case 'time':
      return typeof value === 'string' ? value.trim().slice(0, 5) : null
    case 'reminders':
      return normalizeReminders(value)
    case 'array':
      return Array.isArray(value) ? value.map((item) => String(item).trim()).join('\u0001') : null
    case 'subject':
      return String(value)
    case 'minutes':
      return Number(value)
    default:
      return typeof value === 'string' ? value.trim() : String(value)
  }
}

function formatReminders(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return 'Nenhum'
  return value
    .map((item) => {
      const reminder = item as { reminderType?: ReminderType }
      return reminder.reminderType ? REMINDER_TYPE_LABELS[reminder.reminderType] ?? 'Lembrete' : 'Lembrete'
    })
    .join(', ')
}

function formatValue(
  value: unknown,
  kind: FieldKind,
  options: { subjectNames?: Record<string, string> },
): string {
  if (kind !== 'subject' && isEmptyValue(value)) return '—'
  switch (kind) {
    case 'subject':
      if (isEmptyValue(value)) return 'Sem disciplina'
      return options.subjectNames?.[String(value)] ?? 'Disciplina não identificada'
    case 'date':
      return formatDateShort(value as Date | string | undefined)
    case 'dateTime':
      return formatDateTime(value as Date | string | undefined)
    case 'time':
      return formatTime(value as string | undefined)
    case 'minutes':
      return formatMinutes(Number(value))
    case 'array':
      return Array.isArray(value) ? value.join(', ') : String(value)
    case 'reminders':
      return formatReminders(value)
    case 'labels':
      return ''
    default:
      return String(value)
  }
}

function formatLabels(value: unknown, labels?: Record<string, string>): string {
  if (isEmptyValue(value)) return '—'
  return labels?.[String(value)] ?? String(value)
}

/**
 * Compara a versão do servidor com a versão em edição e descreve apenas os
 * campos que realmente mudaram, já formatados para exibição.
 */
export function describeActivityChanges(
  serverData: Activity,
  clientData: Partial<Activity>,
  options: { subjectNames?: Record<string, string> } = {},
): ActivityFieldChange[] {
  const type = String(serverData.type)
  const fields = [...COMMON_FIELDS, ...(FIELDS_BY_TYPE[type] ?? [])]
  const changes: ActivityFieldChange[] = []

  for (const field of fields) {
    if (!(field.key in clientData)) continue
    const serverValue = (serverData as unknown as Record<string, unknown>)[field.key]
    const clientValue = (clientData as Record<string, unknown>)[field.key]
    if (normalizeForCompare(serverValue, field.kind) === normalizeForCompare(clientValue, field.kind)) {
      continue
    }
    changes.push({
      field: field.key,
      label: field.label,
      serverValue:
        field.kind === 'labels'
          ? formatLabels(serverValue, field.labels)
          : formatValue(serverValue, field.kind, options),
      clientValue:
        field.kind === 'labels'
          ? formatLabels(clientValue, field.labels)
          : formatValue(clientValue, field.kind, options),
    })
  }

  return changes
}
