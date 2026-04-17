import { z } from 'zod'

export const fornecedorSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório').max(100),
  cnpj: z.string().max(20).optional().nullable(),
  contato_nome: z.string().max(100).optional().nullable(),
  contato_telefone: z.string().max(30).optional().nullable(),
  contato_email: z.string().email('E-mail inválido').max(100).optional().nullable().or(z.literal('')),
  observacoes: z.string().max(500).optional().nullable(),
  ativo: z.boolean(),
})
export type FornecedorFormData = z.infer<typeof fornecedorSchema>
