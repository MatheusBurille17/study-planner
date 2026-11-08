'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Send } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Spinner } from '@/shared/components/ui/spinner'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../schemas/forgotPasswordSchema'
import { forgotPasswordAction } from '../actions/forgotPasswordAction'

export function ForgotPasswordForm() {
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: ForgotPasswordFormData) {
    setFeedback(null)
    const formData = new FormData()
    formData.set('email', data.email)
    const result = await forgotPasswordAction(null, formData)
    if (result?.error) {
      setFeedback({ type: 'error', message: result.error })
    } else if (result?.message) {
      setFeedback({ type: 'success', message: result.message })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email cadastrado</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@universidade.edu.br"
          disabled={isSubmitting}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-[#ef4444]">{errors.email.message}</p>}
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border border-sage/60 bg-sage/20 text-[#3c6b4d]'
              : 'border border-[#ef4444]/30 bg-[#ef4444]/5 text-[#b91c1c]'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Spinner /> Enviando…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Enviar link de recuperação
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted">
        Lembrou a senha?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  )
}
