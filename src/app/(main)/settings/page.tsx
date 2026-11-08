import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, BookOpen, Settings, Sparkles, Trash2, UserRound } from 'lucide-react'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { firstNameFromEmail } from '@/shared/utils/formatting'

export const metadata: Metadata = { title: 'Configurações' }

const ITEMS = [
  {
    href: '/settings/notifications',
    label: 'Notificações & lembretes',
    description: 'Ative push, escolha antecedência e horários de silêncio.',
    icon: Bell,
    className: 'bg-butter/40 text-[#7a6422]',
  },
  {
    href: '/profile',
    label: 'Meu perfil',
    description: 'Veja seus dados de conta e preferências pessoais.',
    icon: UserRound,
    className: 'bg-primary-100 text-primary-800',
  },
  {
    href: '/subjects',
    label: 'Disciplinas',
    description: 'Cores, professores e organização das matérias.',
    icon: BookOpen,
    className: 'bg-sage/40 text-[#3c6b4d]',
  },
  {
    href: '/activities/trash',
    label: 'Lixeira',
    description: 'Restaure atividades excluídas nos últimos 30 dias.',
    icon: Trash2,
    className: 'bg-rose/40 text-[#8a3d52]',
  },
]

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="page-shell max-w-3xl">
      <header className="mb-5">
        <p className="eyebrow mb-1">Sua conta</p>
        <h1 className="section-heading">Configurações</h1>
        <p className="mt-1 text-sm text-muted">Ajuste o app do seu jeito, {user.name ?? firstNameFromEmail(user.email)}.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map(({ href, label, description, icon: Icon, className }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-3xl border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
          >
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${className}`}>
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-3 font-serif text-lg text-ink group-hover:text-primary">{label}</h2>
            <p className="mt-1 text-xs text-muted">{description}</p>
          </Link>
        ))}
      </div>

      <section className="mt-5 rounded-3xl border border-line bg-surface p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-serif text-lg text-ink">
          <Sparkles className="h-4 w-4 text-primary" /> Sobre o Study Planner
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Feito para a Amanda organizar a vida acadêmica com leveza. Versão 1.0 · PWA instalável · funciona
          offline.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted">
          <Settings className="h-3.5 w-3.5" /> Modo {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Supabase' : 'demonstração local'}
        </p>
      </section>
    </div>
  )
}
