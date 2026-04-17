export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import KanbanCompras from '@/components/admin/kanban-compras'
import type { SolicitacaoCard, SolicitacaoComment } from '@/types/kanban'

export default async function KanbanComprasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: string } | null
  if (!profile || profile.role !== 'admin') redirect('/admin')

  const { data: rawData } = await admin
    .from('solicitacoes_compra')
    .select(`
      id, title, description, status, urgencia, comments, items, created_at, approved_by,
      empreendimentos!inner(id, name, org_id),
      unidades(number),
      areas_servico(name),
      profiles!requested_by(full_name)
    `)
    .eq('empreendimentos.org_id', profile.org_id)
    .order('created_at', { ascending: false })

  type RawSol = {
    id: string; title: string; description: string | null; status: string; urgencia: string
    comments: unknown; items: unknown; created_at: string; approved_by: string | null
    empreendimentos: { name: string }; unidades: { number: string } | null
    areas_servico: { name: string } | null; profiles: { full_name: string } | null
  }
  const raw = (rawData ?? []) as unknown as RawSol[]

  const cards: SolicitacaoCard[] = raw.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status as SolicitacaoCard['status'],
    urgencia: r.urgencia,
    empreendimento_name: r.empreendimentos?.name ?? '—',
    unidade_number: r.unidades?.number ?? null,
    area_name: r.areas_servico?.name ?? null,
    requested_by_name: r.profiles?.full_name ?? '—',
    comments: Array.isArray(r.comments) ? (r.comments as SolicitacaoComment[]) : [],
    items: r.items,
    created_at: r.created_at,
    approved_by: r.approved_by,
  }))

  const [empreendimentosResult, areasResult] = await Promise.all([
    admin.from('empreendimentos').select('id, name').eq('org_id', profile.org_id).order('name'),
    admin.from('areas_servico').select('id, name').eq('org_id', profile.org_id).order('name'),
  ])

  return (
    <KanbanCompras
      initialCards={cards}
      empreendimentos={empreendimentosResult.data ?? []}
      areas={areasResult.data ?? []}
    />
  )
}
