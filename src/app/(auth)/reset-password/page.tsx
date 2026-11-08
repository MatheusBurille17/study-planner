import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/features/auth/presentation/components/ResetPasswordForm'

export const metadata: Metadata = { title: 'Redefinir senha' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  return (
    <div className="animate-fade-in">
      <p className="eyebrow mb-2">Nova senha</p>
      <h1 className="mb-2 font-serif text-3xl text-ink">Redefina sua senha</h1>
      <p className="mb-8 text-sm text-muted">Escolha uma nova senha com pelo menos 8 caracteres.</p>
      <ResetPasswordForm initialToken={params.token} />
    </div>
  )
}
