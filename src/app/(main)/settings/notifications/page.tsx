import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { getNotificationRepository } from '@/features/notifications/infrastructure/notificationRepository'
import { NotificationSettings } from '@/features/notifications/presentation/components/NotificationSettings'

export const metadata: Metadata = { title: 'Notificações' }

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const repository = await getNotificationRepository()
  const [preferences, subscriptions] = await Promise.all([
    repository.getPreferences(user.id),
    repository.getActiveSubscriptions(user.id),
  ])

  return (
    <div className="page-shell max-w-3xl">
      <Link href="/settings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar para configurações
      </Link>
      <header className="mb-5">
        <p className="eyebrow mb-1">Configurações</p>
        <h1 className="section-heading">Notificações & lembretes</h1>
        <p className="mt-1 text-sm text-muted">
          Escolha quando e como quer ser lembrada dos seus prazos acadêmicos.
        </p>
      </header>

      <NotificationSettings initialPreferences={preferences} initialSubscriptions={subscriptions} />
    </div>
  )
}
