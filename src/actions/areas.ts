'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { areaSchema, templateSchema } from '@/lib/validations/area'
import type { TemplateItem } from '@/lib/validations/area'

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
  return { user, profile }
}

// ─── Áreas de Serviço ─────────────────────────────────────────────────────────

export async function createArea(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = areaSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('areas_servico')
    .insert({ ...parsed.data, org_id: ctx.profile.org_id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/areas')
  return { success: true, id: (data as { id: string }).id }
}

export async function updateArea(id: string, formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = areaSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { error } = await admin
    .from('areas_servico')
    .update(parsed.data)
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/areas')
  revalidatePath(`/admin/areas/${id}`)
  return { success: true }
}

export async function deleteArea(id: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('areas_servico')
    .delete()
    .eq('id', id)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/areas')
  return { success: true }
}

// ─── Checklist Templates ──────────────────────────────────────────────────────

export async function createTemplate(
  areaId: string,
  formData: unknown,
  empreendimentoId?: string | null,
): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = templateSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()

  // If override, verify empreendimento belongs to org
  if (empreendimentoId) {
    const { data: emp } = await admin
      .from('empreendimentos')
      .select('id')
      .eq('id', empreendimentoId)
      .eq('org_id', ctx.profile.org_id)
      .maybeSingle()
    if (!emp) return { error: 'Empreendimento não encontrado' }
  }

  const { data, error } = await admin
    .from('checklist_templates')
    .insert({
      org_id: ctx.profile.org_id,
      area_servico_id: areaId,
      empreendimento_id: empreendimentoId ?? null,
      name: parsed.data.name,
      items: parsed.data.items,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/admin/areas/${areaId}`)
  if (empreendimentoId) {
    revalidatePath(`/admin/empreendimentos/${empreendimentoId}/areas/${areaId}`)
  }
  return { success: true, id: (data as { id: string }).id }
}

export async function updateTemplate(
  templateId: string,
  areaId: string,
  formData: unknown,
  empreendimentoId?: string | null,
): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = templateSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { error } = await admin
    .from('checklist_templates')
    .update({ name: parsed.data.name, items: parsed.data.items })
    .eq('id', templateId)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath(`/admin/areas/${areaId}`)
  if (empreendimentoId) {
    revalidatePath(`/admin/empreendimentos/${empreendimentoId}/areas/${areaId}`)
  }
  return { success: true }
}

export async function deleteTemplate(templateId: string, areaId: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('checklist_templates')
    .delete()
    .eq('id', templateId)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath(`/admin/areas/${areaId}`)
  return { success: true }
}

export async function updateTemplateItems(
  templateId: string,
  areaId: string,
  items: TemplateItem[],
  empreendimentoId?: string | null,
): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('checklist_templates')
    .update({ items })
    .eq('id', templateId)
    .eq('org_id', ctx.profile.org_id)

  if (error) return { error: error.message }

  revalidatePath(`/admin/areas/${areaId}`)
  if (empreendimentoId) {
    revalidatePath(`/admin/empreendimentos/${empreendimentoId}/areas/${areaId}`)
  }
  return { success: true }
}
