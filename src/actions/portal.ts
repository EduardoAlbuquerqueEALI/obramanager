'use server'

import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  acessoClienteSchema,
  atualizacaoObraSchema,
  chamadoCreateSchema,
  mensagemChamadoSchema,
} from '@/lib/validations/portal'

export type ActionResult = { error?: string; success?: boolean; id?: string; token?: string }

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

// ─── Acessos Cliente ──────────────────────────────────────────────────────────

export async function gerarAcessoCliente(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = acessoClienteSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Valida unidade pertence à org via torres → empreendimentos
  const { data: unidadeData } = await ctx.admin
    .from('unidades')
    .select('id, torre_id, torres!inner(empreendimento_id, empreendimentos!inner(org_id))')
    .eq('id', parsed.data.unidade_id)
    .maybeSingle()
  const un = unidadeData as unknown as
    | { id: string; torre_id: string; torres: { empreendimento_id: string; empreendimentos: { org_id: string } | { org_id: string }[] } }
    | null
  if (!un) return { error: 'Unidade não encontrada' }
  const empOrgId = Array.isArray(un.torres.empreendimentos)
    ? un.torres.empreendimentos[0]?.org_id
    : un.torres.empreendimentos?.org_id
  if (empOrgId !== ctx.profile.org_id) return { error: 'Não autorizado' }

  // Token aleatório 64 hex
  const token = randomBytes(32).toString('hex')

  const { data, error } = await ctx.admin
    .from('acessos_cliente')
    .insert({
      unidade_id: parsed.data.unidade_id,
      empreendimento_id: un.torres.empreendimento_id,
      token,
      comprador_nome: parsed.data.comprador_nome || null,
      comprador_email: parsed.data.comprador_email || null,
      comprador_telefone: parsed.data.comprador_telefone || null,
    })
    .select('id, token')
    .single()

  if (error) return { error: error.message }

  const row = data as { id: string; token: string }

  // Email: envia link do portal ao comprador
  try {
    const { sendAcessoClienteEmail } = await import('@/lib/email/acesso-cliente')
    await sendAcessoClienteEmail({
      token: row.token,
      compradorNome: parsed.data.comprador_nome || null,
      compradorEmail: parsed.data.comprador_email || null,
      unidadeId: parsed.data.unidade_id,
      empreendimentoId: un.torres.empreendimento_id,
    })
  } catch {
    // email is non-critical
  }

  revalidatePath('/admin/compradores')
  return { success: true, id: row.id, token: row.token }
}

export async function revogarAcessoCliente(id: string, revogado: boolean): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  // Valida o acesso pertence à org
  const { data: acesso } = await ctx.admin
    .from('acessos_cliente')
    .select('id, empreendimentos!inner(org_id)')
    .eq('id', id)
    .maybeSingle()
  const row = acesso as unknown as { id: string; empreendimentos: { org_id: string } | { org_id: string }[] } | null
  const empOrg = Array.isArray(row?.empreendimentos) ? row?.empreendimentos[0]?.org_id : row?.empreendimentos?.org_id
  if (!row || empOrg !== ctx.profile.org_id) return { error: 'Não autorizado' }

  const { error } = await ctx.admin.from('acessos_cliente').update({ revogado }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/compradores')
  return { success: true }
}

export async function deletarAcessoCliente(id: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const { data: acesso } = await ctx.admin
    .from('acessos_cliente')
    .select('id, empreendimentos!inner(org_id)')
    .eq('id', id)
    .maybeSingle()
  const row = acesso as unknown as { id: string; empreendimentos: { org_id: string } | { org_id: string }[] } | null
  const empOrg = Array.isArray(row?.empreendimentos) ? row?.empreendimentos[0]?.org_id : row?.empreendimentos?.org_id
  if (!row || empOrg !== ctx.profile.org_id) return { error: 'Não autorizado' }

  const { error } = await ctx.admin.from('acessos_cliente').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/compradores')
  return { success: true }
}

// ─── Atualizações de obra ─────────────────────────────────────────────────────

export async function criarAtualizacaoObra(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = atualizacaoObraSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Valida empreendimento
  const { data: emp } = await ctx.admin
    .from('empreendimentos')
    .select('id')
    .eq('id', parsed.data.empreendimento_id)
    .eq('org_id', ctx.profile.org_id)
    .maybeSingle()
  if (!emp) return { error: 'Empreendimento inválido' }

  const { data, error } = await ctx.admin
    .from('atualizacoes_obra')
    .insert({
      empreendimento_id: parsed.data.empreendimento_id,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao || null,
      percentual_avanco: parsed.data.percentual_avanco ?? null,
      fotos: parsed.data.fotos,
      criado_por: ctx.user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Email: notifica clientes do empreendimento sobre atualização
  try {
    const empNameData = await ctx.admin.from('empreendimentos').select('name').eq('id', parsed.data.empreendimento_id).single()
    const empNome = (empNameData?.data as { name: string } | null)?.name ?? 'Empreendimento'
    const { sendAtualizacaoObraEmail } = await import('@/lib/email/atualizacao-obra')
    await sendAtualizacaoObraEmail({
      empreendimentoId: parsed.data.empreendimento_id,
      empreendimentoNome: empNome,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao || null,
      percentualAvanco: parsed.data.percentual_avanco ?? null,
    })
  } catch {
    // email is non-critical
  }

  revalidatePath('/admin/atualizacoes')
  return { success: true, id: (data as { id: string }).id }
}

export async function deletarAtualizacaoObra(id: string): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const { data: row } = await ctx.admin
    .from('atualizacoes_obra')
    .select('id, empreendimentos!inner(org_id)')
    .eq('id', id)
    .maybeSingle()
  const r = row as unknown as { id: string; empreendimentos: { org_id: string } | { org_id: string }[] } | null
  const empOrg = Array.isArray(r?.empreendimentos) ? r?.empreendimentos[0]?.org_id : r?.empreendimentos?.org_id
  if (!r || empOrg !== ctx.profile.org_id) return { error: 'Não autorizado' }

  const { error } = await ctx.admin.from('atualizacoes_obra').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/atualizacoes')
  return { success: true }
}

// ─── Chamados (admin side) ────────────────────────────────────────────────────

export async function mudarStatusChamado(chamadoId: string, status: 'aberto' | 'em_andamento' | 'resolvido' | 'fechado'): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const { data: row } = await ctx.admin
    .from('chamados_assistencia')
    .select('id, empreendimentos!inner(org_id)')
    .eq('id', chamadoId)
    .maybeSingle()
  const r = row as unknown as { id: string; empreendimentos: { org_id: string } | { org_id: string }[] } | null
  const empOrg = Array.isArray(r?.empreendimentos) ? r?.empreendimentos[0]?.org_id : r?.empreendimentos?.org_id
  if (!r || empOrg !== ctx.profile.org_id) return { error: 'Não autorizado' }

  const { error } = await ctx.admin.from('chamados_assistencia').update({ status }).eq('id', chamadoId)
  if (error) return { error: error.message }

  revalidatePath('/admin/chamados')
  revalidatePath(`/admin/chamados/${chamadoId}`)
  revalidatePath('/cliente', 'layout')
  return { success: true }
}

export async function responderChamadoAdmin(formData: unknown): Promise<ActionResult> {
  const ctx = await getAdminProfile()
  if (!ctx) return { error: 'Não autorizado' }

  const parsed = mensagemChamadoSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Valida chamado pertence à org
  const { data: row } = await ctx.admin
    .from('chamados_assistencia')
    .select('id, empreendimentos!inner(org_id)')
    .eq('id', parsed.data.chamado_id)
    .maybeSingle()
  const r = row as unknown as { id: string; empreendimentos: { org_id: string } | { org_id: string }[] } | null
  const empOrg = Array.isArray(r?.empreendimentos) ? r?.empreendimentos[0]?.org_id : r?.empreendimentos?.org_id
  if (!r || empOrg !== ctx.profile.org_id) return { error: 'Não autorizado' }

  const { error } = await ctx.admin.from('mensagens_chamado').insert({
    chamado_id: parsed.data.chamado_id,
    autor_tipo: 'empresa',
    autor_nome: parsed.data.autor_nome || null,
    mensagem: parsed.data.mensagem,
    fotos: parsed.data.fotos,
  })
  if (error) return { error: error.message }

  // Se o chamado estava aberto, marca como em_andamento
  await ctx.admin.from('chamados_assistencia').update({ status: 'em_andamento' }).eq('id', parsed.data.chamado_id).eq('status', 'aberto')

  // Email: notifica cliente sobre resposta
  try {
    // Fetch chamado info to get titulo + unidade_id
    const { data: chamadoData } = await ctx.admin
      .from('chamados_assistencia')
      .select('titulo, unidade_id')
      .eq('id', parsed.data.chamado_id)
      .single()
    if (chamadoData) {
      const ch = chamadoData as { titulo: string; unidade_id: string }
      const { sendRespostaAdminEmail } = await import('@/lib/email/chamado')
      await sendRespostaAdminEmail({
        chamadoId: parsed.data.chamado_id,
        chamadoTitulo: ch.titulo,
        autorNome: parsed.data.autor_nome || 'Equipe',
        mensagem: parsed.data.mensagem,
        unidadeId: ch.unidade_id,
      })
    }
  } catch {
    // email is non-critical
  }

  revalidatePath(`/admin/chamados/${parsed.data.chamado_id}`)
  // Revalidar portal do cliente (todas as rotas com token do comprador desta unidade)
  revalidatePath('/cliente', 'layout')
  return { success: true }
}

// ─── Public actions (portal do cliente) ───────────────────────────────────────
// Usam service_role e validam o token.

async function validarToken(token: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('acessos_cliente')
    .select('id, unidade_id, empreendimento_id, revogado, comprador_nome')
    .eq('token', token)
    .maybeSingle()
  const row = data as { id: string; unidade_id: string; empreendimento_id: string; revogado: boolean; comprador_nome: string | null } | null
  if (!row || row.revogado) return null
  return { ...row, admin }
}

export async function criarChamadoCliente(token: string, formData: unknown): Promise<ActionResult> {
  const ctx = await validarToken(token)
  if (!ctx) return { error: 'Acesso inválido ou revogado' }

  const parsed = chamadoCreateSchema.safeParse({
    ...((formData ?? {}) as Record<string, unknown>),
    unidade_id: ctx.unidade_id,
    empreendimento_id: ctx.empreendimento_id,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await ctx.admin
    .from('chamados_assistencia')
    .insert({
      unidade_id: parsed.data.unidade_id,
      empreendimento_id: parsed.data.empreendimento_id,
      categoria: parsed.data.categoria,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
      fotos: parsed.data.fotos,
      status: 'aberto',
      aberto_pelo_cliente: true,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }

  // Primeira mensagem = descrição
  await ctx.admin.from('mensagens_chamado').insert({
    chamado_id: (data as { id: string }).id,
    autor_tipo: 'cliente',
    autor_nome: ctx.comprador_nome,
    mensagem: parsed.data.descricao,
    fotos: parsed.data.fotos,
  })

  const chamadoId = (data as { id: string }).id

  // Email: notifica admins sobre novo chamado
  try {
    // Fetch empreendimento name + unidade number for the email
    const empData = await ctx.admin.from('empreendimentos').select('name').eq('id', ctx.empreendimento_id).single()
    const unData = await ctx.admin.from('unidades').select('number').eq('id', ctx.unidade_id).single()
    const { sendNovoChamadoEmail } = await import('@/lib/email/chamado')
    await sendNovoChamadoEmail({
      empreendimentoId: ctx.empreendimento_id,
      chamadoId,
      compradorNome: ctx.comprador_nome,
      categoria: parsed.data.categoria,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
      unidadeNumber: (unData?.data as { number: string } | null)?.number ?? 'Unidade',
      empreendimentoNome: (empData?.data as { name: string } | null)?.name ?? 'Empreendimento',
    })
  } catch {
    // email is non-critical
  }

  revalidatePath(`/cliente/${token}`)
  revalidatePath(`/cliente/${token}/chamados`)
  return { success: true, id: chamadoId }
}

export async function responderChamadoCliente(token: string, chamadoId: string, mensagem: string): Promise<ActionResult> {
  const ctx = await validarToken(token)
  if (!ctx) return { error: 'Acesso inválido' }

  // Valida chamado pertence à unidade do token
  const { data: chamado } = await ctx.admin
    .from('chamados_assistencia')
    .select('id, unidade_id')
    .eq('id', chamadoId)
    .maybeSingle()
  const c = chamado as { id: string; unidade_id: string } | null
  if (!c || c.unidade_id !== ctx.unidade_id) return { error: 'Chamado inválido' }

  if (!mensagem || mensagem.trim().length < 1) return { error: 'Mensagem vazia' }

  const { error } = await ctx.admin.from('mensagens_chamado').insert({
    chamado_id: chamadoId,
    autor_tipo: 'cliente',
    autor_nome: ctx.comprador_nome,
    mensagem: mensagem.trim(),
  })
  if (error) return { error: error.message }

  // Email: notifica admins sobre resposta do cliente
  try {
    const { data: chamadoData } = await ctx.admin
      .from('chamados_assistencia')
      .select('titulo, empreendimento_id')
      .eq('id', chamadoId)
      .single()
    if (chamadoData) {
      const ch = chamadoData as { titulo: string; empreendimento_id: string }
      const { sendRespostaClienteEmail } = await import('@/lib/email/chamado')
      await sendRespostaClienteEmail({
        empreendimentoId: ch.empreendimento_id,
        chamadoId,
        chamadoTitulo: ch.titulo,
        compradorNome: ctx.comprador_nome,
        mensagem: mensagem.trim(),
      })
    }
  } catch {
    // email is non-critical
  }

  revalidatePath(`/cliente/${token}/chamados/${chamadoId}`)
  return { success: true }
}

export async function registrarAcessoCliente(token: string) {
  const admin = createAdminClient()
  await admin
    .from('acessos_cliente')
    .update({ ultimo_acesso_em: new Date().toISOString() })
    .eq('token', token)
    .eq('revogado', false)
}
