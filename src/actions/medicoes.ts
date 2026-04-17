'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { medicaoCreateSchema } from '@/lib/validations/medicao'

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

export async function createMedicao(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = medicaoCreateSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Valida empreendimento pertence à org
  const { data: emp } = await ctx.admin
    .from('empreendimentos')
    .select('id')
    .eq('id', parsed.data.empreendimento_id)
    .eq('org_id', ctx.profile.org_id)
    .maybeSingle()
  if (!emp) return { error: 'Empreendimento inválido' }

  const { data: m, error } = await ctx.admin
    .from('medicoes')
    .insert({
      empreendimento_id: parsed.data.empreendimento_id,
      orcamento_id: parsed.data.orcamento_id,
      mes_referencia: parsed.data.mes_referencia,
      observacoes: parsed.data.observacoes ?? null,
      criado_por: ctx.user.id,
    })
    .select('id')
    .single()

  if (error || !m) return { error: error?.message ?? 'Erro' }
  const newId = (m as { id: string }).id

  if (parsed.data.etapas.length > 0) {
    const { error: etErr } = await ctx.admin.from('etapas_medicao').insert(
      parsed.data.etapas.map(et => ({
        medicao_id: newId,
        etapa_orcamento_id: et.etapa_orcamento_id,
        percentual_fisico: et.percentual_fisico,
        observacoes: et.observacoes ?? null,
      })),
    )
    if (etErr) return { error: etErr.message }
  }

  // ─── INTEGRAÇÃO: Medição → Atualização automática no Portal do Cliente ───
  // Calcula % médio e auto-publica atualização de obra
  if (parsed.data.etapas.length > 0) {
    const avgPct = parsed.data.etapas.reduce((a, et) => a + Number(et.percentual_fisico), 0) / parsed.data.etapas.length
    const mesDate = new Date(parsed.data.mes_referencia)
    const mesStr = mesDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    await ctx.admin.from('atualizacoes_obra').insert({
      empreendimento_id: parsed.data.empreendimento_id,
      titulo: `Medição de ${mesStr} — ${avgPct.toFixed(0)}% de avanço`,
      descricao: `Medição mensal registrada com ${parsed.data.etapas.length} etapas avaliadas. Avanço físico médio: ${avgPct.toFixed(1)}%.`,
      percentual_avanco: avgPct,
      criado_por: ctx.user.id,
    }).then(() => undefined, () => undefined) // best-effort, não bloqueia se falhar
  }

  revalidatePath('/admin/medicoes')
  revalidatePath('/admin/atualizacoes')
  return { success: true, id: newId }
}

export async function deleteMedicao(id: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  // Valida via join
  const { data: m } = await ctx.admin
    .from('medicoes')
    .select('id, empreendimentos!inner(org_id)')
    .eq('id', id)
    .maybeSingle()
  const row = m as unknown as { id: string; empreendimentos: { org_id: string } | { org_id: string }[] } | null
  const empOrg = Array.isArray(row?.empreendimentos) ? row?.empreendimentos[0]?.org_id : row?.empreendimentos?.org_id
  if (!row || empOrg !== ctx.profile.org_id) return { error: 'Não autorizado' }

  const { error } = await ctx.admin.from('medicoes').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/medicoes')
  return { success: true }
}
