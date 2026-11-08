'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sparkles } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Spinner } from '@/shared/components/ui/spinner'
import { registerSchema, type RegisterFormData } from '../schemas/registerSchema'
import { registerAction } from '../actions/registerAction'

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirm: '' },
  })

  async function onSubmit(data: RegisterFormData) {
    setServerError(null)
    const formData = new FormData()
    if (data.name) formData.set('name', data.name)
    formData.set('email', data.email)
    formData.set('password', data.password)
    formData.set('passwordConfirm', data.passwordConfirm)
    const result = await registerAction(null, formData)
    if (result?.error) setServerError(result.error)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Como podemos te chamar?</Label>
        <Input id="name" placeholder="Seu primeiro nome" autoComplete="given-name" disabled={isSubmitting} {...register('name')} />
        {errors.name && <p className="text-xs text-[#ef4444]">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            disabled={isSubmitting}
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-[#ef4444]">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="passwordConfirm">Confirmar senha</Label>
          <Input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a senha"
            disabled={isSubmitting}
            {...register('passwordConfirm')}
          />
          {errors.passwordConfirm && <p className="text-xs text-[#ef4444]">{errors.passwordConfirm.message}</p>}
        </div>
      </div>

      {serverError && (
        <div role="alert" className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 text-sm text-[#b91c1c]">
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Spinner /> Criando conta…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Criar conta
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted">
        Já tem uma conta?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  )
}
