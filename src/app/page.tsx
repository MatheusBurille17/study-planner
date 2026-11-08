import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/shared/lib/auth/helpers'

export default async function RootPage() {
  const user = await getCurrentUser()
  redirect(user ? '/dashboard' : '/login')
}
