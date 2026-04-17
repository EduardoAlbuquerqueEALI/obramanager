export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft } from 'lucide-react'
import FvsMatrix from '@/components/fvs/fvs-matrix'

type FvsRow = {
  id: string
  empreendimento_id: string
  area_servico_id: string
  status: string
  responsavel_id: string | null
  empreendimentos: { name: string; org_id: string } | null
  areas_servico: { name: string; color: string } | null
  profiles: { full_name: string } | null
}

type CellRow = {
  id: string
  unidade_id: string
  template_item_id: string
  template_item_title: string
  status: 'nao_inspecionado' | 'aprovado' | 'reprovado' | 'aprovado_reinspecao'
  observacao: string | null
  solucao: string | null
  foto_url: string | null
  inspecionado_em: string | null
}

type UnidadeRow = {
  id: string
  number: string
  floor: number
  torre_id: string
  torres: { name: string } | null
}

export default async function FvsDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const { data: fvsData } = await admin
    .from('verificacoes_servico')
    .select('id, empreendimento_id, area_servico_id, status, responsavel_id, empreendimentos(name, org_id), areas_servico(name, color), profiles(full_name)')
    .eq('id', params.id)
    .maybeSingle()

  const fvs = fvsData as unknown as FvsRow | null
  if (!fvs || fvs.empreendimentos?.org_id !== profile.org_id) notFound()

  // Busca TODAS cells + unidades
  const [cellsRes, unidadesRes] = await Promise.all([
    admin
      .from('verificacao_unidades')
      .select('id, unidade_id, template_item_id, template_item_title, status, observacao, solucao, foto_url, inspecionado_em')
      .eq('verificacao_id', fvs.id),
    admin
      .from('unidades')
      .select('id, number, floor, torre_id, torres(name)')
      .in('torre_id', (
        await admin.from('torres').select('id').eq('empreendimento_id', fvs.empreendimento_id)
      ).data?.map((t: { id: string }) => t.id) ?? [])
      .order('floor')
      .order('number'),
  ])

  const cells = (cellsRes.data ?? []) as CellRow[]
  const unidades = (unidadesRes.data ?? []) as unknown as UnidadeRow[]

  // Stats
  const total = cells.length
  const aprovado = cells.filter(c => c.status === 'aprovado' || c.status === 'aprovado_reinspecao').length
  const reprovado = cells.filter(c => c.status === 'reprovado').length
  const inspecionado = aprovado + reprovado
  const pctInspecionado = total > 0 ? Math.round((inspecionado / total) * 100) : 0

  // Extrai etapas distintas (mantém ordem do template)
  const etapasMap = new Map<string, string>()
  for (const c of cells) {
    if (!etapasMap.has(c.template_item_id)) {
      etapasMap.set(c.template_item_id, c.template_item_title)
    }
  }
  const etapas = Array.from(etapasMap.entries()).map(([id, title]) => ({ id, title }))

  // Extrai andares distintos
  const floors = Array.from(new Set(unidades.map(u => u.floor))).sort((a, b) => a - b)

  return (
    <div className="p-8 max-w-[100rem] mx-auto">
      <Link
        href="/admin/fvs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-4 w-4" />
        Fichas de verificação
      </Link>

      {/* Header */}
      <Card className="p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge style={{ backgroundColor: fvs.areas_servico?.color ?? '#6366f1', color: '#fff' }} className="text-base px-3 py-1">
                {fvs.areas_servico?.name ?? 'Área'}
              </Badge>
              <Badge variant={fvs.status === 'concluida' ? 'default' : 'outline'}>
                {fvs.status === 'concluida' ? 'Concluída' : 'Em andamento'}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold">{fvs.empreendimentos?.name}</h1>
            <div className="text-sm text-muted-foreground mt-1">
              {fvs.profiles?.full_name ? `Responsável: ${fvs.profiles.full_name}` : 'Sem responsável atribuído'}
              {' · '}{total} verificações · {etapas.length} etapas · {unidades.length} unidades · {floors.length} andares
            </div>
          </div>

          <div className="shrink-0 w-full md:w-64 space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progresso geral</span>
                <span className="font-semibold">{pctInspecionado}% inspecionado</span>
              </div>
              <Progress value={pctInspecionado} className="h-3" />
            </div>
            <div className="flex gap-4 text-xs justify-center">
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-emerald-500" /> {aprovado} aprovados</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-red-500" /> {reprovado} reprovados</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-gray-300" /> {total - inspecionado} pendentes</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Legenda */}
      <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
        <span className="font-semibold">Legenda:</span>
        <span className="flex items-center gap-1"><span className="inline-flex h-6 w-6 items-center justify-center rounded border bg-gray-50 text-gray-400 font-bold">○</span> Não inspecionado</span>
        <span className="flex items-center gap-1"><span className="inline-flex h-6 w-6 items-center justify-center rounded border bg-emerald-100 text-emerald-700 font-bold">O</span> Aprovado</span>
        <span className="flex items-center gap-1"><span className="inline-flex h-6 w-6 items-center justify-center rounded border bg-red-100 text-red-700 font-bold">X</span> Reprovado</span>
        <span className="flex items-center gap-1"><span className="inline-flex h-6 w-6 items-center justify-center rounded border bg-blue-100 text-blue-700 font-bold">⊕</span> Aprovado após reinspeção</span>
      </div>

      {/* Matriz */}
      <FvsMatrix
        fvsId={fvs.id}
        etapas={etapas}
        unidades={unidades}
        cells={cells}
        floors={floors}
      />
    </div>
  )
}
