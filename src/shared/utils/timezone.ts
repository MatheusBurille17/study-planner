/**
 * Utilidades de data "de parede" (wall clock) com fuso horário explícito.
 *
 * O app guarda prazos como data de calendário (sem hora). Para calcular
 * lembretes precisamos combinar essa data com um horário no fuso do usuário,
 * mesmo quando o cálculo roda em um servidor em UTC.
 */

export interface ZonedDateTimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Fuso IANA válido ou undefined (evita RangeError do Intl). */
export function normalizeTimeZone(timeZone?: string): string | undefined {
  if (!timeZone) return undefined
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return timeZone
  } catch {
    return undefined
  }
}

/** Fuso do navegador (ou undefined no servidor sem configuração). */
export function getUserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}

/**
 * Componentes da data/hora em um fuso. Sem fuso explícito usa o fuso local
 * do processo (comportamento do navegador).
 */
export function getZonedDateTimeParts(date: Date, timeZone?: string): ZonedDateTimeParts {
  const tz = normalizeTimeZone(timeZone)
  if (!tz) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    }
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

/** Offset (em ms) do fuso naquele instante. */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedDateTimeParts(date, timeZone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  const actual = Math.floor(date.getTime() / 1000) * 1000
  return asUtc - actual
}

/** Converte componentes de data/hora "de parede" para o instante UTC. */
export function zonedDateTimeToDate(parts: ZonedDateTimeParts, timeZone?: string): Date {
  const tz = normalizeTimeZone(timeZone)
  if (!tz) {
    return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0)
  }

  let timestamp = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0)
  // Duas iterações cobrem transições de horário de verão.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const offset = getTimeZoneOffsetMs(new Date(timestamp), tz)
    const next =
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0) - offset
    if (next === timestamp) break
    timestamp = next
  }
  return new Date(timestamp)
}

/**
 * Combina uma data de calendário com um horário no fuso informado.
 * Sem horário, usa `defaultTime` (fim do dia por padrão).
 */
export function combineDateAndTimeInTimeZone(
  date: Date,
  time?: string,
  timeZone?: string,
  defaultTime = '23:59',
): Date {
  const tz = normalizeTimeZone(timeZone)
  const dateParts = getZonedDateTimeParts(date, tz)
  const [hours, minutes] = (time || defaultTime).split(':').map(Number)
  return zonedDateTimeToDate(
    {
      year: dateParts.year,
      month: dateParts.month,
      day: dateParts.day,
      hour: Number.isFinite(hours) ? Math.min(23, Math.max(0, hours)) : 23,
      minute: Number.isFinite(minutes) ? Math.min(59, Math.max(0, minutes)) : 59,
      second: 0,
    },
    tz,
  )
}

/**
 * Soma/subtrai dias de calendário mantendo o horário escolhido no fuso.
 * A aritmética é feita em UTC (12:00) para não sofrer com DST.
 */
export function addCalendarDaysAtTime(
  date: Date,
  days: number,
  time: string,
  timeZone?: string,
): Date {
  const tz = normalizeTimeZone(timeZone)
  const parts = getZonedDateTimeParts(date, tz)
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0))
  const [hours, minutes] = time.split(':').map(Number)
  return zonedDateTimeToDate(
    {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: Number.isFinite(hours) ? Math.min(23, Math.max(0, hours)) : 0,
      minute: Number.isFinite(minutes) ? Math.min(59, Math.max(0, minutes)) : 0,
      second: 0,
    },
    tz,
  )
}

/** HH:mm de um instante no fuso informado. */
export function formatTimeInTimeZone(date: Date, timeZone?: string): string {
  const parts = getZonedDateTimeParts(date, normalizeTimeZone(timeZone))
  return `${pad(parts.hour)}:${pad(parts.minute)}`
}
