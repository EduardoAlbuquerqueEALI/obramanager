'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { completeItemSchema, purchaseRequestSchema, reportIssueSchema, type PurchaseRequestData } from '@/lib/validations/member'
import type { UnidadeChecklistItem } from '@/types/member'

export type MemberActionResult = { error?: string; success?: boolean; data?: unknown }

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function getMemberProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = data as { id: string; org_id: string; role: 'admin' | 'member'; full_name: string; email: string | null } | null
  if (!profile) return null
  return { user, profile, supabase }
}

// ─── Ensure checklist items are materialized for a unit ───────────────────────

export async function ensureChecklistItemsForUnidade(
  unidadeId: string,
): Promise<MemberActionResult & { areaProgress?: { areaId: string; areaName: string; icon: string; color: string; total: number; completed: number }[] }> {
  const ctx = await getMemberProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()

  // Get org_id + empreendimento_id for this unit via join
  const { data: unidadeData } = await admin
    .from('unidades')
    .select('id, torre_id, torres(empreendimento_id, empreendimentos(org_id))')
    .eq('id', unidadeId)
    .single()

  if (!unidadeData) return { error: 'Unidade não encontrada' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = unidadeData as any
  const orgId: string = u.torres?.empreendimentos?.org_id
  const empreendimentoId: string = u.torres?.empreendimento_id
  if (!orgId || orgId !== ctx.profile.org_id) return { error: 'Não autorizado' }

  // Load areas this user is allowed to see (global per-user assignment)
  const { data: userAreas } = await admin
    .from('user_areas')
    .select('area_servico_id')
    .eq('user_id', ctx.user.id)
  const allowedAreaIds = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (userAreas ?? []).map((r: any) => r.area_servico_id as string),
  )

  // Load areas active in this empreendimento
  const { data: empAreas } = await admin
    .from('empreendimento_areas_servico')
    .select('area_servico_id')
    .eq('empreendimento_id', empreendimentoId)
  const empAreaIds = new Set(
    ((empAreas ?? []) as { area_servico_id: string }[]).map(r => r.area_servico_id),
  )

  // Get all templates for this org — keep override-per-emp OR global
  const { data: templates } = await admin
    .from('checklist_templates')
    .select('id, area_servico_id, empreendimento_id, items, areas_servico(id, name, icon, color)')
    .eq('org_id', orgId)

  if (!templates || templates.length === 0) {
    return { success: true, areaProgress: [] }
  }

  // For each allowed (intersection of user_areas + emp active areas) pick override if exists, else global
  const byArea = new Map<string, { id: string; items: unknown; areas_servico: { id: string; name: string; icon: string; color: string } }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const tRaw of templates as any[]) {
    const t = tRaw as {
      id: string
      area_servico_id: string | null
      empreendimento_id: string | null
      items: unknown
      areas_servico: { id: string; name: string; icon: string; color: string } | null
    }
    if (!t.area_servico_id) continue
    if (!allowedAreaIds.has(t.area_servico_id)) continue
    if (!empAreaIds.has(t.area_servico_id)) continue
    if (t.empreendimento_id && t.empreendimento_id !== empreendimentoId) continue

    const existing = byArea.get(t.area_servico_id)
    // Prefer override (empreendimento_id === empreendimentoId) over global (null)
    if (!existing || (t.empreendimento_id === empreendimentoId && existing !== undefined)) {
      byArea.set(t.area_servico_id, {
        id: t.id,
        items: t.items,
        areas_servico: t.areas_servico ?? { id: t.area_servico_id, name: '', icon: 'wrench', color: '#888' },
      })
    }
  }

  const filteredTemplates = Array.from(byArea.values()).map(t => ({
    id: t.id,
    items: t.items,
    areas_servico: t.areas_servico,
    area_servico_id: t.areas_servico.id,
  }))

  // For each template, ensure unidade_checklist + items exist
  for (const tpl of filteredTemplates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = tpl as any

    // Ensure checklist row
    const { data: existingCl } = await admin
      .from('unidade_checklist')
      .select('id')
      .eq('unidade_id', unidadeId)
      .eq('checklist_template_id', t.id)
      .maybeSingle()

    let checklistId: string
    if (existingCl) {
      checklistId = (existingCl as { id: string }).id
    } else {
      const { data: newCl, error: clErr } = await admin
        .from('unidade_checklist')
        .insert({ unidade_id: unidadeId, checklist_template_id: t.id, status: 'pending' })
        .select('id')
        .single()
      if (clErr) continue
      checklistId = (newCl as { id: string }).id
    }

    // Upsert each item from template JSONB
    const items = Array.isArray(t.items) ? t.items : []
    for (const item of items) {
      if (!item.id || !item.title) continue
      await admin.from('unidade_checklist_items').upsert(
        {
          unidade_checklist_id: checklistId,
          template_item_id: String(item.id),
          title: String(item.title),
          required: Boolean(item.required ?? false),
        },
        { onConflict: 'unidade_checklist_id,template_item_id', ignoreDuplicates: true },
      )
    }
  }

  // Compute area progress
  const { data: progressData } = await admin
    .from('unidade_checklist')
    .select(`
      id,
      checklist_template_id,
      checklist_templates(area_servico_id, areas_servico(id, name, icon, color)),
      unidade_checklist_items(id, status)
    `)
    .eq('unidade_id', unidadeId)

  const areaMap = new Map<string, { areaId: string; areaName: string; icon: string; color: string; total: number; completed: number }>()

  for (const cl of (progressData ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = cl as any
    const area = c.checklist_templates?.areas_servico
    if (!area) continue
    const areaId: string = area.id
    if (!allowedAreaIds.has(areaId)) continue
    if (!empAreaIds.has(areaId)) continue
    const existing = areaMap.get(areaId) ?? { areaId, areaName: area.name, icon: area.icon ?? 'wrench', color: area.color ?? '#888', total: 0, completed: 0 }
    const itemsList: { status: string }[] = c.unidade_checklist_items ?? []
    existing.total += itemsList.length
    existing.completed += itemsList.filter(i => i.status === 'completed' || i.status === 'approved').length
    areaMap.set(areaId, existing)
  }

  return { success: true, areaProgress: Array.from(areaMap.values()) }
}

// ─── Resolve template for (emp, area): override > global ─────────────────────

async function resolveTemplateForArea(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  empreendimentoId: string,
  areaId: string,
): Promise<{ id: string; items: unknown } | null> {
  const { data } = await admin
    .from('checklist_templates')
    .select('id, items, empreendimento_id')
    .eq('org_id', orgId)
    .eq('area_servico_id', areaId)
    .or(`empreendimento_id.eq.${empreendimentoId},empreendimento_id.is.null`)

  const rows = (data ?? []) as { id: string; items: unknown; empreendimento_id: string | null }[]
  if (rows.length === 0) return null
  // Prefer override
  const override = rows.find(r => r.empreendimento_id === empreendimentoId)
  return override ?? rows[0]
}

// ─── Ensure checklist items materialized for all units in (emp, area) ─────────

export async function ensureChecklistItemsForArea(
  empreendimentoId: string,
  areaId: string,
): Promise<MemberActionResult> {
  const ctx = await getMemberProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()

  // Access: member must have the empreendimento + area, and pair must be active
  if (ctx.profile.role !== 'admin') {
    const { data: hasEmp } = await admin
      .from('user_empreendimentos')
      .select('empreendimento_id')
      .eq('user_id', ctx.user.id)
      .eq('empreendimento_id', empreendimentoId)
      .maybeSingle()
    if (!hasEmp) return { error: 'Acesso negado a este empreendimento' }

    const { data: hasArea } = await admin
      .from('user_areas')
      .select('area_servico_id')
      .eq('user_id', ctx.user.id)
      .eq('area_servico_id', areaId)
      .maybeSingle()
    if (!hasArea) return { error: 'Acesso negado a esta área' }
  }

  const { data: pair } = await admin
    .from('empreendimento_areas_servico')
    .select('empreendimento_id')
    .eq('empreendimento_id', empreendimentoId)
    .eq('area_servico_id', areaId)
    .maybeSingle()
  if (!pair) return { error: 'Área não está ativa neste empreendimento' }

  // Resolve template
  const tpl = await resolveTemplateForArea(admin, ctx.profile.org_id, empreendimentoId, areaId)
  if (!tpl) return { success: true } // nothing to materialize

  const tplItems = Array.isArray(tpl.items) ? (tpl.items as { id: string; title: string; required?: boolean }[]) : []
  if (tplItems.length === 0) return { success: true }

  // Fetch all units in this empreendimento
  const { data: torres } = await admin
    .from('torres')
    .select('id, unidades(id)')
    .eq('empreendimento_id', empreendimentoId)

  const unidadeIds: string[] = []
  for (const t of ((torres ?? []) as { id: string; unidades: { id: string }[] | null }[])) {
    for (const u of (t.unidades ?? [])) unidadeIds.push(u.id)
  }
  if (unidadeIds.length === 0) return { success: true }

  // Ensure unidade_checklist row for each unit for this template
  const { data: existingChecklists } = await admin
    .from('unidade_checklist')
    .select('id, unidade_id')
    .eq('checklist_template_id', tpl.id)
    .in('unidade_id', unidadeIds)

  const existingMap = new Map<string, string>()
  for (const row of ((existingChecklists ?? []) as { id: string; unidade_id: string }[])) {
    existingMap.set(row.unidade_id, row.id)
  }

  const missing = unidadeIds.filter(id => !existingMap.has(id))
  if (missing.length > 0) {
    const payload = missing.map(unidade_id => ({
      unidade_id,
      checklist_template_id: tpl.id,
      status: 'pending' as const,
    }))
    const { data: inserted } = await admin
      .from('unidade_checklist')
      .insert(payload)
      .select('id, unidade_id')
    for (const row of ((inserted ?? []) as { id: string; unidade_id: string }[])) {
      existingMap.set(row.unidade_id, row.id)
    }
  }

  // Batch upsert items for all checklists
  const itemPayload: { unidade_checklist_id: string; template_item_id: string; title: string; required: boolean }[] = []
  const checklistIds = Array.from(existingMap.values())
  for (const checklistId of checklistIds) {
    for (const item of tplItems) {
      if (!item.id || !item.title) continue
      itemPayload.push({
        unidade_checklist_id: checklistId,
        template_item_id: String(item.id),
        title: String(item.title),
        required: Boolean(item.required ?? false),
      })
    }
  }

  if (itemPayload.length > 0) {
    // Upsert in batches of 500 to avoid payload limits
    const batchSize = 500
    for (let i = 0; i < itemPayload.length; i += batchSize) {
      const batch = itemPayload.slice(i, i + batchSize)
      await admin.from('unidade_checklist_items').upsert(batch, {
        onConflict: 'unidade_checklist_id,template_item_id',
        ignoreDuplicates: true,
      })
    }
  }

  return { success: true }
}

// ─── Get unit status per area for grid ─────────────────────────────────────────

export type UnidadeAreaStatus = {
  unidade_id: string
  torre_id: string
  torre_name: string
  number: string
  floor: number
  status_area: 'pending' | 'in_progress' | 'completed' | 'issue'
  total: number
  done: number
  wip: number
}

export type TorreWithAreaStatus = {
  id: string
  name: string
  unidades: UnidadeAreaStatus[]
}

export async function getUnidadesStatusByArea(
  empreendimentoId: string,
  areaId: string,
): Promise<MemberActionResult & { torres?: TorreWithAreaStatus[] }> {
  const ctx = await getMemberProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()

  // Access check (mirror ensureChecklistItemsForArea)
  if (ctx.profile.role !== 'admin') {
    const { data: hasEmp } = await admin
      .from('user_empreendimentos')
      .select('empreendimento_id')
      .eq('user_id', ctx.user.id)
      .eq('empreendimento_id', empreendimentoId)
      .maybeSingle()
    if (!hasEmp) return { error: 'Acesso negado a este empreendimento' }

    const { data: hasArea } = await admin
      .from('user_areas')
      .select('area_servico_id')
      .eq('user_id', ctx.user.id)
      .eq('area_servico_id', areaId)
      .maybeSingle()
    if (!hasArea) return { error: 'Acesso negado a esta área' }
  }

  const { data, error } = await admin.rpc('get_unidades_status_by_area', {
    p_emp: empreendimentoId,
    p_area: areaId,
  })
  if (error) return { error: error.message }

  const rows = (data ?? []) as UnidadeAreaStatus[]
  const torreMap = new Map<string, TorreWithAreaStatus>()
  for (const r of rows) {
    const t = torreMap.get(r.torre_id) ?? { id: r.torre_id, name: r.torre_name, unidades: [] }
    t.unidades.push(r)
    torreMap.set(r.torre_id, t)
  }

  const torres = Array.from(torreMap.values())
    .map(t => ({
      ...t,
      unidades: t.unidades.sort((a, b) =>
        b.floor - a.floor || a.number.localeCompare(b.number, undefined, { numeric: true }),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return { success: true, torres }
}

// ─── Get checklist items for a unit + area ────────────────────────────────────

export async function getChecklistItemsForArea(
  unidadeId: string,
  areaId: string,
): Promise<MemberActionResult & { items?: UnidadeChecklistItem[]; myUserId?: string }> {
  const ctx = await getMemberProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()

  // Admins bypass area restriction; members must have this area assigned in user_areas
  if (ctx.profile.role !== 'admin') {
    const { data: hasAccess } = await admin
      .from('user_areas')
      .select('area_servico_id')
      .eq('user_id', ctx.user.id)
      .eq('area_servico_id', areaId)
      .maybeSingle()
    if (!hasAccess) return { error: 'Acesso negado a esta área' }
  }

  const { data, error } = await admin
    .from('unidade_checklist')
    .select(`
      id,
      checklist_template_id,
      checklist_templates(area_servico_id),
      unidade_checklist_items(*)
    `)
    .eq('unidade_id', unidadeId)

  if (error) return { error: error.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: UnidadeChecklistItem[] = []
  for (const cl of (data ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = cl as any
    if (c.checklist_templates?.area_servico_id !== areaId) continue
    const clItems: UnidadeChecklistItem[] = c.unidade_checklist_items ?? []
    items.push(...clItems)
  }

  return { success: true, items, myUserId: ctx.user.id }
}

// ─── Assume item ──────────────────────────────────────────────────────────────

export async function assumeChecklistItem(itemId: string): Promise<MemberActionResult> {
  const ctx = await getMemberProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('unidade_checklist_items')
    .update({
      status: 'in_progress',
      responsavel_id: ctx.user.id,
      assumed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('status', 'pending') // only assume if still pending

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Complete item ────────────────────────────────────────────────────────────

export async function completeChecklistItem(
  itemId: string,
  formData: unknown,
): Promise<MemberActionResult> {
  const ctx = await getMemberProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = completeItemSchema.safeParse({ itemId, ...(formData as object) })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { photo_url, signature_url, observacao } = parsed.data

  const { error } = await admin
    .from('unidade_checklist_items')
    .update({
      status: 'completed',
      photo_url,
      signature_url,
      observacao: observacao ?? null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('responsavel_id', ctx.user.id) // only the responsavel can complete

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Report issue ─────────────────────────────────────────────────────────────

export async function reportChecklistItemIssue(
  itemId: string,
  observacao: string,
): Promise<MemberActionResult> {
  const ctx = await getMemberProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = reportIssueSchema.safeParse({ itemId, observacao })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { error } = await admin
    .from('unidade_checklist_items')
    .update({
      observacao: parsed.data.observacao,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Purchase request ─────────────────────────────────────────────────────────

export async function createPurchaseRequest(
  unidadeId: string,
  empreendimentoId: string,
  formData: PurchaseRequestData,
): Promise<MemberActionResult> {
  const ctx = await getMemberProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = purchaseRequestSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { descricao, quantidade, urgencia } = parsed.data

  const { data: inserted, error } = await admin
    .from('solicitacoes_compra')
    .insert({
      empreendimento_id: empreendimentoId,
      unidade_id: unidadeId,
      requested_by: ctx.user.id,
      title: descricao.slice(0, 100),
      description: descricao,
      items: [{ descricao, quantidade }],
      urgencia,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Send email notification to admins (no-op if no key)
  try {
    const { sendPurchaseRequestEmail } = await import('@/lib/email/purchase-request')
    await sendPurchaseRequestEmail({
      orgId: ctx.profile.org_id,
      unidadeId,
      empreendimentoId,
      userName: ctx.profile.full_name,
      descricao,
      quantidade,
      urgencia,
      solicitacaoId: (inserted as { id: string }).id,
    })
  } catch {
    // email is non-critical
  }

  revalidatePath(`/app/empreendimentos/${empreendimentoId}`)
  return { success: true }
}
