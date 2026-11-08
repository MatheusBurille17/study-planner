import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { getDashboardDataForUser } from '@/features/dashboard/application/getDashboardData'
import { DashboardPage } from '@/features/dashboard/presentation/components/DashboardPage'

export const metadata: Metadata = { title: 'Início' }

export default async function DashboardRoute() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getDashboardDataForUser(user.id, user.name)

  return <DashboardPage initialData={data} userName={user.name} />
}
