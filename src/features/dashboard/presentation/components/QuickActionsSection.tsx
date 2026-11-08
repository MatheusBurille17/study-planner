import Link from 'next/link'
import { BookOpen, FileText, Plus, SquareCheckBig } from 'lucide-react'
import { cn } from '@/shared/utils/classNames'

const ACTIONS = [
  { href: '/activities/new?type=task', label: 'Nova tarefa', icon: SquareCheckBig, className: 'bg-sky/40 text-[#315a7d]' },
  { href: '/activities/new?type=exam', label: 'Nova prova', icon: FileText, className: 'bg-rose/40 text-[#8a3d52]' },
  { href: '/activities/new?type=assignment', label: 'Novo trabalho', icon: BookOpen, className: 'bg-sage/40 text-[#3c6b4d]' },
]

export function QuickActionsSection({ isOnline }: { isOnline: boolean }) {
  return (
    <section aria-label="Criar nova atividade">
      <h2 className="mb-3 font-serif text-xl text-ink">Criar rápido</h2>
      <nav className="grid gap-2" aria-label="Opções de nova atividade">
        {ACTIONS.map(({ href, label, icon: Icon, className }) => {
          if (!isOnline) {
            return (
              <span
                key={href}
                title="Não disponível offline. Reconecte para criar atividades."
                className="flex cursor-not-allowed items-center gap-3 rounded-2xl border border-line bg-line/20 px-3.5 py-2.5 text-sm text-muted opacity-60"
                aria-disabled="true"
              >
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', className)}>
                  <Icon className="h-4 w-4" />
                </span>
                {label}
                <Plus className="ml-auto h-3.5 w-3.5" />
              </span>
            )
          }
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
            >
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', className)}>
                <Icon className="h-4 w-4" />
              </span>
              {label}
              <Plus className="ml-auto h-3.5 w-3.5 text-muted" />
            </Link>
          )
        })}
      </nav>
    </section>
  )
}
