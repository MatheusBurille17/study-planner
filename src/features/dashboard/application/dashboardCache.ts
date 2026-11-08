import type { DashboardData } from './getDashboardSummary'

const TTL_MS = 60_000
const MAX_ENTRIES = 50

interface CacheEntry {
  data: DashboardData
  expiresAt: number
}

/**
 * Cache em memória do resumo do dashboard, por usuário.
 *
 * Evita refazer as consultas a cada navegação/refresh: o banco só é lido
 * quando o cache expira (60s) ou é invalidado por uma mutation.
 *
 * Guardamos os objetos já tipados (com `Date`), por isso não usamos
 * `unstable_cache`: ele serializa o retorno e as datas virariam string.
 */
const cache = new Map<string, CacheEntry>()

export function readDashboardCache(userId: string): DashboardData | null {
  const entry = cache.get(userId)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(userId)
    return null
  }
  return entry.data
}

export function writeDashboardCache(userId: string, data: DashboardData): DashboardData {
  if (!cache.has(userId) && cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(userId, { data, expiresAt: Date.now() + TTL_MS })
  return data
}

/**
 * Invalida o cache após criar/editar/excluir atividades ou disciplinas.
 * Chamado pelos repositórios para que o dashboard reflita a mudança na hora.
 */
export function invalidateDashboardCache(userId?: string): void {
  if (userId) {
    cache.delete(userId)
    return
  }
  cache.clear()
}
