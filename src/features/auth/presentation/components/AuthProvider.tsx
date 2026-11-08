'use client'

import { createContext, useCallback, useEffect, useState } from 'react'
import type { User } from '../../domain/user'

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  refresh: () => Promise<void>
  setUser: (user: User | null) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' })
      if (response.ok) {
        const data = (await response.json()) as { user: User | null }
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return <AuthContext.Provider value={{ user, isLoading, refresh, setUser }}>{children}</AuthContext.Provider>
}
