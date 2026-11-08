import { toDate } from '@/shared/utils/dateHelpers'

export function asDate(value: unknown): Date | undefined {
  return toDate(value)
}

export { toDate }
