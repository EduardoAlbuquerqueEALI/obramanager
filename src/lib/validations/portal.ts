import { z } from 'zod'

export const acessoClienteSchema = z.object({
  unidade_id: z.string().uuid(),
  comprador_nome: z.string().max(100).optional().nullable(),
  comprador_email: z.string().email().max(100).optional().nullable().or(z.literal('')),
  comprador_telefone: z.string().max(30).optional().nullable(),
})
export type AcessoClienteFormData = z.infer<typeof acessoClienteSchema>

export const atualizacaoObraSchema = z.object({
  empreendimento_id: z.string().uuid(),
  titulo: z.string().min(2, 'Título obrigatório').max(120),
  descricao: z.string().max(2000).optional().nullable(),
  percentual_avanco: z.number().min(0).max(100).optional().nullable(),
  fotos: z.array(z.string().url()).default([]),
})
export type AtualizacaoObraFormData = z.infer<typeof atualizacaoObraSchema>

export const chamadoCreateSchema = z.object({
  unidade_id: z.string().uuid(),
  empreendimento_id: z.string().uuid(),
  categoria: z.enum(['hidraulica', 'eletrica', 'infiltracao', 'acabamento', 'estrutural', 'outros']),
  titulo: z.string().min(2, 'Título obrigatório').max(120),
  descricao: z.string().min(5, 'Descrição obrigatória').max(2000),
  fotos: z.array(z.string().url()).default([]),
})
export type ChamadoCreateData = z.infer<typeof chamadoCreateSchema>

export const mensagemChamadoSchema = z.object({
  chamado_id: z.string().uuid(),
  autor_tipo: z.enum(['cliente', 'empresa']),
  autor_nome: z.string().max(100).optional().nullable(),
  mensagem: z.string().min(1).max(2000),
  fotos: z.array(z.string().url()).default([]),
})
export type MensagemChamadoFormData = z.infer<typeof mensagemChamadoSchema>
