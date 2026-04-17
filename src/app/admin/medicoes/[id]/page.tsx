export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import MedicaoPdfButton from '@/components/medicoes/medicao-pdf-button'

type EtapaOrcamento = { id: string; nome: string; sort_order: number; itens_orcamento: Array<{ quantidade: number; preco_unitario: number }> }
type EtapaMedicao = { budget_stage_id?: unknown; etapa_orcamento_id: string; percentual_fisico: number; observacoes: string | null }

type Medicao = {
  id: string
  empreendimento_id: string
  orcamento_id: string
  mes_referencia: string
  observacoes: string | null
  empreendimentos: { name: string; org_id: string } | null
  orcamentos: { versao: number; etapas_orcamento: EtapaOrcamento[] } | null
  etapas_medicao: EtapaMedicao[]
}

export default async function MedicaoDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const { data: medData } = await admin
    .from('medicoes')
    .select(`
      id, empreendimento_id, orcamento_id, mes_referencia, observacoes,
      empreendimentos(name, org_id),
      orcamentos(versao, etapas_orcamento(id, nome, sort_order, itens_orcamento(quantidade, preco_unitario))),
      etapas_medicao(etapa_orcamento_id, percentual_fisico, observacoes)
    `)
    .eq('id', params.id)
    .maybeSingle()

  const medicao = medData as unknown as Medicao | null
  if (!medicao || medicao.empreendimentos?.org_id !== profile.org_id) notFound()

  // Busca custo real: soma de movimentos 'saida' vinculados a etapa_orcamento_id, até fim do mês de referência
  const mesDate = new Date(medicao.mes_referencia)
  const fimMes = new Date(mesDate.getFullYear(), mesDate.getMonth() + 1, 0, 23, 59, 59)

  const etapasIds = (medicao.orcamentos?.etapas_orcamento ?? []).map(et => et.id)
  const { data: movsData } = etapasIds.length > 0
    ? await admin
        .from('movimentos_estoque')
        .select('quantidade, etapa_orcamento_id, item_id')
        .eq('tipo', 'saida')
        .in('etapa_orcamento_id', etapasIds)
        .lte('created_at', fimMes.toISOString())
    : { data: [] }

  // Para cálculo simplificado, usa preço médio de recebimentos por item (via cotações)
  // Aqui, para MVP: assume custo real = 0 se não houver dado, e soma quantidade apropriada
  // pra cada etapa. Refino futuro: ligar ao preço do item recebido.
  const movsByEtapa = new Map<string, number>()  // qty total apropriada
  for (const m of (movsData ?? []) as Array<{ quantidade: number; etapa_orcamento_id: string }>) {
    movsByEtapa.set(m.etapa_orcamento_id, (movsByEtapa.get(m.etapa_orcamento_id) ?? 0) + Number(m.quantidade))
  }

  // Monta rows
  const pctByEtapa = new Map<string, number>()
  for (const em of medicao.etapas_medicao ?? []) {
    pctByEtapa.set(em.etapa_orcamento_id, Number(em.percentual_fisico))
  }

  const stages = [...(medicao.orcamentos?.etapas_orcamento ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  const rows = stages.map(s => {
    const subtotal = s.itens_orcamento.reduce((acc, it) => acc + Number(it.quantidade) * Number(it.preco_unitario), 0)
    const pct = pctByEtapa.get(s.id) ?? 0
    const valorFisico = subtotal * (pct / 100)
    const qtdApropriada = movsByEtapa.get(s.id) ?? 0
    return { id: s.id, nome: s.nome, subtotal, pct, valorFisico, qtdApropriada }
  })

  const totalBudgeted = rows.reduce((a, r) => a + r.subtotal, 0)
  const totalPhysical = rows.reduce((a, r) => a + r.valorFisico, 0)
  const overallPct = totalBudgeted > 0 ? (totalPhysical / totalBudgeted) * 100 : 0

  const mesStr = mesDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // Busca nome da org para cabeçalho do PDF
  const { data: orgData } = await admin.from('organizations').select('name').eq('id', profile.org_id).single()
  const orgName = (orgData as { name: string } | null)?.name ?? 'Empresa'

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/admin/medicoes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" />
        Medições
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold capitalize">{mesStr}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {medicao.empreendimentos?.name} · Orçamento v{medicao.orcamentos?.versao}
          </p>
        </div>
        <MedicaoPdfButton
          orgName={orgName}
          empreendimentoName={medicao.empreendimentos?.name ?? '—'}
          orcamentoVersao={medicao.orcamentos?.versao ?? 0}
          mesReferencia={medicao.mes_referencia}
          rows={rows}
          totalBudgeted={totalBudgeted}
          totalPhysical={totalPhysical}
          observacoes={medicao.observacoes}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Avanço físico</div>
          <div className="text-xl font-bold">{overallPct.toFixed(1)}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Orçado total</div>
          <div className="text-xl font-bold tabular-nums">{formatCurrency(totalBudgeted)}</div>
        </Card>
        <Card className="p-4 border-primary/40 bg-primary/5">
          <div className="text-xs text-muted-foreground mb-1">Valor do %</div>
          <div className="text-xl font-bold tabular-nums text-primary">{formatCurrency(totalPhysical)}</div>
        </Card>
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left py-2 pl-4 pr-2 font-medium">Etapa</th>
              <th className="text-right py-2 px-2 font-medium">% Físico</th>
              <th className="text-right py-2 px-2 font-medium">Orçado</th>
              <th className="text-right py-2 px-2 font-medium">Valor do %</th>
              <th className="text-right py-2 pr-4 pl-2 font-medium">Qtd apropriada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="py-2 pl-4 pr-2">{r.nome}</td>
                <td className="py-2 px-2 text-right tabular-nums">{r.pct.toFixed(1)}%</td>
                <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(r.subtotal)}</td>
                <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(r.valorFisico)}</td>
                <td className="py-2 pr-4 pl-2 text-right tabular-nums text-muted-foreground">
                  {r.qtdApropriada > 0 ? r.qtdApropriada.toFixed(2) : '-'}
                </td>
              </tr>
            ))}
            <tr className="font-semibold bg-muted/40">
              <td className="py-2 pl-4 pr-2">TOTAL</td>
              <td className="py-2 px-2 text-right tabular-nums">{overallPct.toFixed(1)}%</td>
              <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(totalBudgeted)}</td>
              <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(totalPhysical)}</td>
              <td className="py-2 pr-4 pl-2" />
            </tr>
          </tbody>
        </table>
      </Card>

      {medicao.observacoes && (
        <Card className="p-4 mt-4">
          <div className="text-xs text-muted-foreground mb-1">Observações</div>
          <div className="text-sm">{medicao.observacoes}</div>
        </Card>
      )}
    </div>
  )
}
