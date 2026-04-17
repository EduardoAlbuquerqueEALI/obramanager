'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { tipoTreinamentoSchema, treinamentoSchema } from '@/lib/validations/treinamento'

export type ActionResult = { error?: string; success?: boolean; id?: string }

async function getAdminProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = data as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') return null
  return { user, profile, admin }
}

// ─── Tipos de treinamento ─────────────────────────────────────────────────────

export async function createTipoTreinamento(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = tipoTreinamentoSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await ctx.admin
    .from('tipos_treinamento')
    .insert({
      org_id: ctx.profile.org_id,
      codigo: parsed.data.codigo,
      nome: parsed.data.nome,
      descricao: parsed.data.descricao || null,
      validade_meses: parsed.data.validade_meses,
      ativo: parsed.data.ativo,
      sort_order: parsed.data.sort_order,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/treinamentos/tipos')
  revalidatePath('/admin/treinamentos')
  return { success: true, id: (data as { id: string }).id }
}

export async function updateTipoTreinamento(id: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = tipoTreinamentoSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await ctx.admin
    .from('tipos_treinamento')
    .update({
      codigo: parsed.data.codigo,
      nome: parsed.data.nome,
      descricao: parsed.data.descricao || null,
      validade_meses: parsed.data.validade_meses,
      ativo: parsed.data.ativo,
      sort_order: parsed.data.sort_order,
    })
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/treinamentos/tipos')
  revalidatePath('/admin/treinamentos')
  return { success: true }
}

export async function deleteTipoTreinamento(id: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const { error } = await ctx.admin
    .from('tipos_treinamento')
    .delete()
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/treinamentos/tipos')
  revalidatePath('/admin/treinamentos')
  return { success: true }
}

// ─── Treinamentos (certificados) ──────────────────────────────────────────────

export async function createTreinamento(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = treinamentoSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Valida funcionário pertence à org
  const { data: func } = await ctx.admin
    .from('funcionarios')
    .select('id, org_id')
    .eq('id', parsed.data.funcionario_id)
    .eq('org_id', ctx.profile.org_id)
    .maybeSingle()
  if (!func) return { error: 'Funcionário inválido' }

  // Valida tipo pertence à org
  const { data: tipo } = await ctx.admin
    .from('tipos_treinamento')
    .select('id, org_id')
    .eq('id', parsed.data.tipo_treinamento_id)
    .eq('org_id', ctx.profile.org_id)
    .maybeSingle()
  if (!tipo) return { error: 'Tipo inválido' }

  const { data, error } = await ctx.admin
    .from('treinamentos')
    .insert({
      funcionario_id: parsed.data.funcionario_id,
      tipo_treinamento_id: parsed.data.tipo_treinamento_id,
      data_realizacao: parsed.data.data_realizacao,
      data_vencimento: parsed.data.data_vencimento || null,  // trigger preenche se null
      instrutor: parsed.data.instrutor || null,
      carga_horaria: parsed.data.carga_horaria ?? null,
      certificado_url: parsed.data.certificado_url || null,
      observacoes: parsed.data.observacoes || null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/treinamentos')
  return { success: true, id: (data as { id: string }).id }
}

export async function deleteTreinamento(id: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  // Valida via join
  const { data: tr } = await ctx.admin
    .from('treinamentos')
    .select('id, funcionarios!inner(org_id)')
    .eq('id', id)
    .maybeSingle()
  const row = tr as unknown as { id: string; funcionarios: { org_id: string } | { org_id: string }[] } | null
  const orgRel = Array.isArray(row?.funcionarios) ? row?.funcionarios[0]?.org_id : row?.funcionarios?.org_id
  if (!row || orgRel !== ctx.profile.org_id) return { error: 'Não autorizado' }

  const { error } = await ctx.admin.from('treinamentos').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/treinamentos')
  return { success: true }
}
