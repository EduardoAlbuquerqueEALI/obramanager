'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  orcamentoCreateSchema,
  orcamentoUpdateSchema,
  etapaSchema,
  itemOrcamentoSchema,
} from '@/lib/validations/orcamento'

export type ActionResult = { error?: string; success?: boolean; id?: string }

// ─── Auth helper ──────────────────────────────────────────────────────────────

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

async function assertEmpreendimentoAccess(adminClient: ReturnType<typeof createAdminClient>, orgId: string, empId: string) {
  const { data } = await adminClient
    .from('empreendimentos')
    .select('id')
    .eq('id', empId)
    .eq('org_id', orgId)
    .maybeSingle()
  return !!data
}

async function assertOrcamentoAccess(adminClient: ReturnType<typeof createAdminClient>, orgId: string, orcamentoId: string) {
  const { data } = await adminClient
    .from('orcamentos')
    .select('id, empreendimento_id, status, empreendimentos!inner(org_id)')
    .eq('id', orcamentoId)
    .maybeSingle()
  const row = data as unknown as
    | { id: string; empreendimento_id: string; status: string; empreendimentos: { org_id: string } | { org_id: string }[] }
    | null
  if (!row) return null
  const empOrgId = Array.isArray(row.empreendimentos) ? row.empreendimentos[0]?.org_id : row.empreendimentos?.org_id
  if (empOrgId !== orgId) return null
  return row
}

// ─── Orçamento ────────────────────────────────────────────────────────────────

export async function createOrcamento(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = orcamentoCreateSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  if (!(await assertEmpreendimentoAccess(ctx.admin, ctx.profile.org_id, parsed.data.empreendimento_id))) {
    return { error: 'Empreendimento não encontrado' }
  }

  // Próxima versão
  const { data: latest } = await ctx.admin
    .from('orcamentos')
    .select('versao')
    .eq('empreendimento_id', parsed.data.empreendimento_id)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = ((latest as { versao: number } | null)?.versao ?? 0) + 1

  const { data, error } = await ctx.admin
    .from('orcamentos')
    .insert({
      empreendimento_id: parsed.data.empreendimento_id,
      versao: nextVersion,
      nome: parsed.data.nome,
      bdi_percent: parsed.data.bdi_percent,
      contingencia_percent: parsed.data.contingencia_percent,
      observacoes: parsed.data.observacoes ?? null,
      status: 'rascunho',
      criado_por: ctx.user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/orcamentos')
  revalidatePath(`/admin/orcamentos/${parsed.data.empreendimento_id}`)
  return { success: true, id: (data as { id: string }).id }
}

export async function updateOrcamento(orcamentoId: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const orc = await assertOrcamentoAccess(ctx.admin, ctx.profile.org_id, orcamentoId)
  if (!orc) return { error: 'Orçamento não encontrado' }
  if (orc.status === 'congelado' || orc.status === 'substituido') {
    return { error: 'Orçamento bloqueado para edição' }
  }

  const parsed = orcamentoUpdateSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await ctx.admin.from('orcamentos').update(parsed.data).eq('id', orcamentoId)
  if (error) return { error: error.message }

  revalidatePath('/admin/orcamentos')
  revalidatePath(`/admin/orcamentos/${orc.empreendimento_id}`)
  return { success: true }
}

export async function deleteOrcamento(orcamentoId: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const orc = await assertOrcamentoAccess(ctx.admin, ctx.profile.org_id, orcamentoId)
  if (!orc) return { error: 'Orçamento não encontrado' }
  if (orc.status === 'congelado') return { error: 'Orçamento congelado não pode ser removido' }

  const { error } = await ctx.admin.from('orcamentos').delete().eq('id', orcamentoId)
  if (error) return { error: error.message }

  revalidatePath('/admin/orcamentos')
  revalidatePath(`/admin/orcamentos/${orc.empreendimento_id}`)
  return { success: true }
}

export async function freezeOrcamento(orcamentoId: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const orc = await assertOrcamentoAccess(ctx.admin, ctx.profile.org_id, orcamentoId)
  if (!orc) return { error: 'Orçamento não encontrado' }
  if (orc.status !== 'rascunho' && orc.status !== 'ativo') {
    return { error: 'Só rascunho/ativo pode ser congelado' }
  }

  // Calcula total (subtotal × (1 + BDI) × (1 + contingência))
  const { data: full } = await ctx.admin
    .from('orcamentos')
    .select('bdi_percent, contingencia_percent, etapas_orcamento(itens_orcamento(quantidade, preco_unitario))')
    .eq('id', orcamentoId)
    .single()
  const row = full as unknown as {
    bdi_percent: number
    contingencia_percent: number
    etapas_orcamento: Array<{ itens_orcamento: Array<{ quantidade: number; preco_unitario: number }> }>
  } | null

  let subtotal = 0
  for (const et of row?.etapas_orcamento ?? []) {
    for (const it of et.itens_orcamento ?? []) {
      subtotal += Number(it.quantidade) * Number(it.preco_unitario)
    }
  }
  // BDI e Contingência são encargos paralelos sobre o custo direto (padrão TCU).
  // total = subtotal × (1 + BDI% + Contingência%)
  const bdiFactor = Number(row?.bdi_percent ?? 0) / 100
  const contFactor = Number(row?.contingencia_percent ?? 0) / 100
  const total = subtotal * (1 + bdiFactor + contFactor)

  const { error } = await ctx.admin
    .from('orcamentos')
    .update({
      status: 'congelado',
      congelado_em: new Date().toISOString(),
      total_congelado: total,
    })
    .eq('id', orcamentoId)
    .in('status', ['rascunho', 'ativo'])

  if (error) return { error: error.message }

  revalidatePath('/admin/orcamentos')
  revalidatePath(`/admin/orcamentos/${orc.empreendimento_id}`)
  return { success: true }
}

export async function reviseOrcamento(orcamentoId: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const { data: full } = await ctx.admin
    .from('orcamentos')
    .select('*, empreendimentos!inner(org_id), etapas_orcamento(id, nome, sort_order, itens_orcamento(*))')
    .eq('id', orcamentoId)
    .single()
  const orc = full as unknown as {
    id: string
    empreendimento_id: string
    status: string
    nome: string
    bdi_percent: number
    contingencia_percent: number
    observacoes: string | null
    empreendimentos: { org_id: string } | { org_id: string }[]
    etapas_orcamento: Array<{
      id: string
      nome: string
      sort_order: number
      itens_orcamento: Array<{ descricao: string; unidade: string; quantidade: number; preco_unitario: number; codigo_sinapi: string | null; observacoes: string | null; sort_order: number }>
    }>
  } | null
  if (!orc) return { error: 'Orçamento não encontrado' }
  const empOrgId = Array.isArray(orc.empreendimentos) ? orc.empreendimentos[0]?.org_id : orc.empreendimentos?.org_id
  if (empOrgId !== ctx.profile.org_id) return { error: 'Não autorizado' }
  if (orc.status !== 'congelado') return { error: 'Só orçamentos congelados geram revisão' }

  // Próxima versão
  const { data: latest } = await ctx.admin
    .from('orcamentos')
    .select('versao')
    .eq('empreendimento_id', orc.empreendimento_id)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = ((latest as { versao: number } | null)?.versao ?? 0) + 1

  const { data: newOrc, error: insertErr } = await ctx.admin
    .from('orcamentos')
    .insert({
      empreendimento_id: orc.empreendimento_id,
      versao: nextVersion,
      parent_id: orc.id,
      nome: orc.nome,
      status: 'rascunho',
      bdi_percent: orc.bdi_percent,
      contingencia_percent: orc.contingencia_percent,
      observacoes: orc.observacoes,
      criado_por: ctx.user.id,
    })
    .select('id')
    .single()
  if (insertErr || !newOrc) return { error: insertErr?.message ?? 'Erro' }
  const newId = (newOrc as { id: string }).id

  // Clonar etapas + itens
  for (const etapa of orc.etapas_orcamento ?? []) {
    const { data: newEtapa } = await ctx.admin
      .from('etapas_orcamento')
      .insert({ orcamento_id: newId, nome: etapa.nome, sort_order: etapa.sort_order })
      .select('id')
      .single()
    const newEtapaId = (newEtapa as { id: string } | null)?.id
    if (!newEtapaId) continue

    if (etapa.itens_orcamento?.length) {
      await ctx.admin.from('itens_orcamento').insert(
        etapa.itens_orcamento.map(it => ({
          etapa_id: newEtapaId,
          descricao: it.descricao,
          unidade: it.unidade,
          quantidade: it.quantidade,
          preco_unitario: it.preco_unitario,
          codigo_sinapi: it.codigo_sinapi,
          observacoes: it.observacoes,
          sort_order: it.sort_order,
        })),
      )
    }
  }

  // Marca antigo como substituído
  await ctx.admin.from('orcamentos').update({ status: 'substituido' }).eq('id', orc.id)

  revalidatePath('/admin/orcamentos')
  revalidatePath(`/admin/orcamentos/${orc.empreendimento_id}`)
  return { success: true, id: newId }
}

// ─── Etapas ───────────────────────────────────────────────────────────────────

export async function createEtapa(orcamentoId: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const orc = await assertOrcamentoAccess(ctx.admin, ctx.profile.org_id, orcamentoId)
  if (!orc) return { error: 'Orçamento não encontrado' }
  if (orc.status === 'congelado' || orc.status === 'substituido') {
    return { error: 'Orçamento bloqueado' }
  }

  const parsed = etapaSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await ctx.admin
    .from('etapas_orcamento')
    .insert({ orcamento_id: orcamentoId, nome: parsed.data.nome, sort_order: parsed.data.sort_order })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/admin/orcamentos/${orc.empreendimento_id}`)
  return { success: true, id: (data as { id: string }).id }
}

export async function updateEtapa(etapaId: string, orcamentoId: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const orc = await assertOrcamentoAccess(ctx.admin, ctx.profile.org_id, orcamentoId)
  if (!orc) return { error: 'Não autorizado' }
  if (orc.status === 'congelado' || orc.status === 'substituido') return { error: 'Bloqueado' }

  const parsed = etapaSchema.partial().safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await ctx.admin
    .from('etapas_orcamento')
    .update(parsed.data)
    .eq('id', etapaId)
    .eq('orcamento_id', orcamentoId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/orcamentos/${orc.empreendimento_id}`)
  return { success: true }
}

export async function deleteEtapa(etapaId: string, orcamentoId: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const orc = await assertOrcamentoAccess(ctx.admin, ctx.profile.org_id, orcamentoId)
  if (!orc) return { error: 'Não autorizado' }
  if (orc.status === 'congelado' || orc.status === 'substituido') return { error: 'Bloqueado' }

  const { error } = await ctx.admin.from('etapas_orcamento').delete().eq('id', etapaId).eq('orcamento_id', orcamentoId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/orcamentos/${orc.empreendimento_id}`)
  return { success: true }
}

// ─── Itens ────────────────────────────────────────────────────────────────────

async function assertEtapaAccess(adminClient: ReturnType<typeof createAdminClient>, orgId: string, etapaId: string) {
  const { data } = await adminClient
    .from('etapas_orcamento')
    .select('id, orcamento_id, orcamentos!inner(empreendimento_id, status, empreendimentos!inner(org_id))')
    .eq('id', etapaId)
    .maybeSingle()
  const row = data as unknown as {
    id: string
    orcamento_id: string
    orcamentos: { empreendimento_id: string; status: string; empreendimentos: { org_id: string } | { org_id: string }[] }
  } | null
  if (!row) return null
  const empOrg = Array.isArray(row.orcamentos.empreendimentos)
    ? row.orcamentos.empreendimentos[0]?.org_id
    : row.orcamentos.empreendimentos?.org_id
  if (empOrg !== orgId) return null
  return { ...row, empreendimento_id: row.orcamentos.empreendimento_id, status: row.orcamentos.status }
}

export async function createItem(etapaId: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const etapa = await assertEtapaAccess(ctx.admin, ctx.profile.org_id, etapaId)
  if (!etapa) return { error: 'Etapa não encontrada' }
  if (etapa.status === 'congelado' || etapa.status === 'substituido') return { error: 'Bloqueado' }

  const parsed = itemOrcamentoSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await ctx.admin
    .from('itens_orcamento')
    .insert({
      etapa_id: etapaId,
      descricao: parsed.data.descricao,
      unidade: parsed.data.unidade,
      quantidade: parsed.data.quantidade,
      preco_unitario: parsed.data.preco_unitario,
      codigo_sinapi: parsed.data.codigo_sinapi ?? null,
      observacoes: parsed.data.observacoes ?? null,
      sort_order: parsed.data.sort_order,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/admin/orcamentos/${etapa.empreendimento_id}`)
  return { success: true, id: (data as { id: string }).id }
}

export async function updateItem(itemId: string, etapaId: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const etapa = await assertEtapaAccess(ctx.admin, ctx.profile.org_id, etapaId)
  if (!etapa) return { error: 'Não autorizado' }
  if (etapa.status === 'congelado' || etapa.status === 'substituido') return { error: 'Bloqueado' }

  const parsed = itemOrcamentoSchema.partial().safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await ctx.admin.from('itens_orcamento').update(parsed.data).eq('id', itemId).eq('etapa_id', etapaId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/orcamentos/${etapa.empreendimento_id}`)
  return { success: true }
}

export async function deleteItem(itemId: string, etapaId: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const etapa = await assertEtapaAccess(ctx.admin, ctx.profile.org_id, etapaId)
  if (!etapa) return { error: 'Não autorizado' }
  if (etapa.status === 'congelado' || etapa.status === 'substituido') return { error: 'Bloqueado' }

  const { error } = await ctx.admin.from('itens_orcamento').delete().eq('id', itemId).eq('etapa_id', etapaId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/orcamentos/${etapa.empreendimento_id}`)
  return { success: true }
}
