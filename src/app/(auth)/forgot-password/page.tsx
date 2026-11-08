import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/features/auth/presentation/components/ForgotPasswordForm'

export const metadata: Metadata = { title: 'Recuperar senha' }

export default function ForgotPasswordPage() {
  return (
    <div className="animate-fade-in">
      <p className="eyebrow mb-2">Recuperação</p>
      <h1 className="mb-2 font-serif text-3xl text-ink">Esqueceu a senha?</h1>
      <p className="mb-8 text-sm text-muted">
        Informe seu email e enviaremos um link seguro para redefinir sua senha.
      </p>
      <ForgotPasswordForm />
    </div>
  )
}
