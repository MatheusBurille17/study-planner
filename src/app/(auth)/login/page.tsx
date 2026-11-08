import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/presentation/components/LoginForm'

export const metadata: Metadata = { title: 'Entrar' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  return (
    <div className="animate-fade-in">
      <p className="eyebrow mb-2">Bem-vinda de volta</p>
      <h1 className="mb-2 font-serif text-3xl text-ink">Que bom te ver por aqui</h1>
      <p className="mb-8 text-sm text-muted">Entre para continuar organizando seus estudos.</p>
      <LoginForm initialMessage={params.message} />
    </div>
  )
}
