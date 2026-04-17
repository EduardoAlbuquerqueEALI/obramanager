'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SolicitacaoStatus, DashboardStats, SolicitacaoComment, ProgressByArea, RecentCompletion } from '@/types/kanban'

export type AdminActionResult = {
  error?: string
  success?: boolean
}

export async function updateUserPermissions(
  userId: string,
  empreendimentoIds: string[],
  areaIds: string[],
  role: 'admin' | 'member',
): Promise<AdminActionResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Verify caller is admin
  const { data: callerProfileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const callerProfile = callerProfileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!callerProfile || callerProfile.role !== 'admin') {
    return { error: 'Não autorizado' }
  }

  // Verify target user is in same org
  const { data: targetProfileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  const targetProfile = targetProfileData as { org_id: string } | null
  if (!targetProfile || targetProfile.org_id !== callerProfile.org_id) {
    return { error: 'Usuário não encontrado' }
  }

  const admin = createAdminClient()

  // Replace empreendimento assignments
  await admin.from('user_empreendimentos').delete().eq('user_id', userId)
  if (empreendimentoIds.length > 0) {
    await admin.from('user_empreendimentos').insert(
      empreendimentoIds.map((id) => ({ user_id: userId, empreendimento_id: id })),
    )
  }

  // Replace area assignments
  await admin.from('user_areas').delete().eq('user_id', userId)
  if (areaIds.length > 0) {
    await admin.from('user_areas').insert(
      areaIds.map((id) => ({ user_id: userId, area_servico_id: id })),
    )
  }

  // Update role in profile
  await admin.from('profiles').update({ role }).eq('id', userId)

  // Sync app_metadata so JWT contains the new role
  await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role, org_id: callerProfile.org_id },
  })

  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function updateSolicitacaoStatus(
  id: string,
  newStatus: SolicitacaoStatus,
): Promise<AdminActionResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()
  const profile = profileData as { org_id: string; role: string } | null
  if (!profile || profile.role !== 'admin') return { error: 'Não autorizado' }

  // Verify org ownership
  const { data: solRaw } = await supabase
    .from('solicitacoes_compra')
    .select('id, empreendimentos!inner(org_id)')
    .eq('id', id)
    .single()

  const sol = solRaw as unknown as { id: string; empreendimentos: { org_id: string } } | null
  if (!sol || sol.empreendimentos?.org_id !== profile.org_id) return { error: 'Não encontrado' }

  const admin = createAdminClient()
  await admin.from('solicitacoes_compra').update({
    status: newStatus,
    ...(newStatus === 'approved' ? { approved_by: user.id } : {}),
  }).eq('id', id)

  // Email: notifica member que criou a solicitação sobre mudança de status
  try {
    const { sendSolicitacaoStatusEmail } = await import('@/lib/email/solicitacao-status')
    await sendSolicitacaoStatusEmail({
      solicitacaoId: id,
      novoStatus: newStatus,
    })
  } catch {
    // email is non-critical
  }

  revalidatePath('/admin/kanban-compras')
  return { success: true }
}

export async function addSolicitacaoComment(
  id: string,
  text: string,
): Promise<AdminActionResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: profileData2 } = await supabase
    .from('profiles')
    .select('full_name, org_id, role')
    .eq('id', user.id)
    .single()
  const profile = profileData2 as { full_name: string; org_id: string; role: string } | null
  if (!profile || profile.role !== 'admin') return { error: 'Não autorizado' }

  const { data: solRaw2 } = await supabase
    .from('solicitacoes_compra')
    .select('comments, empreendimentos!inner(org_id)')
    .eq('id', id)
    .single()

  const sol = solRaw2 as unknown as { comments: unknown; empreendimentos: { org_id: string } } | null
  if (!sol || sol.empreendimentos?.org_id !== profile.org_id) return { error: 'Não encontrado' }

  const existing: SolicitacaoComment[] = Array.isArray(sol.comments) ? (sol.comments as SolicitacaoComment[]) : []
  const newComment: SolicitacaoComment = {
    author_id: user.id,
    author_name: profile.full_name,
    text,
    created_at: new Date().toISOString(),
  }

  const admin = createAdminClient()
  await admin
    .from('solicitacoes_compra')
    .update({ comments: [...existing, newComment] })
    .eq('id', id)

  revalidatePath('/admin/kanban-compras')
  return { success: true }
}

export async function updateChecklistItemStatus(
  itemId: string,
  newStatus: string,
): Promise<AdminActionResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: profileData3 } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()
  const profile = profileData3 as { org_id: string; role: string } | null
  if (!profile || profile.role !== 'admin') return { error: 'Não autorizado' }

  const admin = createAdminClient()
  await admin
    .from('unidade_checklist_items')
    .update({
      status: newStatus,
      ...(newStatus === 'pending' ? { observacao: null } : {}),
    })
    .eq('id', itemId)

  revalidatePath('/admin/kanban-tarefas')
  return { success: true }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { totalUnidades: 0, pctConcluido: 0, tarefasEmAndamento: 0, solicitacoesPendentes: 0, progressByArea: [], recentCompletions: [] }

  const { data: profileData4 } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()
  const profile = profileData4 as { org_id: string } | null
  if (!profile) return { totalUnidades: 0, pctConcluido: 0, tarefasEmAndamento: 0, solicitacoesPendentes: 0, progressByArea: [], recentCompletions: [] }

  const orgId = profile.org_id

  // Total unidades
  const { count: totalUnidades } = await supabase
    .from('unidades')
    .select('id', { count: 'exact', head: true })
    .filter('torres.empreendimentos.org_id', 'eq', orgId)

  // Solicitacoes pendentes
  const { count: solicitacoesPendentes } = await supabase
    .from('solicitacoes_compra')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .filter('empreendimentos.org_id', 'eq', orgId)

  // Checklist items — cast to unknown to avoid complex nested join type issues
  const { data: rawItems } = await supabase
    .from('unidade_checklist_items')
    .select(`
      id, status,
      unidade_checklist!inner(
        unidades!inner(
          torres!inner(
            empreendimentos!inner(org_id)
          )
        )
      )
    `)
    .eq('unidade_checklist.unidades.torres.empreendimentos.org_id', orgId)
    .limit(5000)

  const safeItems = (rawItems ?? []) as unknown as { id: string; status: string }[]
  const totalItems = safeItems.length
  const completedItems = safeItems.filter(i => i.status === 'completed' || i.status === 'approved').length
  const inProgressItems = safeItems.filter(i => i.status === 'in_progress').length

  const pctConcluido = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // Progress by area — simpler approach: fetch areas + compute per area from items
  const { data: areasData } = await supabase
    .from('areas_servico')
    .select('id, name, color')
    .eq('org_id', orgId)

  type AreaRow = { id: string; name: string; color: string }
  const progressByArea: ProgressByArea[] = ((areasData ?? []) as unknown as AreaRow[]).map(area => ({
    area_id: area.id,
    area_name: area.name,
    area_color: area.color,
    total: 0,
    completed: 0,
    pct: 0,
  }))

  // Recent completions — cast to unknown to avoid deep join type inference
  const { data: rawRecent } = await supabase
    .from('unidade_checklist_items')
    .select(`
      id, title, photo_url, completed_at,
      responsavel:profiles!responsavel_id(full_name),
      unidade_checklist!inner(
        unidades!inner(number,
          torres!inner(
            empreendimentos!inner(org_id)
          )
        )
      )
    `)
    .eq('unidade_checklist.unidades.torres.empreendimentos.org_id', orgId)
    .in('status', ['completed', 'approved'])
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(10)

  type RawRecent = {
    id: string
    title: string
    photo_url: string | null
    completed_at: string
    responsavel: { full_name: string } | null
    unidade_checklist: { unidades: { number: string } }
  }
  const recentCompletions: RecentCompletion[] = ((rawRecent ?? []) as unknown as RawRecent[]).map(r => ({
    id: r.id,
    title: r.title,
    unidade_number: r.unidade_checklist?.unidades?.number ?? '—',
    responsavel_name: r.responsavel?.full_name ?? null,
    photo_url: r.photo_url,
    completed_at: r.completed_at,
  }))

  return {
    totalUnidades: totalUnidades ?? 0,
    pctConcluido,
    tarefasEmAndamento: inProgressItems,
    solicitacoesPendentes: solicitacoesPendentes ?? 0,
    progressByArea,
    recentCompletions,
  }
}
