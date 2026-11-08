'use server'

import { getCurrentUser } from '@/shared/lib/auth/helpers'
import type { User } from '@/shared/types/user'

/** Server Action de verificação de sessão usada no layout raiz. */
export async function verifySessionAction(): Promise<User | null> {
  return getCurrentUser()
}
