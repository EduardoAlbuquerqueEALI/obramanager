import { z } from 'zod'

export const orcamentoCreateSchema = z.object({
  empreendimento_id: z.string().uuid(),
  nome: z.string().min(2, 'Nome obrigatório').max(100),
  bdi_percent: z.number().min(0).max(100),
  contingencia_percent: z.number().min(0).max(100),
  observacoes: z.string().max(500).optional().nullable(),
})
export type OrcamentoCreateData = z.infer<typeof orcamentoCreateSchema>

export const orcamentoUpdateSchema = z.object({
  nome: z.string().min(2).max(100).optional(),
  bdi_percent: z.coerce.number().min(0).max(100).optional(),
  contingencia_percent: z.coerce.number().min(0).max(100).optional(),
  observacoes: z.string().max(500).optional().nullable(),
})
export type OrcamentoUpdateData = z.infer<typeof orcamentoUpdateSchema>

export const etapaSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(100),
  sort_order: z.coerce.number().int().default(0),
})
export type EtapaFormData = z.infer<typeof etapaSchema>

export const itemOrcamentoSchema = z.object({
  descricao: z.string().min(1, 'Descrição obrigatória').max(200),
  unidade: z.string().min(1).max(10).default('un'),
  quantidade: z.coerce.number().min(0).default(0),
  preco_unitario: z.coerce.number().min(0).default(0),
  codigo_sinapi: z.string().max(20).optional().nullable(),
  observacoes: z.string().max(200).optional().nullable(),
  sort_order: z.coerce.number().int().default(0),
})
export type ItemOrcamentoFormData = z.infer<typeof itemOrcamentoSchema>
