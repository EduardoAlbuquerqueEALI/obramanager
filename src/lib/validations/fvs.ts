import { z } from 'zod'

export const criarFvsSchema = z.object({
  empreendimento_id: z.string().uuid(),
  area_servico_id: z.string().uuid(),
  responsavel_id: z.string().uuid().optional().nullable(),
})
export type CriarFvsData = z.infer<typeof criarFvsSchema>

export const marcarVerificacaoSchema = z.object({
  cell_id: z.string().uuid(),
  status: z.enum(['nao_inspecionado', 'aprovado', 'reprovado', 'aprovado_reinspecao']),
  observacao: z.string().max(1000).optional().nullable(),
  solucao: z.string().max(1000).optional().nullable(),
  foto_url: z.string().url().optional().nullable().or(z.literal('')),
}).refine(
  d => {
    if (d.status === 'reprovado') {
      return !!d.observacao?.trim() && !!d.foto_url
    }
    return true
  },
  { message: 'Observação e foto são obrigatórias ao reprovar' },
)
export type MarcarVerificacaoData = z.infer<typeof marcarVerificacaoSchema>
