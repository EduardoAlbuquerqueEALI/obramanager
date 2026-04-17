import { z } from 'zod'

export const empreendimentoSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  status: z.enum(['planning', 'in_progress', 'completed', 'paused']),
  logo_url: z.string().url().optional().nullable(),
})

export type EmpreendimentoFormData = z.infer<typeof empreendimentoSchema>

export const torreSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  floors: z.number().int().min(1, 'Mínimo 1 andar').max(99),
})

export type TorreFormData = z.infer<typeof torreSchema>

export const unidadeSchema = z.object({
  number: z.string().min(1, 'Número obrigatório').max(10),
  floor: z.number().int().min(0),
  type: z.string().max(50).optional().nullable(),
  status: z.enum(['pendente', 'em_andamento', 'concluida', 'entregue']),
  owner_name: z.string().max(100).optional().nullable(),
})

export type UnidadeFormData = z.infer<typeof unidadeSchema>

export const floorOverrideSchema = z.object({
  floor: z.number().int().min(0).max(99),
  units_count: z.number().int().min(1).max(99),
  type: z.string().max(50).optional().nullable(),
})

export type FloorOverride = z.infer<typeof floorOverrideSchema>

export const bulkUnidadeSchema = z.object({
  floors: z.number().int().min(1).max(99),
  include_ground: z.boolean().default(false),
  units_per_floor: z.number().int().min(1).max(99),
  default_type: z.string().max(50).optional().nullable(),
  default_status: z.enum(['pendente', 'em_andamento', 'concluida', 'entregue']).default('pendente'),
  numbering: z.discriminatedUnion('scheme', [
    z.object({ scheme: z.literal('mcmv') }),
    z.object({ scheme: z.literal('prefix'), prefix: z.string().min(1).max(5) }),
  ]),
  overrides: z.array(floorOverrideSchema).default([]),
})

export type BulkUnidadeFormData = z.infer<typeof bulkUnidadeSchema>
export type BulkUnidadeFormInput = z.input<typeof bulkUnidadeSchema>
