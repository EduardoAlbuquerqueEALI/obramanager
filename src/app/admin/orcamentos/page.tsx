export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calculator, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

type EmpRow = { id: string; name: string; city: string | null; state: string | null }

type OrcamentoStatus = 'rascunho' | 'ativo' | 'congelado' | 'substituido'
type OrcamentoRow = {
  id: string
  empreendimento_id: string
  versao: number
  status: OrcamentoStatus
  total_congelado: number | null
  bdi_percent: number
  contingencia_percent: number
  etapas_orcamento: Array<{ itens_orcamento: Array<{ quantidade: number; preco_unitario: number }> }>
}

const STATUS_LABELS: Record<OrcamentoStatus, { label: string; className: string }> = {
  rascunho:    { label: 'Rascunho',    className: 'bg-gray-100 text-gray-800' },
  ativo:       { label: 'Ativo',       className: 'bg-blue-100 text-blue-800' },
  congelado:   { label: 'Congelado',   className: 'bg-emerald-100 text-emerald-800' },
  substituido: { label: 'Substituído', className: 'bg-gray-100 text-gray-500' },
}

function calcTotal(orc: OrcamentoRow) {
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

export default async function OrcamentosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const [empsResult, orcsResult] = await Promise.all([
    admin.from('empreendimentos').select('id, name, city, state').eq('org_id', profile.org_id).order('name'),
    admin
      .from('orcamentos')
      .select('id, empreendimento_id, versao, status, total_congelado, bdi_percent, contingencia_percent, etapas_orcamento(itens_orcamento(quantidade, preco_unitario))')
      .neq('status', 'substituido'),
  ])

  const emps = (empsResult.data ?? []) as EmpRow[]
  const orcs = (orcsResult.data ?? []) as OrcamentoRow[]

  // Pega o orçamento ativo/corrente por empreendimento (maior versão, não substituído)
  const byEmp = new Map<string, OrcamentoRow>()
  for (const orc of orcs) {
    const current = byEmp.get(orc.empreendimento_id)
    if (!current || orc.versao > current.versao) byEmp.set(orc.empreendimento_id, orc)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Orçamentos
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Um orçamento ativo por empreendimento. Congele para gerar revisões (aditivos).
        </p>
      </div>

      {emps.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          Cadastre um empreendimento primeiro em <Link href="/admin/empreendimentos" className="underline">Empreendimentos</Link>.
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {emps.map(emp => {
          const orc = byEmp.get(emp.id)
          const total = orc ? calcTotal(orc) : 0
          return (
            <Link key={emp.id} href={`/admin/orcamentos/${emp.id}`}>
              <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{emp.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[emp.city, emp.state].filter(Boolean).join(', ') || 'Sem localização'}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
                </div>
                {orc ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="font-mono text-xs" variant="outline">v{orc.versao}</Badge>
                      <Badge className={STATUS_LABELS[orc.status].className}>{STATUS_LABELS[orc.status].label}</Badge>
                    </div>
                    <div className="text-lg font-bold tabular-nums">{formatCurrency(total)}</div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">Sem orçamento — clique para criar</div>
                )}
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
