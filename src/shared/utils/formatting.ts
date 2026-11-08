export function truncate(value: string, max = 80): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

export function initialsFromEmail(email: string): string {
  const name = email.split('@')[0] ?? ''
  const parts = name.split(/[._-]/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function firstNameFromEmail(email?: string): string {
  if (!email) return 'Estudante'
  const name = email.split('@')[0] ?? ''
  const first = name.split(/[._-]/)[0] ?? name
  return first.charAt(0).toUpperCase() + first.slice(1)
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function formatMinutes(minutes?: number): string {
  if (!minutes || minutes <= 0) return '—'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}min`
}
