'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Spinner } from '@/shared/components/ui/spinner'
import { resetPasswordSchema, type ResetPasswordFormData } from '../schemas/resetPasswordSchema'
import { resetPasswordAction } from '../actions/resetPasswordAction'

export function ResetPasswordForm({ initialToken = '' }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', newPasswordConfirm: '' },
  })

  useEffect(() => {
    if (initialToken) return
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash) return
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    if (accessToken) setToken(accessToken)
  }, [initialToken])

  async function onSubmit(data: ResetPasswordFormData) {
    setServerError(null)
    const formData = new FormData()
    formData.set('token', token)
    formData.set('newPassword', data.newPassword)
    formData.set('newPasswordConfirm', data.newPasswordConfirm)
    const result = await resetPasswordAction(null, formData)
    if (result?.error) setServerError(result.error)
  }

  if (!initialToken && !token) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose/30 text-[#8a3d52]">
          <KeyRound className="h-5 w-5" />
        </div>
        <p className="text-sm text-muted">
          Link expirado ou inválido. Se você chegou pelo email, abra o link mais recente ou solicite um novo.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-white shadow-soft hover:bg-primary-700"
        >
          Solicitar novo link
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nova senha</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          disabled={isSubmitting}
          {...register('newPassword')}
        />
        {errors.newPassword && <p className="text-xs text-[#ef4444]">{errors.newPassword.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPasswordConfirm">Confirmar nova senha</Label>
        <Input
          id="newPasswordConfirm"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a nova senha"
          disabled={isSubmitting}
          {...register('newPasswordConfirm')}
        />
        {errors.newPasswordConfirm && <p className="text-xs text-[#ef4444]">{errors.newPasswordConfirm.message}</p>}
      </div>

      {serverError && (
        <div role="alert" className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 text-sm text-[#b91c1c]">
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Spinner /> Salvando…
          </>
        ) : (
          'Redefinir senha'
        )}
      </Button>

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  )
}
