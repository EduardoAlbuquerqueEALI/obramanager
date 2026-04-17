'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { empreendimentoSchema, torreSchema, unidadeSchema, bulkUnidadeSchema } from '@/lib/validations/empreendimento'
import { generateUnidadeRows } from '@/lib/bulk-unidades'

export type ActionResult = { error?: string; success?: boolean; id?: string }

// ─── Auth helpers ─────────────────────────────────────────────────────────────

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

// ─── Empreendimentos ──────────────────────────────────────────────────────────

export async function createEmpreendimento(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = empreendimentoSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('empreendimentos')
    .insert({ ...parsed.data, org_id: ctx.profile.org_id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/empreendimentos')
  return { success: true, id: (data as { id: string }).id }
}

export async function updateEmpreendimento(id: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = empreendimentoSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { error } = await admin
    .from('empreendimentos')
    .update(parsed.data)
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/empreendimentos')
  revalidatePath(`/admin/empreendimentos/${id}`)
  return { success: true }
}

// ─── Empreendimento ↔ Áreas de Serviço (N:N) ──────────────────────────────────

export async function setEmpreendimentoAreas(
  empreendimentoId: string,
  areaIds: string[],
): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()

  // Verify empreendimento belongs to this admin's org
  const { data: emp } = await admin
    .from('empreendimentos')
    .select('id')
    .eq('id', empreendimentoId)
    .eq('org_id', ctx.profile.org_id)
    .maybeSingle()
  if (!emp) return { error: 'Empreendimento não encontrado' }

  // Verify all areas belong to same org
  if (areaIds.length > 0) {
    const { data: validAreas } = await admin
      .from('areas_servico')
      .select('id')
      .eq('org_id', ctx.profile.org_id)
      .in('id', areaIds)
    const validIds = new Set(((validAreas ?? []) as { id: string }[]).map(a => a.id))
    for (const id of areaIds) {
      if (!validIds.has(id)) return { error: 'Área inválida' }
    }
  }

  // Current
  const { data: currentRows } = await admin
    .from('empreendimento_areas_servico')
    .select('area_servico_id')
    .eq('empreendimento_id', empreendimentoId)
  const current = new Set(((currentRows ?? []) as { area_servico_id: string }[]).map(r => r.area_servico_id))
  const next = new Set(areaIds)

  const toAdd = areaIds.filter(id => !current.has(id))
  const toRemove = Array.from(current).filter(id => !next.has(id))

  if (toAdd.length > 0) {
    const payload = toAdd.map(area_servico_id => ({ empreendimento_id: empreendimentoId, area_servico_id }))
    const { error } = await admin.from('empreendimento_areas_servico').insert(payload)
    if (error) return { error: error.message }
  }

  if (toRemove.length > 0) {
    const { error } = await admin
      .from('empreendimento_areas_servico')
      .delete()
      .eq('empreendimento_id', empreendimentoId)
      .in('area_servico_id', toRemove)
    if (error) return { error: error.message }
  }

  revalidatePath(`/admin/empreendimentos/${empreendimentoId}`)
  revalidatePath(`/app/empreendimentos/${empreendimentoId}`)
  return { success: true }
}

export async function deleteEmpreendimento(id: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('empreendimentos')
    .delete()
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/empreendimentos')
  return { success: true }
}

// ─── Torres ───────────────────────────────────────────────────────────────────

export async function createTorre(empreendimentoId: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = torreSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verify empreendimento belongs to org
  const { data: emp } = await ctx.admin
    .from('empreendimentos')
    .select('id')
    .eq('id', empreendimentoId)
    .eq('org_id', ctx.profile.org_id)
    .single()
  if (!emp) return { error: 'Empreendimento não encontrado' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('torres')
    .insert({ ...parsed.data, empreendimento_id: empreendimentoId })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/admin/empreendimentos/${empreendimentoId}`)
  return { success: true, id: (data as { id: string }).id }
}

export async function deleteTorre(torreId: string, empreendimentoId: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()
  const { error } = await admin.from('torres').delete().eq('id', torreId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/empreendimentos/${empreendimentoId}`)
  return { success: true }
}

// ─── Unidades ─────────────────────────────────────────────────────────────────

export async function createUnidade(torreId: string, empreendimentoId: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = unidadeSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('unidades')
    .insert({ ...parsed.data, torre_id: torreId })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/admin/empreendimentos/${empreendimentoId}`)
  return { success: true, id: (data as { id: string }).id }
}

export async function createUnidadesBulk(
  torreId: string,
  empreendimentoId: string,
  formData: unknown,
): Promise<ActionResult & { created?: number; skipped?: string[] }> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = bulkUnidadeSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verify torre belongs to admin's org
  const { data: torre } = await ctx.admin
    .from('torres')
    .select('id, floors, empreendimento_id, empreendimentos!inner(org_id)')
    .eq('id', torreId)
    .single()
  const torreRow = torre as unknown as
    | { id: string; floors: number; empreendimento_id: string; empreendimentos: { org_id: string } | { org_id: string }[] }
    | null
  const empOrgId = Array.isArray(torreRow?.empreendimentos)
    ? torreRow?.empreendimentos[0]?.org_id
    : torreRow?.empreendimentos?.org_id
  if (!torreRow || empOrgId !== ctx.profile.org_id) {
    return { error: 'Torre não encontrada' }
  }

  // 1) Gerar lista de unidades (pure helper)
  const rows = generateUnidadeRows(parsed.data)

  if (rows.length === 0) {
    return { error: 'Nenhuma unidade gerada. Verifique os parâmetros.' }
  }

  // 2) Detectar conflitos: numbers já existentes nessa torre
  const numbers = rows.map(r => r.number)
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('unidades')
    .select('number')
    .eq('torre_id', torreId)
    .in('number', numbers)

  const existingSet = new Set(((existing ?? []) as { number: string }[]).map(e => e.number))
  const toInsert = rows.filter(r => !existingSet.has(r.number))
  const skipped = rows.filter(r => existingSet.has(r.number)).map(r => r.number)

  if (toInsert.length === 0) {
    return { error: 'Todas as unidades já existem nesta torre', skipped }
  }

  // 3) Insert em lote
  const payload = toInsert.map(r => ({
    torre_id: torreId,
    number: r.number,
    floor: r.floor,
    type: r.type ?? null,
    status: parsed.data.default_status,
  }))
  const { error } = await admin.from('unidades').insert(payload)
  if (error) return { error: error.message }

  // 4) Atualizar torres.floors se o maior andar criado for maior que o registrado
  const maxFloor = toInsert.reduce((m, r) => (r.floor > m ? r.floor : m), 0)
  if (torreRow.floors < maxFloor) {
    await admin.from('torres').update({ floors: maxFloor }).eq('id', torreId)
  }

  revalidatePath(`/admin/empreendimentos/${empreendimentoId}`)
  return { success: true, created: toInsert.length, skipped }
}

export async function deleteUnidade(unidadeId: string, empreendimentoId: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()
  const { error } = await admin.from('unidades').delete().eq('id', unidadeId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/empreendimentos/${empreendimentoId}`)
  return { success: true }
}

// ─── XLSX Import ──────────────────────────────────────────────────────────────

export type XlsxRow = {
  apto: string
  equipe?: string
  dtInicio?: string
  dtConclusao?: string
  diasTrab?: string
  periferia?: string
  situacao?: string
  observacao?: string
}

export async function importUnidadesAction(
  torreId: string,
  empreendimentoId: string,
  rows: XlsxRow[],
): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()

  // Find or create org-level "Alvenaria" area
  let areaId: string
  const { data: existingArea } = await admin
    .from('areas_servico')
    .select('id')
    .eq('org_id', ctx.profile.org_id)
    .eq('name', 'Alvenaria')
    .is('empreendimento_id', null)
    .maybeSingle()

  if (existingArea) {
    areaId = (existingArea as { id: string }).id
  } else {
    const { data: newArea, error: areaErr } = await admin
      .from('areas_servico')
      .insert({ org_id: ctx.profile.org_id, name: 'Alvenaria', icon: 'brick-wall', color: '#f59e0b' })
      .select('id')
      .single()
    if (areaErr) return { error: areaErr.message }
    areaId = (newArea as { id: string }).id
  }

  // Find or create checklist template
  let templateId: string
  const { data: existingTpl } = await admin
    .from('checklist_templates')
    .select('id')
    .eq('org_id', ctx.profile.org_id)
    .eq('area_servico_id', areaId)
    .maybeSingle()

  if (existingTpl) {
    templateId = (existingTpl as { id: string }).id
  } else {
    const defaultItems = [
      { id: 'alv-1', title: 'Alvenaria executada', required: true },
      { id: 'alv-2', title: 'Rejunte concluído', required: true },
      { id: 'alv-3', title: 'Limpeza final', required: false },
    ]
    const { data: newTpl, error: tplErr } = await admin
      .from('checklist_templates')
      .insert({ org_id: ctx.profile.org_id, area_servico_id: areaId, name: 'Alvenaria', items: defaultItems })
      .select('id')
      .single()
    if (tplErr) return { error: tplErr.message }
    templateId = (newTpl as { id: string }).id
  }

  // Process each row
  let created = 0
  for (const row of rows) {
    if (!row.apto) continue

    const aptoNum = parseInt(row.apto, 10)
    if (isNaN(aptoNum)) continue

    const floor = Math.floor(aptoNum / 100)

    // Find or create unidade
    const { data: existingUnit } = await admin
      .from('unidades')
      .select('id')
      .eq('torre_id', torreId)
      .eq('number', row.apto)
      .maybeSingle()

    let unidadeId: string
    if (existingUnit) {
      unidadeId = (existingUnit as { id: string }).id
    } else {
      const { data: newUnit, error: unitErr } = await admin
        .from('unidades')
        .insert({ torre_id: torreId, number: row.apto, floor })
        .select('id')
        .single()
      if (unitErr) continue
      unidadeId = (newUnit as { id: string }).id
    }

    // Determine status
    let status: 'pending' | 'in_progress' | 'completed' = 'pending'
    if (row.dtConclusao) status = 'completed'
    else if (row.dtInicio) status = 'in_progress'

    // Check if checklist already exists
    const { data: existingCl } = await admin
      .from('unidade_checklist')
      .select('id')
      .eq('unidade_id', unidadeId)
      .eq('checklist_template_id', templateId)
      .maybeSingle()

    if (!existingCl) {
      await admin.from('unidade_checklist').insert({
        unidade_id: unidadeId,
        checklist_template_id: templateId,
        status,
        completed_items: row as unknown as Record<string, unknown>,
        completed_at: row.dtConclusao ? new Date(row.dtConclusao).toISOString() : null,
      })
      created++
    }
  }

  revalidatePath(`/admin/empreendimentos/${empreendimentoId}`)
  return { success: true, id: String(created) }
}
