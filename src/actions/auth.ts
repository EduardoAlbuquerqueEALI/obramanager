'use server'

import { createClient } from '@/lib/supabase/server'
import { loginSchema, resetRequestSchema, updatePasswordSchema } from '@/lib/validations/auth'

export type ActionResult = {
  error?: string
  success?: boolean
  redirectTo?: string
}

export async function loginAction(data: {
  email: string
  password: string
}): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: error.message }

  return { redirectTo: '/admin' }
}

export async function signOutAction(): Promise<ActionResult> {
  const supabase = createClient()
  await supabase.auth.signOut()
  return { redirectTo: '/login' }
}

export async function requestPasswordResetAction(data: {
  email: string
}): Promise<ActionResult> {
  const parsed = resetRequestSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Email inválido' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function updatePasswordAction(data: {
  password: string
  confirmPassword: string
}): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: error.message }

  return { redirectTo: '/admin' }
}
