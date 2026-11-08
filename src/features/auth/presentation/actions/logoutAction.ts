'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logout } from '../../application/useCases/logout'
import { getAuthService } from '../../infrastructure/authRepository'
import { clearAuthCookies, getSessionToken } from '@/shared/lib/auth/helpers'

/**
 * Encerra sessão. Limpa cookies mesmo se o provedor falhar e redireciona
 * para /login com mensagem de sucesso.
 */
export async function logoutAction(): Promise<void> {
  const token = await getSessionToken()
  await logout(token ?? '', getAuthService())
  await clearAuthCookies()

  revalidatePath('/dashboard')
  revalidatePath('/', 'layout')
  redirect('/login?message=Logout%20realizado%20com%20sucesso')
}
