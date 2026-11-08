import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { AppShell } from '@/shared/components/layout/AppShell'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return <AppShell user={user}>{children}</AppShell>
}
