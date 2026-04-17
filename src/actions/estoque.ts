'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  almoxarifadoSchema,
  itemEstoqueSchema,
  movimentoEstoqueSchema,
} from '@/lib/validations/estoque'

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

// ─── Almoxarifados ────────────────────────────────────────────────────────────

export async function createAlmoxarifado(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = almoxarifadoSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Valida empreendimento (se fornecido) pertence à org
  if (parsed.data.empreendimento_id) {
    const { data: emp } = await ctx.admin
      .from('empreendimentos')
      .select('id')
      .eq('id', parsed.data.empreendimento_id)
      .eq('org_id', ctx.profile.org_id)
      .maybeSingle()
    if (!emp) return { error: 'Empreendimento inválido' }
  }

  const { data, error } = await ctx.admin
    .from('almoxarifados')
    .insert({
      org_id: ctx.profile.org_id,
      empreendimento_id: parsed.data.empreendimento_id,
      nome: parsed.data.nome,
      ativo: parsed.data.ativo,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/estoque')
  return { success: true, id: (data as { id: string }).id }
}

export async function updateAlmoxarifado(id: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = almoxarifadoSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Se vai reatribuir a outro empreendimento, valida que pertence à mesma org
  if (parsed.data.empreendimento_id) {
    const { data: emp } = await ctx.admin
      .from('empreendimentos')
      .select('id')
      .eq('id', parsed.data.empreendimento_id)
      .eq('org_id', ctx.profile.org_id)
      .maybeSingle()
    if (!emp) return { error: 'Empreendimento inválido' }
  }

  const { error } = await ctx.admin
    .from('almoxarifados')
    .update({ nome: parsed.data.nome, ativo: parsed.data.ativo, empreendimento_id: parsed.data.empreendimento_id })
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/estoque')
  return { success: true }
}

export async function deleteAlmoxarifado(id: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  // Valida ownership
  const { data: alm } = await ctx.admin
    .from('almoxarifados')
    .select('id')
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)
    .maybeSingle()
  if (!alm) return { error: 'Almoxarifado não encontrado' }

  // Checa movimentos vinculados
  const { count } = await ctx.admin
    .from('movimentos_estoque')
    .select('id', { count: 'exact', head: true })
    .or(`almoxarifado_origem_id.eq.${id},almoxarifado_destino_id.eq.${id}`)

  if ((count ?? 0) > 0) {
    return {
      error: `Não é possível remover: há ${count} movimentação(ões) registrada(s). Marque o almoxarifado como inativo.`,
    }
  }

  const { error } = await ctx.admin
    .from('almoxarifados')
    .delete()
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/estoque')
  return { success: true }
}

// ─── Itens de estoque ─────────────────────────────────────────────────────────

export async function createItemEstoque(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = itemEstoqueSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await ctx.admin
    .from('itens_estoque')
    .insert({
      org_id: ctx.profile.org_id,
      codigo: parsed.data.codigo,
      descricao: parsed.data.descricao,
      unidade: parsed.data.unidade,
      estoque_minimo: parsed.data.estoque_minimo,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/estoque')
  return { success: true, id: (data as { id: string }).id }
}

export async function updateItemEstoque(id: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = itemEstoqueSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await ctx.admin
    .from('itens_estoque')
    .update(parsed.data)
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/estoque')
  return { success: true }
}

export async function deleteItemEstoque(id: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  // Valida ownership
  const { data: item } = await ctx.admin
    .from('itens_estoque')
    .select('id')
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)
    .maybeSingle()
  if (!item) return { error: 'Item não encontrado' }

  // Checa movimentos vinculados
  const { count } = await ctx.admin
    .from('movimentos_estoque')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', id)

  if ((count ?? 0) > 0) {
    return {
      error: `Não é possível remover: há ${count} movimentação(ões) registrada(s) para este item.`,
    }
  }

  const { error } = await ctx.admin
    .from('itens_estoque')
    .delete()
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/estoque')
  return { success: true }
}

// ─── Movimentações ────────────────────────────────────────────────────────────

export async function createMovimento(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = movimentoEstoqueSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Valida item pertence à org
  const { data: item } = await ctx.admin
    .from('itens_estoque')
    .select('id, org_id')
    .eq('id', parsed.data.item_id)
    .eq('org_id', ctx.profile.org_id)
    .maybeSingle()
  if (!item) return { error: 'Item não encontrado' }

  // Valida almoxarifados pertencem à org (IDOR protection)
  if (parsed.data.almoxarifado_origem_id) {
    const { data: alm } = await ctx.admin
      .from('almoxarifados')
      .select('id')
      .eq('id', parsed.data.almoxarifado_origem_id)
      .eq('org_id', ctx.profile.org_id)
      .maybeSingle()
    if (!alm) return { error: 'Almoxarifado de origem inválido' }
  }
  if (parsed.data.almoxarifado_destino_id) {
    const { data: alm } = await ctx.admin
      .from('almoxarifados')
      .select('id')
      .eq('id', parsed.data.almoxarifado_destino_id)
      .eq('org_id', ctx.profile.org_id)
      .maybeSingle()
    if (!alm) return { error: 'Almoxarifado de destino inválido' }
  }

  // Valida etapa_orcamento pertence à org (via chain empreendimento → org)
  if (parsed.data.etapa_orcamento_id) {
    const { data: etapa } = await ctx.admin
      .from('etapas_orcamento')
      .select('id, orcamentos!inner(empreendimentos!inner(org_id))')
      .eq('id', parsed.data.etapa_orcamento_id)
      .maybeSingle()
    const etRow = etapa as unknown as
      | { id: string; orcamentos: { empreendimentos: { org_id: string } | { org_id: string }[] } }
      | null
    const empOrg = Array.isArray(etRow?.orcamentos.empreendimentos)
      ? etRow?.orcamentos.empreendimentos[0]?.org_id
      : etRow?.orcamentos.empreendimentos?.org_id
    if (!etRow || empOrg !== ctx.profile.org_id) return { error: 'Etapa inválida' }
  }

  const { data, error } = await ctx.admin
    .from('movimentos_estoque')
    .insert({
      org_id: ctx.profile.org_id,
      item_id: parsed.data.item_id,
      tipo: parsed.data.tipo,
      quantidade: parsed.data.quantidade,
      almoxarifado_origem_id: parsed.data.almoxarifado_origem_id ?? null,
      almoxarifado_destino_id: parsed.data.almoxarifado_destino_id ?? null,
      etapa_orcamento_id: parsed.data.etapa_orcamento_id ?? null,
      referencia_tipo: parsed.data.etapa_orcamento_id ? 'apropriacao' : 'manual',
      observacoes: parsed.data.observacoes ?? null,
      criado_por: ctx.user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/estoque')
  revalidatePath('/admin/estoque/movimentos')
  return { success: true, id: (data as { id: string }).id }
}
