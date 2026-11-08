'use client'

import { ArrowDownToLine, Share, SquarePlus, X } from 'lucide-react'

export function IOSInstallGuide() {
  return (
    <div className="space-y-3 text-sm text-ink">
      <p className="text-xs text-muted">
        No Safari do iPhone/iPad, siga estes passos para instalar o Study Planner:
      </p>
      <ol className="space-y-3">
        <li className="flex gap-3 rounded-xl border border-line p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <Share className="h-4 w-4" />
          </span>
          <span>
            <strong className="block text-xs">1. Toque em Compartilhar</strong>
            <span className="text-[11px] text-muted">Ícone de quadrado com seta na barra do Safari.</span>
          </span>
        </li>
        <li className="flex gap-3 rounded-xl border border-line p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <SquarePlus className="h-4 w-4" />
          </span>
          <span>
            <strong className="block text-xs">2. Escolha “Adicionar à Tela de Início”</strong>
            <span className="text-[11px] text-muted">Role as opções se necessário.</span>
          </span>
        </li>
        <li className="flex gap-3 rounded-xl border border-line p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <ArrowDownToLine className="h-4 w-4" />
          </span>
          <span>
            <strong className="block text-xs">3. Toque em Adicionar</strong>
            <span className="text-[11px] text-muted">O app abrirá em tela cheia, como um app nativo.</span>
          </span>
        </li>
      </ol>
    </div>
  )
}

export function IOSInstallDismiss({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Fechar instruções"
      className="rounded-full p-1.5 text-muted hover:bg-line/60"
    >
      <X className="h-4 w-4" />
    </button>
  )
}
