export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import KanbanTarefas from '@/components/admin/kanban-tarefas'
import type { TarefaCard, KanbanTarefasColumnId } from '@/types/kanban'

function computeVirtualColumn(status: string, observacao: string | null): KanbanTarefasColumnId {
  if (status === 'completed' || status === 'approved') return 'concluido'
  if (status === 'in_progress') return 'em_andamento'
  if (status === 'pending' && observacao) return 'com_pendencia'
  return 'pendente'
}

export default async function KanbanTarefasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: string } | null
  if (!profile || profile.role !== 'admin') redirect('/admin')

  const { data: rawData } = await admin
    .from('unidade_checklist_items')
    .select(`
      id, title, status, observacao, photo_url, completed_at,
      responsavel:profiles!responsavel_id(id, full_name),
      unidade_checklist!inner(
        id,
        unidades!inner(
          number,
          torres!inner(
            name,
            empreendimentos!inner(id, name, org_id)
          )
        ),
        checklist_templates!inner(
          areas_servico(id, name, color)
        )
      )
    `)
    .eq('unidade_checklist.unidades.torres.empreendimentos.org_id', profile.org_id)
    .order('created_at', { ascending: false })

  type RawItem = {
    id: string; title: string; status: string; observacao: string | null
    photo_url: string | null; completed_at: string | null
    responsavel: { id: string; full_name: string } | null
    unidade_checklist: {
      id: string
      unidades: { number: string; torres: { name: string; empreendimentos: { name: string } } }
      checklist_templates: { areas_servico: { id: string; name: string; color: string } | null }
    }
  }
  const raw = (rawData ?? []) as unknown as RawItem[]

  const cards: TarefaCard[] = raw.map((r) => {
    const uc = r.unidade_checklist
    const area = uc?.checklist_templates?.areas_servico
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      observacao: r.observacao,
      virtual_column: computeVirtualColumn(r.status, r.observacao),
      unidade_number: uc?.unidades?.number ?? '—',
      torre_name: uc?.unidades?.torres?.name ?? '—',
      empreendimento_name: uc?.unidades?.torres?.empreendimentos?.name ?? '—',
      area_name: area?.name ?? '—',
      area_color: area?.color ?? '#999',
      responsavel_name: r.responsavel?.full_name ?? null,
      responsavel_id: r.responsavel?.id ?? null,
      photo_url: r.photo_url,
      completed_at: r.completed_at,
      unidade_checklist_id: uc?.id ?? '',
    }
  })

  const [empreendimentosResult, areasResult, membrosResult] = await Promise.all([
    admin.from('empreendimentos').select('id, name').eq('org_id', profile.org_id).order('name'),
    admin.from('areas_servico').select('id, name').eq('org_id', profile.org_id).order('name'),
    admin.from('profiles').select('id, full_name').eq('org_id', profile.org_id).order('full_name'),
  ])

  return (
    <KanbanTarefas
      initialCards={cards}
      empreendimentos={empreendimentosResult.data ?? []}
      areas={areasResult.data ?? []}
      membros={membrosResult.data ?? []}
    />
  )
}
