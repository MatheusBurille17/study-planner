'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../hooks/useAuth'
import { Loading } from '@/shared/components/ui/spinner'

/** Guarda de rota client-side complementar ao middleware. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  if (isLoading) return <Loading label="Verificando sessão…" />
  if (!user) return null
  return <>{children}</>
}
