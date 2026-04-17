'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  resetRequestSchema,
  updatePasswordSchema,
  type ResetRequestInput,
  type UpdatePasswordInput,
} from '@/lib/validations/auth'
import { requestPasswordResetAction, updatePasswordAction } from '@/actions/auth'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'request' | 'set'>('request')
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Detect if we landed here from a reset/invite link (has session)
  useEffect(() => {
    const supabase = createClient()
    // Check for hash-based tokens (Supabase email link)
    const hash = window.location.hash
    if (hash.includes('type=recovery') || hash.includes('type=invite')) {
      setMode('set')
    }
    // Also listen for auth state change (PASSWORD_RECOVERY)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setMode('set')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (mode === 'request') {
    return <RequestForm setSuccess={setSuccess} success={success} serverError={serverError} setServerError={setServerError} />
  }

  return <SetPasswordForm router={router} serverError={serverError} setServerError={setServerError} />
}

function RequestForm({
  success,
  setSuccess,
  serverError,
  setServerError,
}: {
  success: boolean
  setSuccess: (v: boolean) => void
  serverError: string | null
  setServerError: (v: string | null) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetRequestInput>({ resolver: zodResolver(resetRequestSchema) })

  async function onSubmit(data: ResetRequestInput) {
    setServerError(null)
    const result = await requestPasswordResetAction(data)
    if (result?.error) setServerError(result.error)
    else setSuccess(true)
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enviaremos um link para redefinir sua senha
        </p>
      </div>

      {success ? (
        <p className="text-sm text-green-700 bg-green-50 rounded px-3 py-3">
          Email enviado! Verifique sua caixa de entrada.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="voce@empresa.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? 'Enviando…' : 'Enviar link'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium underline underline-offset-4">
          Voltar para login
        </Link>
      </p>
    </div>
  )
}

function SetPasswordForm({
  router,
  serverError,
  setServerError,
}: {
  router: ReturnType<typeof useRouter>
  serverError: string | null
  setServerError: (v: string | null) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordInput>({ resolver: zodResolver(updatePasswordSchema) })

  async function onSubmit(data: UpdatePasswordInput) {
    setServerError(null)
    const result = await updatePasswordAction(data)
    if (result?.error) setServerError(result.error)
    else if (result?.redirectTo) router.push(result.redirectTo)
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Nova senha</h1>
        <p className="text-sm text-muted-foreground mt-1">Escolha uma senha segura</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Nova senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirmar senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        {serverError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting ? 'Salvando…' : 'Salvar senha'}
        </button>
      </form>
    </div>
  )
}
