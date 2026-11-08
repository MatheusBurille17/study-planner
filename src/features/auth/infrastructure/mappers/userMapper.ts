import type { User } from '@/shared/types/user'

interface SupabaseUserLike {
  id: string
  email?: string | null
  created_at?: string
  last_sign_in_at?: string | null
  user_metadata?: Record<string, unknown>
}

/** Converte user do Supabase para a entidade de domínio User. */
export function mapSupabaseUserToUser(supabaseUser: SupabaseUserLike): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name: (supabaseUser.user_metadata?.name as string | undefined) ?? undefined,
    createdAt: supabaseUser.created_at ? new Date(supabaseUser.created_at) : new Date(),
    lastSignInAt: supabaseUser.last_sign_in_at ? new Date(supabaseUser.last_sign_in_at) : undefined,
  }
}
