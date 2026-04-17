import { z } from 'zod'

export const medicaoCreateSchema = z.object({
  empreendimento_id: z.string().uuid(),
  orcamento_id: z.string().uuid(),
  mes_referencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  observacoes: z.string().max(500).optional().nullable(),
  etapas: z.array(z.object({
    etapa_orcamento_id: z.string().uuid(),
    percentual_fisico: z.number().min(0).max(100),
    observacoes: z.string().max(200).optional().nullable(),
  })),
})
export type MedicaoCreateData = z.infer<typeof medicaoCreateSchema>
