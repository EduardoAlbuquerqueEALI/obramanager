'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { criarFvsSchema, marcarVerificacaoSchema } from '@/lib/validations/fvs'

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

async function getProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('id, org_id, role').eq('id', user.id).single()
  const profile = data as { id: string; org_id: string; role: 'admin' | 'member' } | null
  if (!profile) return null
  return { user, profile, admin }
}

// ─── Notifica SPELHO quando unidade é concluída via FVS ──────────────────────

async function notifySpelhoUnitCompleted(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  unidadeId: string
) {
  const [{ data: mapping }, { data: org }] = await Promise.all([
    admin
      .from('external_mappings')
      .select('external_id')
      .eq('system', 'spelho')
      .eq('entity_type', 'unidade')
      .eq('internal_id', unidadeId)
      .maybeSingle(),
    admin
      .from('organizations')
      .select('spelho_callback_url, spelho_callback_secret')
      .eq('id', orgId)
      .single(),
  ])

  if (!mapping || !org?.spelho_callback_url || !org?.spelho_callback_secret) return

  await fetch(org.spelho_callback_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${org.spelho_callback_secret}`,
    },
    body: JSON.stringify({
      event: 'unit.completed',
      data: { spelho_unit_id: (mapping as { external_id: string }).external_id },
    }),
  }).catch(() => {})
}

// ─── Criar FVS + auto-gerar cells ────────────────────────────────────────────

export async function criarFVS(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = criarFvsSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Valida empreendimento + área pertencem à org
  const { data: emp } = await ctx.admin
    .from('empreendimentos')
    .select('id')
    .eq('id', parsed.data.empreendimento_id)
    .eq('org_id', ctx.profile.org_id)
    .maybeSingle()
  if (!emp) return { error: 'Empreendimento inválido' }

  const { data: area } = await ctx.admin
    .from('areas_servico')
    .select('id, name')
    .eq('id', parsed.data.area_servico_id)
    .eq('org_id', ctx.profile.org_id)
    .maybeSingle()
  if (!area) return { error: 'Área de serviço inválida' }

  // Cria FVS
  const { data: fvs, error: fvsErr } = await ctx.admin
    .from('verificacoes_servico')
    .insert({
      empreendimento_id: parsed.data.empreendimento_id,
      area_servico_id: parsed.data.area_servico_id,
      responsavel_id: parsed.data.responsavel_id || null,
      status: 'em_andamento',
      created_by: ctx.user.id,
    })
    .select('id')
    .single()
  if (fvsErr) return { error: fvsErr.message }
  const fvsId = (fvs as { id: string }).id

  // Busca template da área (override por empreendimento se houver)
  const { data: tplOverride } = await ctx.admin
    .from('checklist_templates')
    .select('id, items')
    .eq('area_servico_id', parsed.data.area_servico_id)
    .eq('empreendimento_id', parsed.data.empreendimento_id)
    .maybeSingle()

  let template = tplOverride
  if (!template) {
    const { data: tplGlobal } = await ctx.admin
      .from('checklist_templates')
      .select('id, items')
      .eq('area_servico_id', parsed.data.area_servico_id)
      .eq('org_id', ctx.profile.org_id)
      .is('empreendimento_id', null)
      .maybeSingle()
    template = tplGlobal
  }

  if (!template) return { error: 'Nenhum template de checklist encontrado para essa área. Cadastre itens primeiro.' }

  const items = (template as { id: string; items: Array<{ id: string; title: string }> }).items
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Template sem itens. Adicione etapas na área antes de criar FVS.' }
  }

  // Busca TODAS unidades do empreendimento (via torres)
  const { data: torres } = await ctx.admin
    .from('torres')
    .select('id')
    .eq('empreendimento_id', parsed.data.empreendimento_id)

  const torreIds = ((torres ?? []) as Array<{ id: string }>).map(t => t.id)
  if (torreIds.length === 0) return { error: 'Empreendimento sem torres/unidades cadastradas.' }

  const { data: unidades } = await ctx.admin
    .from('unidades')
    .select('id')
    .in('torre_id', torreIds)

  const unidadeIds = ((unidades ?? []) as Array<{ id: string }>).map(u => u.id)
  if (unidadeIds.length === 0) return { error: 'Nenhuma unidade cadastrada.' }

  // Gera cells: items × unidades
  const cells = []
  for (const item of items) {
    for (const uid of unidadeIds) {
      cells.push({
        verificacao_id: fvsId,
        unidade_id: uid,
        template_item_id: item.id,
        template_item_title: item.title,
        status: 'nao_inspecionado',
      })
    }
  }

  // Insert em batches de 500
  for (let i = 0; i < cells.length; i += 500) {
    const batch = cells.slice(i, i + 500)
    const { error } = await ctx.admin.from('verificacao_unidades').insert(batch)
    if (error) return { error: `Erro ao gerar cells: ${error.message}` }
  }

  revalidatePath('/admin/fvs')
  return { success: true, id: fvsId }
}

// ─── Atribuir responsável ─────────────────────────────────────────────────────

export async function atribuirResponsavelFVS(fvsId: string, responsavelId: string | null): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const { error } = await ctx.admin
    .from('verificacoes_servico')
    .update({ responsavel_id: responsavelId })
    .eq('id', fvsId)

  if (error) return { error: error.message }

  revalidatePath('/admin/fvs')
  revalidatePath(`/admin/fvs/${fvsId}`)
  return { success: true }
}

// ─── Concluir FVS ─────────────────────────────────────────────────────────────

export async function concluirFVS(fvsId: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const { error } = await ctx.admin
    .from('verificacoes_servico')
    .update({ status: 'concluida' })
    .eq('id', fvsId)

  if (error) return { error: error.message }

  // Email: notifica responsável que a FVS foi concluída
  try {
    const { sendFvsConcluidaEmail } = await import('@/lib/email/fvs')
    await sendFvsConcluidaEmail({ fvsId })
  } catch {
    // email is non-critical
  }

  revalidatePath('/admin/fvs')
  revalidatePath(`/admin/fvs/${fvsId}`)
  return { success: true }
}

// ─── Deletar FVS ──────────────────────────────────────────────────────────────

export async function deletarFVS(fvsId: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const { error } = await ctx.admin.from('verificacoes_servico').delete().eq('id', fvsId)
  if (error) return { error: error.message }

  revalidatePath('/admin/fvs')
  return { success: true }
}

// ─── Marcar verificação (admin OU executor) ───────────────────────────────────

export async function marcarVerificacao(formData: unknown): Promise<ActionResult> {
  const ctx = await getProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = marcarVerificacaoSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Busca cell e valida acesso
  const { data: cellData } = await ctx.admin
    .from('verificacao_unidades')
    .select('id, status, verificacao_id, verificacoes_servico!inner(responsavel_id, empreendimentos!inner(org_id))')
    .eq('id', parsed.data.cell_id)
    .maybeSingle()

  const cell = cellData as unknown as {
    id: string
    status: string
    verificacao_id: string
    verificacoes_servico: {
      responsavel_id: string | null
      empreendimentos: { org_id: string } | { org_id: string }[]
    }
  } | null
  if (!cell) return { error: 'Célula não encontrada' }

  const empOrg = Array.isArray(cell.verificacoes_servico.empreendimentos)
    ? cell.verificacoes_servico.empreendimentos[0]?.org_id
    : cell.verificacoes_servico.empreendimentos?.org_id
  if (empOrg !== ctx.profile.org_id) return { error: 'Não autorizado' }

  // Member (não-admin) só pode marcar se for responsável atribuído
  if (ctx.profile.role !== 'admin' && cell.verificacoes_servico.responsavel_id !== ctx.user.id) {
    return { error: 'Apenas o responsável atribuído pode inspecionar' }
  }

  // Validação de transição: aprovado_reinspecao só se estava reprovado
  if (parsed.data.status === 'aprovado_reinspecao' && cell.status !== 'reprovado') {
    return { error: 'Só pode marcar como "aprovado após reinspeção" se estava reprovado' }
  }

  const { error } = await ctx.admin
    .from('verificacao_unidades')
    .update({
      status: parsed.data.status,
      observacao: parsed.data.observacao?.trim() || null,
      solucao: parsed.data.solucao?.trim() || null,
      foto_url: parsed.data.foto_url || null,
      inspecionado_por: ctx.user.id,
      inspecionado_em: new Date().toISOString(),
    })
    .eq('id', parsed.data.cell_id)

  if (error) return { error: error.message }

  // ─── INTEGRAÇÃO: FVS reprova → cria tarefa no Kanban de Tarefas ──────────
  if (parsed.data.status === 'reprovado') {
    // Busca info completa da cell pra criar a solicitação
    const { data: fullCell } = await ctx.admin
      .from('verificacao_unidades')
      .select(`
        template_item_title, unidade_id, observacao,
        verificacoes_servico!inner(empreendimento_id, area_servico_id)
      `)
      .eq('id', parsed.data.cell_id)
      .single()

    if (fullCell) {
      const fc = fullCell as unknown as {
        template_item_title: string
        unidade_id: string
        observacao: string | null
        verificacoes_servico: { empreendimento_id: string; area_servico_id: string }
      }

      // Cria solicitação de compra como "tarefa de correção" no Kanban
      // (reutiliza solicitacoes_compra com título prefixado pra identificar)
      await ctx.admin.from('solicitacoes_compra').insert({
        empreendimento_id: fc.verificacoes_servico.empreendimento_id,
        unidade_id: fc.unidade_id,
        area_servico_id: fc.verificacoes_servico.area_servico_id,
        requested_by: ctx.user.id,
        title: `[FVS] Refazer: ${fc.template_item_title}`,
        description: fc.observacao ? `Reprovado na inspeção: ${fc.observacao}` : 'Reprovado na inspeção FVS — verificar e corrigir.',
        status: 'pending',
        urgencia: 'alta',
      })
    }
  }

  // ─── INTEGRAÇÃO: verificar se unidade foi concluída e notificar SPELHO ──────
  // O trigger check_fvs_unidade_concluida (migration 0017) automaticamente
  // marca unidades.status = 'concluida' quando todas as cells FVS são aprovadas.
  // Aqui verificamos se isso aconteceu e notificamos o SPELHO.
  if (parsed.data.status === 'aprovado' || parsed.data.status === 'aprovado_reinspecao') {
    try {
      const { data: cellInfo } = await ctx.admin
        .from('verificacao_unidades')
        .select('unidade_id')
        .eq('id', parsed.data.cell_id)
        .single()

      if (cellInfo) {
        const { data: unidade } = await ctx.admin
          .from('unidades')
          .select('id, status')
          .eq('id', (cellInfo as { unidade_id: string }).unidade_id)
          .single()

        if ((unidade as { id: string; status: string } | null)?.status === 'concluida') {
          await notifySpelhoUnitCompleted(
            ctx.admin,
            ctx.profile.org_id,
            (cellInfo as { unidade_id: string }).unidade_id
          )
        }
      }
    } catch {
      // notification is non-critical
    }
  }

  revalidatePath(`/admin/fvs/${cell.verificacao_id}`)
  revalidatePath(`/app/fvs/${cell.verificacao_id}`)
  revalidatePath('/admin/kanban-tarefas')
  revalidatePath('/admin/kanban-compras')
  return { success: true }
}

// ─── Aprovar em lote (produtividade) ──────────────────────────────────────────

export async function aprovarEmLote(cellIds: string[]): Promise<ActionResult> {
  const ctx = await getProfile()
  if (!ctx) return { error: 'Não autorizado' }

  if (cellIds.length === 0) return { error: 'Nenhuma célula selecionada' }

  const { error } = await ctx.admin
    .from('verificacao_unidades')
    .update({
      status: 'aprovado',
      inspecionado_por: ctx.user.id,
      inspecionado_em: new Date().toISOString(),
    })
    .in('id', cellIds)
    .eq('status', 'nao_inspecionado')

  if (error) return { error: error.message }

  revalidatePath('/admin/fvs')
  revalidatePath('/app/fvs')
  return { success: true }
}
