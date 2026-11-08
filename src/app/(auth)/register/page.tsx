import type { Metadata } from 'next'
import { RegisterForm } from '@/features/auth/presentation/components/RegisterForm'

export const metadata: Metadata = { title: 'Criar conta' }

export default function RegisterPage() {
  return (
    <div className="animate-fade-in">
      <p className="eyebrow mb-2">Comece agora</p>
      <h1 className="mb-2 font-serif text-3xl text-ink">Crie sua conta</h1>
      <p className="mb-8 text-sm text-muted">Leva menos de um minuto para colocar a vida acadêmica em ordem.</p>
      <RegisterForm />
    </div>
  )
}
