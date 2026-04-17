export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, History } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

type Orcamento = {
  id: string
  versao: number
  parent_id: string | null
  nome: string
  status: 'rascunho' | 'ativo' | 'congelado' | 'substituido'
  bdi_percent: number
  contingencia_percent: number
  congelado_em: string | null
  total_congelado: number | null
  created_at: string
  etapas_orcamento: Array<{
    itens_orcamento: Array<{ quantidade: number; preco_unitario: number }>
  }>
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  rascunho:    { label: 'Rascunho',    className: 'bg-gray-100 text-gray-800' },
  ativo:       { label: 'Ativo',       className: 'bg-blue-100 text-blue-800' },
  congelado:   { label: 'Congelado',   className: 'bg-emerald-100 text-emerald-800' },
  substituido: { label: 'Substituído', className: 'bg-gray-100 text-gray-500' },
}

function calcTotal(orc: Orcamento) {
  if (orc.status === 'congelado' && orc.total_congelado != null) return Number(orc.total_congelado)
  const subtotal = (orc.etapas_orcamento ?? []).reduce((acc, et) => {
    return acc + (et.itens_orcamento ?? []).reduce(
      (sa, it) => sa + Number(it.quantidade) * Number(it.preco_unitario),
      0,
    )
  }, 0)
  // BDI e Contingência paralelos sobre subtotal (padrão TCU)
  return subtotal * (1 + Number(orc.bdi_percent) / 100 + Number(orc.contingencia_percent) / 100)
}

export default async function RevisoesPage({
  params,
}: {
  params: { empreendimentoId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const { data: empData } = await admin
    .from('empreendimentos')
    .select('id, name, org_id')
    .eq('id', params.empreendimentoId)
    .eq('org_id', profile.org_id)
    .maybeSingle()
  const emp = empData as { id: string; name: string } | null
  if (!emp) notFound()

  const { data: orcsData } = await admin
    .from('orcamentos')
    .select(`
      id, versao, parent_id, nome, status, bdi_percent, contingencia_percent,
      congelado_em, total_congelado, created_at,
      etapas_orcamento(itens_orcamento(quantidade, preco_unitario))
    `)
    .eq('empreendimento_id', emp.id)
    .order('versao', { ascending: false })

  const orcs = (orcsData ?? []) as Orcamento[]

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href={`/admin/orcamentos/${emp.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-4 w-4" />
        Orçamento
      </Link>

      <div className="mb-6">
        <div className="text-xs text-muted-foreground mb-1">{emp.name}</div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" />
          Histórico de revisões
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Todas as versões do orçamento deste empreendimento.
        </p>
      </div>

      {orcs.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhuma versão de orçamento ainda.
        </Card>
      ) : (
        <div className="space-y-2">
          {orcs.map(orc => {
            const cfg = STATUS_LABELS[orc.status] ?? STATUS_LABELS.rascunho
            const total = calcTotal(orc)
            return (
              <Link key={orc.id} href={`/admin/orcamentos/${emp.id}`}>
                <Card className="p-4 flex items-center justify-between hover:bg-accent/40 transition-colors cursor-pointer">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">v{orc.versao}</Badge>
                      <Badge className={cfg.className}>{cfg.label}</Badge>
                      <span className="font-medium truncate">{orc.nome}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Criado em {new Date(orc.created_at).toLocaleDateString('pt-BR')}
                      {orc.congelado_em && ` · Congelado em ${new Date(orc.congelado_em).toLocaleDateString('pt-BR')}`}
                      {orc.parent_id && ' · Revisão de versão anterior'}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-lg font-semibold tabular-nums">{formatCurrency(total)}</div>
                    <div className="text-xs text-muted-foreground">
                      {(orc.etapas_orcamento ?? []).length} etapa(s)
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
