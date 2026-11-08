'use client'

import { BookOpen, CheckCircle2, FileText } from 'lucide-react'
import { Dialog } from '@/shared/components/ui/dialog'
import type { ActivityType } from '@/shared/types/activity'
import { cn } from '@/shared/utils/classNames'

interface ActivityTypeSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectType: (type: 'task' | 'exam' | 'assignment') => void
}

const OPTIONS = [
  {
    type: 'task' as const,
    title: 'Tarefa',
    description: 'Estudar, revisar, resolver exercícios',
    icon: CheckCircle2,
    className: 'bg-sky/30 text-[#315a7d] group-hover:bg-sky/50',
  },
  {
    type: 'exam' as const,
    title: 'Prova',
    description: 'Avaliação com data e conteúdo',
    icon: FileText,
    className: 'bg-rose/30 text-[#8a3d52] group-hover:bg-rose/50',
  },
  {
    type: 'assignment' as const,
    title: 'Trabalho',
    description: 'Entrega com critérios e prazo',
    icon: BookOpen,
    className: 'bg-sage/30 text-[#3c6b4d] group-hover:bg-sage/50',
  },
]

/** Modal de seleção do tipo de atividade (Tarefa, Prova, Trabalho). */
export function ActivityTypeSelector({ open, onOpenChange, onSelectType }: ActivityTypeSelectorProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nova atividade"
      description="O que você quer organizar hoje?"
    >
      <div className="grid gap-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onSelectType(option.type)}
              className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
            >
              <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors', option.className)}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-lg text-ink">{option.title}</span>
                <span className="block text-xs text-muted">{option.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    </Dialog>
  )
}
