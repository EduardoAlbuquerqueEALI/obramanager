import { z } from 'zod'

export const funcionarioSchema = z.object({
  nome_completo: z.string().min(2, 'Nome obrigatório').max(100),
  cpf: z.string().max(20).optional().nullable(),
  funcao: z.string().max(80).optional().nullable(),
  foto_url: z.string().url().optional().nullable().or(z.literal('')),
  ativo: z.boolean(),
})
export type FuncionarioFormData = z.infer<typeof funcionarioSchema>

export const tipoTreinamentoSchema = z.object({
  codigo: z.string().min(1, 'Código obrigatório').max(20),
  nome: z.string().min(2, 'Nome obrigatório').max(100),
  descricao: z.string().max(300).optional().nullable(),
  validade_meses: z.number().int().positive('Validade deve ser positiva').max(120),
  ativo: z.boolean(),
  sort_order: z.number().int(),
})
export type TipoTreinamentoFormData = z.infer<typeof tipoTreinamentoSchema>

export const treinamentoSchema = z.object({
  funcionario_id: z.string().uuid(),
  tipo_treinamento_id: z.string().uuid(),
  data_realizacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  data_vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  instrutor: z.string().max(100).optional().nullable(),
  carga_horaria: z.number().int().positive().optional().nullable(),
  certificado_url: z.string().url().optional().nullable().or(z.literal('')),
  observacoes: z.string().max(500).optional().nullable(),
})
export type TreinamentoFormData = z.infer<typeof treinamentoSchema>
