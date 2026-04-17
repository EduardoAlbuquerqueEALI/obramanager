import { Resend } from 'resend'

export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'noreply@dynamus.cc'
