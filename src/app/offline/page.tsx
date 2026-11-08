import type { Metadata } from 'next'
import Link from 'next/link'
import { WifiOff } from 'lucide-react'

export const metadata: Metadata = { title: 'Offline' }

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-100 text-primary">
        <WifiOff className="h-7 w-7" />
      </div>
      <h1 className="mt-5 font-serif text-3xl text-ink">Você está offline</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Não foi possível carregar esta página agora. Seus dados salvos continuam disponíveis nas telas já
        visitadas.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-white shadow-soft hover:bg-primary-700"
      >
        Tentar o dashboard
      </Link>
    </main>
  )
}
