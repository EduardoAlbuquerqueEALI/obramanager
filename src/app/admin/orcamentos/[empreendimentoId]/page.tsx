export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, History } from 'lucide-react'
import OrcamentoEditor from '@/components/orcamentos/orcamento-editor'
import NovoOrcamentoDialog from '@/components/orcamentos/novo-orcamento-dialog'

type Etapa = {
  id: string
  nome: string
  sort_order: number
  itens_orcamento: Array<{
    id: string
    descricao: string
    unidade: string
    quantidade: number
    preco_unitario: number
    codigo_sinapi: string | null
    observacoes: string | null
    sort_order: number
  }>
}

type Orcamento = {
  id: string
  empreendimento_id: string
  versao: number
  nome: string
  status: 'rascunho' | 'ativo' | 'congelado' | 'substituido'
  bdi_percent: number
  contingencia_percent: number
  congelado_em: string | null
  total_congelado: number | null
  observacoes: string | null
  etapas_orcamento: Etapa[]
}

export default async function OrcamentoEmpreendimentoPage({
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

  // Orçamento corrente (maior versão, não substituído)
  const { data: orcData } = await admin
    .from('orcamentos')
    .select(`
      id, empreendimento_id, versao, nome, status, bdi_percent, contingencia_percent,
      congelado_em, total_congelado, observacoes,
      etapas_orcamento(id, nome, sort_order, itens_orcamento(id, descricao, unidade, quantidade, preco_unitario, codigo_sinapi, observacoes, sort_order))
    `)
    .eq('empreendimento_id', emp.id)
    .neq('status', 'substituido')
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()

  const orcamento = orcData as Orcamento | null

  // Ordena stages + items
  if (orcamento) {
    orcamento.etapas_orcamento?.sort((a, b) => a.sort_order - b.sort_order)
    for (const et of orcamento.etapas_orcamento ?? []) {
      et.itens_orcamento?.sort((a, b) => a.sort_order - b.sort_order)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link
        href="/admin/orcamentos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-4 w-4" />
        Orçamentos
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Empreendimento</div>
          <h1 className="text-2xl font-bold">{emp.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/orcamentos/${emp.id}/revisoes`}>
            <Button variant="outline" size="sm">
              <History className="h-4 w-4 mr-2" />
              Revisões
            </Button>
          </Link>
          {!orcamento && <NovoOrcamentoDialog empreendimentoId={emp.id} />}
        </div>
      </div>

      {!orcamento ? (
        <Card className="p-16 text-center">
          <div className="text-5xl mb-3 opacity-20">💰</div>
          <h3 className="text-lg font-semibold mb-2">Nenhum orçamento</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Monte o orçamento por etapas (fundação, estrutura, acabamento…) com serviços,
            BDI e contingência. Congele para virar referência para medições.
          </p>
          <NovoOrcamentoDialog empreendimentoId={emp.id} />
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="outline" className="font-mono">v{orcamento.versao}</Badge>
            <Badge variant="outline">{STATUS_LABEL[orcamento.status]}</Badge>
            {orcamento.status === 'congelado' && orcamento.congelado_em && (
              <span className="text-xs text-muted-foreground">
                Congelado em {new Date(orcamento.congelado_em).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          <OrcamentoEditor orcamento={orcamento} empreendimentoId={emp.id} />
        </>
      )}
    </div>
  )
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  congelado: 'Congelado',
  substituido: 'Substituído',
}
