'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Mail } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Spinner } from '@/shared/components/ui/spinner'
import { loginSchema, type LoginFormData } from '../schemas/loginSchema'
import { loginAction } from '../actions/loginAction'

interface LoginFormProps {
  initialMessage?: string
}

export function LoginForm({ initialMessage }: LoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: LoginFormData) {
    setServerError(null)
    const formData = new FormData()
    formData.set('email', data.email)
    formData.set('password', data.password)
    const result = await loginAction(null, formData)
    if (result?.error) setServerError(result.error)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {initialMessage && (
        <div className="rounded-xl border border-sage/60 bg-sage/20 px-4 py-3 text-sm text-[#3c6b4d]">
          {initialMessage}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@universidade.edu.br"
            className="pl-10"
            aria-invalid={Boolean(errors.email)}
            disabled={isSubmitting}
            {...register('email')}
          />
        </div>
        {errors.email && <p className="text-xs text-[#ef4444]">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Esqueceu a senha?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          aria-invalid={Boolean(errors.password)}
          disabled={isSubmitting}
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-[#ef4444]">{errors.password.message}</p>}
      </div>

      {serverError && (
        <div role="alert" className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 text-sm text-[#b91c1c]">
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Spinner /> Entrando…
          </>
        ) : (
          <>
            Entrar <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted">
        Ainda não tem conta?{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  )
}
