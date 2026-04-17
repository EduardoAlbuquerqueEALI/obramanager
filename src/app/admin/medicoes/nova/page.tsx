export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import NovaMedicaoForm from '@/components/medicoes/nova-medicao-form'

type EmpOrc = {
  id: string
  name: string
  orcamentos: Array<{
    id: string
    versao: number
    status: string
    etapas_orcamento: Array<{
      id: string
      nome: string
      sort_order: number
      itens_orcamento: Array<{ quantidade: number; preco_unitario: number }>
    }>
  }>
}

export default async function NovaMedicaoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  // Busca empreendimentos com orçamento ativo + etapas
  const { data: empsData } = await admin
    .from('empreendimentos')
    .select(`
      id, name,
      orcamentos(id, versao, status, etapas_orcamento(id, nome, sort_order, itens_orcamento(quantidade, preco_unitario)))
    `)
    .eq('org_id', profile.org_id)
    .order('name')

  const empOrcs = ((empsData ?? []) as unknown as EmpOrc[]).map(emp => {
    // Pega maior versão não substituída
    const active = (emp.orcamentos ?? [])
      .filter(o => o.status !== 'substituido')
      .sort((a, b) => b.versao - a.versao)[0]
    return { ...emp, activeOrcamento: active ?? null }
  })

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/admin/medicoes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" />
        Medições
      </Link>

      <h1 className="text-2xl font-bold mb-1">Nova medição</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Selecione o empreendimento e informe o % físico executado por etapa.
      </p>

      {empOrcs.filter(e => e.activeOrcamento).length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhum empreendimento com orçamento ativo. Crie um orçamento com etapas antes de medir.
        </Card>
      ) : (
        <NovaMedicaoForm empreendimentos={empOrcs} />
      )}
    </div>
  )
}
