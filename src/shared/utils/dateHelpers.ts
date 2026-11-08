import {
  differenceInCalendarDays,
  format,
  isBefore,
  isSameDay,
  parse,
  startOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isValid,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export { ptBR }

export function toDate(value: unknown): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return isValid(value) ? value : undefined
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return isValid(date) ? date : undefined
  }
  return undefined
}

export function formatDate(value: Date | string | undefined, pattern = "dd 'de' MMMM"): string {
  const date = toDate(value)
  if (!date) return '—'
  return format(date, pattern, { locale: ptBR })
}

export function formatDateShort(value: Date | string | undefined): string {
  return formatDate(value, 'dd/MM/yyyy')
}

export function formatDateTime(value: Date | string | undefined): string {
  return formatDate(value, "dd/MM 'às' HH:mm")
}

export function formatMonthYear(value: Date | string | undefined): string {
  return formatDate(value, "MMMM 'de' yyyy")
}

export function formatWeekday(value: Date | string | undefined): string {
  return formatDate(value, 'EEEE')
}

export function formatTime(value: string | undefined): string {
  if (!value) return '—'
  return value.slice(0, 5)
}

export function toISODate(value: Date | string | undefined): string {
  const date = toDate(value)
  if (!date) return ''
  return format(date, 'yyyy-MM-dd')
}

export function parseISODate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const date = parse(value, 'yyyy-MM-dd', new Date())
  return isValid(date) ? date : undefined
}

export function combineDateAndTime(date: Date, time?: string): Date {
  if (!time) return date
  const [hours, minutes] = time.split(':').map(Number)
  const result = new Date(date)
  result.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0)
  return result
}

export function getDaysRemaining(value: Date | string | undefined): number | null {
  const date = toDate(value)
  if (!date) return null
  return differenceInCalendarDays(startOfDay(date), startOfDay(new Date()))
}

export function isOverdue(value: Date | string | undefined): boolean {
  const date = toDate(value)
  if (!date) return false
  return isBefore(date, startOfDay(new Date()))
}

export function isToday(value: Date | string | undefined): boolean {
  const date = toDate(value)
  return date ? isSameDay(date, new Date()) : false
}

export function isTomorrow(value: Date | string | undefined): boolean {
  const date = toDate(value)
  return date ? isSameDay(date, addDays(new Date(), 1)) : false
}

export function relativeDayLabel(value: Date | string | undefined): string {
  const days = getDaysRemaining(value)
  if (days === null) return 'Sem prazo'
  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'} atrás`
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  return `Em ${days} dias`
}

export function getWeekDays(reference: Date): Date[] {
  const start = startOfWeek(reference, { weekStartsOn: 0 })
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function getMonthGrid(reference: Date): Date[] {
  const start = startOfWeek(startOfMonth(reference), { weekStartsOn: 0 })
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

/** Marca urgência: <= 2 dias = alta, <= 7 = média. */
export function urgencyLevel(value: Date | string | undefined): 'high' | 'medium' | 'low' {
  const days = getDaysRemaining(value)
  if (days === null) return 'low'
  if (days <= 2) return 'high'
  if (days <= 7) return 'medium'
  return 'low'
}
