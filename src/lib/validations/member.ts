import { z } from 'zod'

export const assumeItemSchema = z.object({
  itemId: z.string().uuid(),
})

export const completeItemSchema = z.object({
  itemId: z.string().uuid(),
  photo_url: z.string().url('Foto obrigatória'),
  signature_url: z.string().url('Assinatura obrigatória'),
  observacao: z.string().max(500).optional().nullable(),
})

export const reportIssueSchema = z.object({
  itemId: z.string().uuid(),
  observacao: z.string().min(1, 'Descreva o problema').max(500),
})

export const purchaseRequestSchema = z.object({
  descricao: z.string().min(1, 'Descrição obrigatória').max(300),
  quantidade: z.number().int().min(1, 'Quantidade mínima 1'),
  urgencia: z.enum(['baixa', 'normal', 'alta']),
})

export type CompleteItemData = z.infer<typeof completeItemSchema>
export type PurchaseRequestData = z.infer<typeof purchaseRequestSchema>
