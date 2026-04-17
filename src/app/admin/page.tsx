export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getDashboardStats } from '@/actions/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardChart from '@/components/admin/dashboard-chart'
import { Building2, CheckCircle2, Loader2, ShoppingCart, AlertTriangle, ShieldAlert, Package, MessageSquare, ClipboardCheck } from 'lucide-react'
import Image from 'next/image'

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Unidades</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUnidades}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">% Concluído</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pctConcluido}%</div>
            <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${stats.pctConcluido}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
            <Loader2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tarefasEmAndamento}</div>
            <div className="text-xs text-muted-foreground">tarefas</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compras Pendentes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.solicitacoesPendentes}</div>
            <div className="text-xs text-muted-foreground">solicitações</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso por Área</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardChart data={stats.progressByArea} />
          </CardContent>
        </Card>

        {/* Recent completions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas Conclusões</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentCompletions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma tarefa concluída ainda.</p>
            ) : (
              <ul className="space-y-3">
                {stats.recentCompletions.map(item => (
                  <li key={item.id} className="flex items-center gap-3">
                    {item.photo_url ? (
                      <Image
                        src={item.photo_url}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-muted rounded shrink-0 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Unid. {item.unidade_number}
                        {item.responsavel_name && ` · ${item.responsavel_name}`}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {formatRelative(item.completed_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── ALERTAS CROSS-MODULE ─── */}
      <IntegrationAlerts />
    </div>
  )
}

async function IntegrationAlerts() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = (profileData as { org_id: string } | null)?.org_id
  if (!orgId) return null

  // Queries paralelas — KPIs cross-module
  const [treinVencidos, estoqueBaixo, chamadosAbertos, fvsReprovadas] = await Promise.all([
    // 1. Treinamentos vencidos
    admin
      .from('treinamentos')
      .select('id, funcionarios!inner(org_id)', { count: 'exact', head: true })
      .eq('funcionarios.org_id', orgId)
      .lt('data_vencimento', new Date().toISOString().slice(0, 10)),

    // 2. Estoque abaixo do mínimo (saldo < min onde min > 0)
    admin
      .from('saldos_estoque')
      .select('item_id, saldo, estoque_minimo')
      .eq('org_id', orgId)
      .gt('estoque_minimo', 0),

    // 3. Chamados abertos
    admin.from('empreendimentos').select('id').eq('org_id', orgId).then(async res => {
      const empIds = ((res.data ?? []) as Array<{ id: string }>).map(e => e.id)
      if (empIds.length === 0) return { count: 0 }
      const { count } = await admin
        .from('chamados_assistencia')
        .select('id', { count: 'exact', head: true })
        .in('empreendimento_id', empIds)
        .in('status', ['aberto', 'em_andamento'])
      return { count: count ?? 0 }
    }),

    // 4. FVS cells reprovadas não resolvidas
    admin.from('empreendimentos').select('id').eq('org_id', orgId).then(async res => {
      const empIds = ((res.data ?? []) as Array<{ id: string }>).map(e => e.id)
      if (empIds.length === 0) return { count: 0 }
      const { data: fvsIds } = await admin
        .from('verificacoes_servico')
        .select('id')
        .in('empreendimento_id', empIds)
        .eq('status', 'em_andamento')
      const ids = ((fvsIds ?? []) as Array<{ id: string }>).map(f => f.id)
      if (ids.length === 0) return { count: 0 }
      const { count } = await admin
        .from('verificacao_unidades')
        .select('id', { count: 'exact', head: true })
        .in('verificacao_id', ids)
        .eq('status', 'reprovado')
      return { count: count ?? 0 }
    }),
  ])

  const numTreinVencidos = treinVencidos.count ?? 0

  // Estoque: conta items com saldo total < mínimo
  const balancesByItem = new Map<string, { saldo: number; min: number }>()
  for (const b of (estoqueBaixo.data ?? []) as Array<{ item_id: string; saldo: number; estoque_minimo: number }>) {
    const cur = balancesByItem.get(b.item_id) ?? { saldo: 0, min: Number(b.estoque_minimo) }
    cur.saldo += Number(b.saldo)
    balancesByItem.set(b.item_id, cur)
  }
  const numEstoqueBaixo = Array.from(balancesByItem.values()).filter(v => v.saldo < v.min).length

  const numChamados = chamadosAbertos.count ?? 0
  const numFvsReprovadas = fvsReprovadas.count ?? 0

  const totalAlertas = numTreinVencidos + numEstoqueBaixo + numChamados + numFvsReprovadas
  if (totalAlertas === 0) return null

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        Alertas do sistema
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {numTreinVencidos > 0 && (
          <Link href="/admin/treinamentos">
            <Card className="p-4 border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-8 w-8 text-red-500 shrink-0" />
                <div>
                  <div className="text-2xl font-bold text-red-700">{numTreinVencidos}</div>
                  <div className="text-xs text-red-600">treinamento(s) vencido(s)</div>
                </div>
              </div>
            </Card>
          </Link>
        )}

        {numEstoqueBaixo > 0 && (
          <Link href="/admin/estoque">
            <Card className="p-4 border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-amber-500 shrink-0" />
                <div>
                  <div className="text-2xl font-bold text-amber-700">{numEstoqueBaixo}</div>
                  <div className="text-xs text-amber-600">item(s) abaixo do mínimo</div>
                </div>
              </div>
            </Card>
          </Link>
        )}

        {numChamados > 0 && (
          <Link href="/admin/chamados">
            <Card className="p-4 border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-blue-500 shrink-0" />
                <div>
                  <div className="text-2xl font-bold text-blue-700">{numChamados}</div>
                  <div className="text-xs text-blue-600">chamado(s) aberto(s)</div>
                </div>
              </div>
            </Card>
          </Link>
        )}

        {numFvsReprovadas > 0 && (
          <Link href="/admin/fvs">
            <Card className="p-4 border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-8 w-8 text-red-500 shrink-0" />
                <div>
                  <div className="text-2xl font-bold text-red-700">{numFvsReprovadas}</div>
                  <div className="text-xs text-red-600">FVS reprovação(ões) pendente(s)</div>
                </div>
              </div>
            </Card>
          </Link>
        )}
      </div>
    </div>
  )
}
