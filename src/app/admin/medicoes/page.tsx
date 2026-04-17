export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardCheck, Plus } from 'lucide-react'

type Medicao = {
  id: string
  empreendimento_id: string
  mes_referencia: string
  observacoes: string | null
  empreendimentos: { name: string } | null
  etapas_medicao: Array<{ percentual_fisico: number }>
}

export default async function MedicoesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  // Busca medições filtradas pela org via join com empreendimento
  const { data: emps } = await admin.from('empreendimentos').select('id').eq('org_id', profile.org_id)
  const empIds = ((emps ?? []) as Array<{ id: string }>).map(e => e.id)

  let medicoes: Medicao[] = []
  if (empIds.length > 0) {
    const { data } = await admin
      .from('medicoes')
      .select(`
        id, empreendimento_id, mes_referencia, observacoes,
        empreendimentos(name),
        etapas_medicao(percentual_fisico)
      `)
      .in('empreendimento_id', empIds)
      .order('mes_referencia', { ascending: false })
      .limit(100)
    medicoes = (data ?? []) as unknown as Medicao[]
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            Medições
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Avanço físico mensal por etapa + custo real (apropriado via estoque).
          </p>
        </div>
        <Link href="/admin/medicoes/nova">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova medição
          </Button>
        </Link>
      </div>

      {medicoes.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="text-5xl mb-3 opacity-20">📊</div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma medição</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Crie orçamento + etapas antes. A medição capta o % físico executado por etapa e
            calcula POC com base em material apropriado.
          </p>
          <Link href="/admin/medicoes/nova">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar medição
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {medicoes.map(m => {
            const pcts = (m.etapas_medicao ?? []).map(et => Number(et.percentual_fisico))
            const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0
            const month = new Date(m.mes_referencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            return (
              <Link key={m.id} href={`/admin/medicoes/${m.id}`}>
                <Card className="p-4 flex items-center justify-between hover:bg-accent/40 transition-colors cursor-pointer">
                  <div>
                    <div className="font-medium capitalize">{month} — {m.empreendimentos?.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {pcts.length} etapa(s){m.observacoes ? ` · ${m.observacoes.slice(0, 60)}${m.observacoes.length > 60 ? '…' : ''}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{avg.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">avanço médio</div>
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
