import { z } from 'zod'

export const almoxarifadoSchema = z.object({
  empreendimento_id: z.string().uuid().nullable(),
  nome: z.string().min(2, 'Nome obrigatório').max(100),
  ativo: z.boolean(),
})
export type AlmoxarifadoFormData = z.infer<typeof almoxarifadoSchema>

export const itemEstoqueSchema = z.object({
  codigo: z.string().min(1, 'Código obrigatório').max(30),
  descricao: z.string().min(2, 'Descrição obrigatória').max(200),
  unidade: z.string().min(1).max(10),
  estoque_minimo: z.number().min(0),
})
export type ItemEstoqueFormData = z.infer<typeof itemEstoqueSchema>

export const movimentoEstoqueSchema = z.object({
  item_id: z.string().uuid(),
  tipo: z.enum(['entrada', 'saida', 'transferencia', 'ajuste']),
  quantidade: z.number().positive('Quantidade deve ser positiva'),
  almoxarifado_origem_id: z.string().uuid().optional().nullable(),
  almoxarifado_destino_id: z.string().uuid().optional().nullable(),
  etapa_orcamento_id: z.string().uuid().optional().nullable(),
  observacoes: z.string().max(300).optional().nullable(),
}).refine(
  (d) => {
    if (d.tipo === 'entrada') return !!d.almoxarifado_destino_id
    if (d.tipo === 'saida') return !!d.almoxarifado_origem_id
    if (d.tipo === 'transferencia') return !!d.almoxarifado_origem_id && !!d.almoxarifado_destino_id
    return true
  },
  { message: 'Origem/destino obrigatório para o tipo informado' },
)
export type MovimentoEstoqueFormData = z.infer<typeof movimentoEstoqueSchema>
