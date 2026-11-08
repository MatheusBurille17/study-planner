import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CalendarDays, LogOut, Mail, Sparkles } from 'lucide-react'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { getActivityRepository } from '@/features/activities/infrastructure/activityRepository'
import { logoutAction } from '@/features/auth/presentation/actions/logoutAction'
import { formatDate } from '@/shared/utils/dateHelpers'
import { initialsFromEmail } from '@/shared/utils/formatting'

export const metadata: Metadata = { title: 'Meu perfil' }

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const repository = await getActivityRepository()
  const total = await repository.count(user.id)

  return (
    <div className="page-shell max-w-3xl">
      <header className="mb-5">
        <p className="eyebrow mb-1">Sua conta</p>
        <h1 className="section-heading">Meu perfil</h1>
      </header>

      <section className="rounded-3xl border border-line bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-800">
            {initialsFromEmail(user.email)}
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-2xl text-ink">{user.name ?? 'Estudante'}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-primary-50/60 p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted">Membro desde</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink">
              <CalendarDays className="h-4 w-4 text-primary" /> {formatDate(user.createdAt, 'dd/MM/yyyy')}
            </p>
          </div>
          <div className="rounded-2xl bg-sage/30 p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted">Atividades cadastradas</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink">
              <Sparkles className="h-4 w-4 text-[#3c6b4d]" /> {total} atividades
            </p>
          </div>
        </div>

        <form action={logoutAction} className="mt-6">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-xs font-medium text-[#8a3d52] hover:border-rose/60 hover:bg-rose/10"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair da conta
          </button>
        </form>
      </section>
    </div>
  )
}
