export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ClipboardCheck, ChevronRight } from 'lucide-react'
import NovaFvsDialog from '@/components/fvs/nova-fvs-dialog'

type Emp = { id: string; name: string }
type Area = { id: string; name: string; icon: string; color: string }
type ProfileOption = { id: string; full_name: string }

type FvsRow = {
  id: string
  empreendimento_id: string
  area_servico_id: string
  status: string
  responsavel_id: string | null
  created_at: string
  empreendimentos: { name: string } | null
  areas_servico: { name: string; color: string } | null
  profiles: { full_name: string } | null
}

type CellRow = {
  verificacao_id: string
  status: 'nao_inspecionado' | 'aprovado' | 'reprovado' | 'aprovado_reinspecao'
}

export default async function FvsListPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const [empsRes, areasRes, membersRes, fvsRes] = await Promise.all([
    admin.from('empreendimentos').select('id, name').eq('org_id', profile.org_id).order('name'),
    admin.from('areas_servico').select('id, name, icon, color').eq('org_id', profile.org_id).order('name'),
    admin.from('profiles').select('id, full_name').eq('org_id', profile.org_id).order('full_name'),
    admin
      .from('verificacoes_servico')
      .select('id, empreendimento_id, area_servico_id, status, responsavel_id, created_at, empreendimentos(name), areas_servico(name, color), profiles(full_name)')
      .order('created_at', { ascending: false }),
  ])

  const empreendimentos = (empsRes.data ?? []) as Emp[]
  const areas = (areasRes.data ?? []) as Area[]
  const members = (membersRes.data ?? []) as ProfileOption[]

  // Filtra FVS da org
  const empIds = new Set(empreendimentos.map(e => e.id))
  const fvsList = ((fvsRes.data ?? []) as unknown as FvsRow[]).filter(f => empIds.has(f.empreendimento_id))

  // Busca cells de todas FVS pra calcular progresso
  const fvsIds = fvsList.map(f => f.id)
  const cellsByFvs = new Map<string, { total: number; aprovado: number; reprovado: number; reinspecao: number }>()

  if (fvsIds.length > 0) {
    const { data: cellsData } = await admin
      .from('verificacao_unidades')
      .select('verificacao_id, status')
      .in('verificacao_id', fvsIds)
    const cells = (cellsData ?? []) as CellRow[]

    for (const c of cells) {
      if (!cellsByFvs.has(c.verificacao_id)) {
        cellsByFvs.set(c.verificacao_id, { total: 0, aprovado: 0, reprovado: 0, reinspecao: 0 })
      }
      const stats = cellsByFvs.get(c.verificacao_id)!
      stats.total++
      if (c.status === 'aprovado') stats.aprovado++
      else if (c.status === 'reprovado') stats.reprovado++
      else if (c.status === 'aprovado_reinspecao') stats.reinspecao++
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            FVS — Fichas de Verificação
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Inspeção formal por área de serviço. Matriz etapas × unidades por andar.
          </p>
        </div>
        <NovaFvsDialog
          empreendimentos={empreendimentos}
          areas={areas}
          members={members}
        />
      </div>

      {fvsList.length === 0 ? (
        <Card className="p-16 text-center">
          <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma FVS criada</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            A FVS substitui a ficha de verificação em papel. Selecione um empreendimento e uma área de serviço
            para gerar a matriz de inspeção automaticamente.
          </p>
          <NovaFvsDialog empreendimentos={empreendimentos} areas={areas} members={members} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fvsList.map(fvs => {
            const stats = cellsByFvs.get(fvs.id) ?? { total: 0, aprovado: 0, reprovado: 0, reinspecao: 0 }
            const inspecionado = stats.aprovado + stats.reprovado + stats.reinspecao
            const pctInspecionado = stats.total > 0 ? Math.round((inspecionado / stats.total) * 100) : 0

            return (
              <Link key={fvs.id} href={`/admin/fvs/${fvs.id}`}>
                <Card className="p-5 hover:bg-accent/40 transition-colors cursor-pointer group h-full">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge
                          style={{ backgroundColor: fvs.areas_servico?.color ?? '#6366f1', color: '#fff' }}
                        >
                          {fvs.areas_servico?.name ?? '—'}
                        </Badge>
                        <Badge variant={fvs.status === 'concluida' ? 'default' : 'outline'}>
                          {fvs.status === 'concluida' ? 'Concluída' : 'Em andamento'}
                        </Badge>
                      </div>
                      <div className="font-semibold">{fvs.empreendimentos?.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {fvs.profiles?.full_name ? `Responsável: ${fvs.profiles.full_name}` : 'Sem responsável'}
                        {' · '}{stats.total} verificações
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Inspecionado</span>
                        <span className="font-medium">{pctInspecionado}%</span>
                      </div>
                      <Progress value={pctInspecionado} className="h-2" />
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-emerald-600 font-medium">✓ {stats.aprovado + stats.reinspecao}</span>
                      <span className="text-red-600 font-medium">✗ {stats.reprovado}</span>
                      <span className="text-muted-foreground">○ {stats.total - inspecionado}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
