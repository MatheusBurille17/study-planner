'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw, WifiOff, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useConnectivity } from '@/shared/hooks/useConnectivity'
import { offlineManager } from '@/shared/lib/offline/offlineManager'
import { cn } from '@/shared/utils/classNames'

export function OfflineIndicator({
  lastUpdated,
  className,
}: {
  lastUpdated?: Date
  className?: string
}) {
  const { isOnline, pendingChanges, syncState, lastSyncAt } = useConnectivity()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(false)
  }, [isOnline])

  if (dismissed) return null
  if (isOnline && syncState === 'idle') return null

  const isOffline = !isOnline
  const detail = isOffline
    ? pendingChanges > 0
      ? `Você tem ${pendingChanges} ${pendingChanges === 1 ? 'alteração pendente' : 'alterações pendentes'}.`
      : lastUpdated
        ? `Atualizado ${formatDistanceToNow(lastUpdated, { addSuffix: true, locale: ptBR })}.`
        : 'Exibindo dados salvos localmente.'
    : syncState === 'syncing'
      ? 'Sincronizando suas alterações…'
      : syncState === 'failed'
        ? 'Algumas alterações não puderam ser sincronizadas.'
        : lastSyncAt
          ? `Tudo sincronizado ${formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true, locale: ptBR })}.`
          : 'Tudo sincronizado.'

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'mb-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-[11px]',
        isOffline && 'border-butter bg-butter/30 text-[#7a6422]',
        !isOffline && syncState === 'syncing' && 'border-sky/60 bg-sky/20 text-[#315a7d]',
        !isOffline && syncState === 'synced' && 'border-sage/60 bg-sage/20 text-[#3c6b4d]',
        !isOffline && syncState === 'failed' && 'border-[#ef4444]/30 bg-[#ef4444]/5 text-[#b91c1c]',
        className,
      )}
    >
      {isOffline ? (
        <WifiOff className="h-3.5 w-3.5" />
      ) : syncState === 'syncing' ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : syncState === 'failed' ? (
        <WifiOff className="h-3.5 w-3.5" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}

      <span className="flex-1">
        <strong className="font-semibold">{isOffline ? 'Offline' : syncState === 'syncing' ? 'Sincronizando' : syncState === 'failed' ? 'Falha na sincronização' : 'Online'}</strong>
        {' · '}
        {detail}
      </span>

      {isOffline && pendingChanges > 0 && (
        <span className="rounded-full bg-white/60 px-2 py-0.5 font-medium">{pendingChanges} na fila</span>
      )}

      {isOnline && syncState === 'failed' && (
        <button
          type="button"
          onClick={() => void offlineManager.sync()}
          className="rounded-full bg-[#ef4444] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#dc2626]"
        >
          Tentar de novo
        </button>
      )}

      {isOffline && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Ocultar aviso offline"
          className="rounded-full p-1 hover:bg-white/50"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
