export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import TipoTreinamentoDialog from '@/components/treinamentos/tipo-treinamento-dialog'
import TipoTreinamentoDeleteButton from '@/components/treinamentos/tipo-treinamento-delete-button'

type TipoTreinamento = {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  validade_meses: number
  ativo: boolean
  sort_order: number
}

export default async function TiposTreinamentoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const { data: tiposData } = await admin
    .from('tipos_treinamento')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('sort_order')

  const tipos = (tiposData ?? []) as TipoTreinamento[]

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/admin/treinamentos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-4 w-4" />
        Matriz
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tipos de treinamento (NRs)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Catálogo de normas. Validade em meses calcula data de vencimento automaticamente.
          </p>
        </div>
        <TipoTreinamentoDialog mode="create" />
      </div>

      {tipos.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhum tipo cadastrado. A migration 0014 deveria ter incluído 10 NRs padrão; verifique se rodou com sucesso.
        </Card>
      ) : (
        <div className="space-y-2">
          {tipos.map(t => (
            <Card key={t.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">{t.codigo}</Badge>
                  <span className="font-medium">{t.nome}</span>
                  {!t.ativo && <Badge variant="outline">Inativo</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Validade: {t.validade_meses} meses
                  {t.descricao && ` · ${t.descricao}`}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <TipoTreinamentoDialog mode="edit" tipo={t} />
                <TipoTreinamentoDeleteButton id={t.id} codigo={t.codigo} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
