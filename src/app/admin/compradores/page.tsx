export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserCircle, QrCode } from 'lucide-react'
import GerarAcessoDialog from '@/components/compradores/gerar-acesso-dialog'
import CopiarLinkButton from '@/components/compradores/copiar-link-button'
import AcessoActionsMenu from '@/components/compradores/acesso-actions-menu'

type Acesso = {
  id: string
  token: string
  comprador_nome: string | null
  comprador_email: string | null
  comprador_telefone: string | null
  revogado: boolean
  ultimo_acesso_em: string | null
  unidade_id: string
  unidades: {
    number: string
    floor: number
    torres: {
      name: string
      empreendimentos: { name: string; id: string }
    } | null
  } | null
}

type UnidadeOption = {
  id: string
  number: string
  floor: number
  torres: { name: string; empreendimentos: { id: string; name: string } } | null
}

export default async function CompradoresPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  // Busca empreendimentos da org (pra listar unidades)
  const { data: empsData } = await admin.from('empreendimentos').select('id').eq('org_id', profile.org_id)
  const empIds = ((empsData ?? []) as Array<{ id: string }>).map(e => e.id)

  let acessos: Acesso[] = []
  let unidadesDisponiveis: UnidadeOption[] = []

  if (empIds.length > 0) {
    const [acessosRes, unidadesRes] = await Promise.all([
      admin
        .from('acessos_cliente')
        .select(`
          id, token, comprador_nome, comprador_email, comprador_telefone,
          revogado, ultimo_acesso_em, unidade_id,
          unidades(number, floor, torres(name, empreendimentos(name, id)))
        `)
        .in('empreendimento_id', empIds)
        .order('created_at', { ascending: false }),
      admin
        .from('unidades')
        .select('id, number, floor, torres!inner(name, empreendimentos!inner(id, name, org_id))')
        .order('number'),
    ])
    acessos = (acessosRes.data ?? []) as unknown as Acesso[]
    const allUnits = (unidadesRes.data ?? []) as unknown as UnidadeOption[]
    const alreadyWithAccess = new Set(acessos.map(a => a.unidade_id))
    // Filtra só unidades da org sem acesso gerado ainda
    unidadesDisponiveis = allUnits.filter(u => {
      const empRel = u.torres?.empreendimentos
      const orgId = (empRel as { org_id?: string })?.org_id
      return orgId === profile.org_id && !alreadyWithAccess.has(u.id)
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4040'

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCircle className="h-6 w-6" />
            Compradores
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gere acesso por QR Code para cada unidade vendida. Comprador acessa sem login via token.
          </p>
        </div>
        <GerarAcessoDialog unidades={unidadesDisponiveis} />
      </div>

      {acessos.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhum acesso gerado. Clique em &quot;Novo acesso&quot; para gerar um link/QR pra um comprador.
        </Card>
      ) : (
        <div className="space-y-2">
          {acessos.map(a => {
            const emp = a.unidades?.torres?.empreendimentos
            const url = `${appUrl}/cliente/${a.token}`
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{a.comprador_nome || 'Sem nome'}</span>
                      {a.revogado && <Badge variant="outline">Revogado</Badge>}
                      {a.unidades && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {emp?.name} · {a.unidades.torres?.name} · Apto {a.unidades.number}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                      {a.comprador_email && <span>{a.comprador_email}</span>}
                      {a.comprador_telefone && <span>{a.comprador_telefone}</span>}
                      {a.ultimo_acesso_em && (
                        <span>Último acesso: {new Date(a.ultimo_acesso_em).toLocaleString('pt-BR')}</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-md">{url}</code>
                      <CopiarLinkButton url={url} />
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <Link href={`/admin/compradores/${a.id}/qr`} target="_blank">
                      <span className="inline-flex items-center gap-1 h-9 px-3 rounded-md border bg-background hover:bg-accent text-sm">
                        <QrCode className="h-4 w-4" />
                        QR
                      </span>
                    </Link>
                    <AcessoActionsMenu id={a.id} revogado={a.revogado} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
