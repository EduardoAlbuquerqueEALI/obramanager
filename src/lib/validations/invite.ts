import { z } from 'zod'

export const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  fullName: z.string().min(2, 'Nome muito curto'),
  role: z.enum(['admin', 'member']),
  empreendimentoIds: z.array(z.string().uuid()),
  areaIds: z.array(z.string().uuid()),
})

export type InviteInput = z.infer<typeof inviteSchema>
