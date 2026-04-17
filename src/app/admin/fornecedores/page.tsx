export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Truck, Phone, Mail } from 'lucide-react'
import FornecedorFormDialog from '@/components/fornecedores/fornecedor-form-dialog'
import FornecedorDeleteButton from '@/components/fornecedores/fornecedor-delete-button'

type Fornecedor = {
  id: string
  nome: string
  cnpj: string | null
  contato_nome: string | null
  contato_telefone: string | null
  contato_email: string | null
  observacoes: string | null
  ativo: boolean
}

export default async function FornecedoresPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const { data: fornecedoresData } = await admin
    .from('fornecedores')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('nome')

  const fornecedores = (fornecedoresData ?? []) as Fornecedor[]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Fornecedores
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Cadastro compartilhado entre todas as obras da organização.</p>
        </div>
        <FornecedorFormDialog mode="create" />
      </div>

      {fornecedores.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <p className="text-sm">Nenhum fornecedor cadastrado.</p>
          <p className="text-xs mt-1">Clique em &quot;Novo Fornecedor&quot; para começar.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {fornecedores.map(f => (
            <Card key={f.id} className="p-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{f.nome}</span>
                  {!f.ativo && <Badge variant="outline">Inativo</Badge>}
                  {f.cnpj && <span className="text-xs text-muted-foreground font-mono">{f.cnpj}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                  {f.contato_nome && <span>{f.contato_nome}</span>}
                  {f.contato_telefone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {f.contato_telefone}
                    </span>
                  )}
                  {f.contato_email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {f.contato_email}
                    </span>
                  )}
                </div>
                {f.observacoes && (
                  <div className="text-xs text-muted-foreground mt-2 italic">{f.observacoes}</div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <FornecedorFormDialog mode="edit" fornecedor={f} />
                <FornecedorDeleteButton id={f.id} nome={f.nome} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
