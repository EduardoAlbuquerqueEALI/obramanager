export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HardHat } from 'lucide-react'
import FuncionarioFormDialog from '@/components/funcionarios/funcionario-form-dialog'
import FuncionarioDeleteButton from '@/components/funcionarios/funcionario-delete-button'

type Funcionario = {
  id: string
  nome_completo: string
  cpf: string | null
  funcao: string | null
  foto_url: string | null
  ativo: boolean
}

export default async function FuncionariosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const { data: funcionariosData } = await admin
    .from('funcionarios')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('nome_completo')

  const funcionarios = (funcionariosData ?? []) as Funcionario[]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardHat className="h-6 w-6" />
            Funcionários
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Operários e trabalhadores de obra. Não é login do sistema — apenas cadastro para controle de treinamentos.
          </p>
        </div>
        <FuncionarioFormDialog mode="create" />
      </div>

      {funcionarios.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <p>Nenhum funcionário cadastrado.</p>
          <p className="text-xs mt-1">Clique em &quot;Novo Funcionário&quot; para começar.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {funcionarios.map(f => (
            <Card key={f.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {f.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.foto_url} alt={f.nome_completo} className="h-10 w-10 rounded-full object-cover border shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <HardHat className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{f.nome_completo}</span>
                    {!f.ativo && <Badge variant="outline">Inativo</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-3">
                    {f.funcao && <span>{f.funcao}</span>}
                    {f.cpf && <span className="font-mono">{f.cpf}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <FuncionarioFormDialog mode="edit" funcionario={f} />
                <FuncionarioDeleteButton id={f.id} nome={f.nome_completo} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
