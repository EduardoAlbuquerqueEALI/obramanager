import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const signupSchema = z.object({
  orgName: z.string().min(2, 'Nome muito curto'),
  fullName: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const resetRequestSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const updatePasswordSchema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ResetRequestInput = z.infer<typeof resetRequestSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
