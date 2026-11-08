import { z } from 'zod'
import { Priority } from '@/shared/types/activity'

export const SORT_OPTIONS = [
  'date_asc',
  'date_desc',
  'priority_asc',
  'priority_desc',
  'created_asc',
  'created_desc',
  'title_asc',
  'title_desc',
  'status',
] as const

export type SortOption = (typeof SORT_OPTIONS)[number]

const csv = (value: unknown) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return undefined
}

const priorityValue = z.preprocess(
  (value) => (typeof value === 'string' ? value.toUpperCase() : value),
  z.nativeEnum(Priority),
)

export const filterCriteriaSchema = z
  .object({
    search: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
      z.string().max(200, 'Busca deve ter no máximo 200 caracteres').optional(),
    ),
    priorities: z.preprocess(csv, z.array(priorityValue).max(3).optional()),
    subjectIds: z.preprocess(csv, z.array(z.string().uuid('Disciplina inválida')).optional()),
    statuses: z.preprocess(csv, z.array(z.string().max(30)).optional()),
    types: z.preprocess(
      csv,
      z
        .array(
          z.preprocess(
            (value) => (typeof value === 'string' ? value.toLowerCase() : value),
            z.enum(['task', 'exam', 'assignment', 'seminar']),
          ),
        )
        .optional(),
    ),
    dateFrom: z.preprocess(
      (value) => (typeof value === 'string' && value ? value : undefined),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida').optional(),
    ),
    dateTo: z.preprocess(
      (value) => (typeof value === 'string' && value ? value : undefined),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final inválida').optional(),
    ),
    sort: z.enum(SORT_OPTIONS).default('date_asc'),
    page: z.coerce.number().int().min(1, 'Página deve ser >= 1').default(1),
    limit: z.coerce.number().int().min(5, 'Limite mínimo é 5').max(100, 'Limite máximo é 100').default(20),
  })
  .refine((data) => !data.dateFrom || !data.dateTo || data.dateFrom <= data.dateTo, {
    message: 'Data inicial deve ser antes da final',
    path: ['dateTo'],
  })

export type FilterCriteria = z.infer<typeof filterCriteriaSchema>

export const DEFAULT_FILTERS: FilterCriteria = {
  sort: 'date_asc',
  page: 1,
  limit: 20,
}

export function parseFilterCriteria(params: URLSearchParams): FilterCriteria {
  const raw: Record<string, string | undefined> = {}
  const mapping: Record<string, string> = {
    priority: 'priorities',
    subject: 'subjectIds',
    status: 'statuses',
    type: 'types',
    dateFrom: 'dateFrom',
    dateTo: 'dateTo',
    search: 'search',
    sort: 'sort',
    page: 'page',
    limit: 'limit',
  }
  for (const [key, value] of params.entries()) {
    if (!value) continue
    const target = mapping[key]
    if (target) raw[target] = value
  }
  const parsed = filterCriteriaSchema.safeParse(raw)
  return parsed.success ? parsed.data : { ...DEFAULT_FILTERS }
}

export function serializeFilterCriteria(criteria: FilterCriteria): string {
  const params = new URLSearchParams()
  if (criteria.search) params.set('search', criteria.search)
  if (criteria.priorities?.length) {
    params.set('priority', criteria.priorities.map((priority) => priority.toLowerCase()).join(','))
  }
  if (criteria.subjectIds?.length) params.set('subject', criteria.subjectIds.join(','))
  if (criteria.statuses?.length) params.set('status', criteria.statuses.join(','))
  if (criteria.types?.length) params.set('type', criteria.types.join(','))
  if (criteria.dateFrom) params.set('dateFrom', criteria.dateFrom)
  if (criteria.dateTo) params.set('dateTo', criteria.dateTo)
  if (criteria.sort && criteria.sort !== 'date_asc') params.set('sort', criteria.sort)
  if (criteria.page && criteria.page > 1) params.set('page', String(criteria.page))
  if (criteria.limit && criteria.limit !== 20) params.set('limit', String(criteria.limit))
  return params.toString()
}

export type { FilterCriteria as FilterState }
