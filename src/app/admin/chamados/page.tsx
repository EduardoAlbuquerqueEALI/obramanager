export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'

type Chamado = {
  id: string
  categoria: string
  titulo: string
  status: string
  created_at: string
  updated_at: string
  empreendimento_id: string
  unidade_id: string
  empreendimentos: { name: string } | null
  unidades: { number: string; torres: { name: string } | null } | null
}

const CATEGORIA_LABEL: Record<string, string> = {
  hidraulica: 'Hidráulica',
  eletrica: 'Elétrica',
  infiltracao: 'Infiltração',
  acabamento: 'Acabamento',
  estrutural: 'Estrutural',
  outros: 'Outros',
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  aberto:       { label: 'Aberto',        className: 'bg-blue-100 text-blue-800' },
  em_andamento: { label: 'Em andamento',  className: 'bg-amber-100 text-amber-800' },
  resolvido:    { label: 'Resolvido',     className: 'bg-emerald-100 text-emerald-800' },
  fechado:      { label: 'Fechado',       className: 'bg-gray-100 text-gray-800' },
}

export default async function ChamadosAdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  // Empreendimentos da org → chamados
  const { data: empsData } = await admin.from('empreendimentos').select('id').eq('org_id', profile.org_id)
  const empIds = ((empsData ?? []) as Array<{ id: string }>).map(e => e.id)

  let chamados: Chamado[] = []
  if (empIds.length > 0) {
    const { data } = await admin
      .from('chamados_assistencia')
      .select(`
        id, categoria, titulo, status, created_at, updated_at, empreendimento_id, unidade_id,
        empreendimentos(name),
        unidades(number, torres(name))
      `)
      .in('empreendimento_id', empIds)
      .order('updated_at', { ascending: false })
      .limit(100)
    chamados = (data ?? []) as unknown as Chamado[]
  }

  // Agrupa por status
  const porStatus: Record<string, Chamado[]> = {
    aberto: [],
    em_andamento: [],
    resolvido: [],
    fechado: [],
  }
  for (const c of chamados) {
    (porStatus[c.status] ?? porStatus.aberto).push(c)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Chamados de assistência
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Abertos pelos compradores via portal. Clique num chamado para responder.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(['aberto', 'em_andamento', 'resolvido', 'fechado'] as const).map(s => {
          const cfg = STATUS_CFG[s]
          return (
            <Card key={s} className="p-3">
              <div className="text-xs text-muted-foreground">{cfg.label}</div>
              <div className="text-2xl font-bold">{porStatus[s].length}</div>
            </Card>
          )
        })}
      </div>

      {chamados.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhum chamado aberto pelos compradores ainda.
        </Card>
      ) : (
        <div className="space-y-2">
          {chamados.map(c => {
            const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.aberto
            const torre = c.unidades?.torres
            const unidadeLabel = c.unidades
              ? `${torre?.name ?? ''} · Apto ${c.unidades.number}`
              : '—'
            return (
              <Link key={c.id} href={`/admin/chamados/${c.id}`}>
                <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORIA_LABEL[c.categoria] ?? c.categoria}
                        </Badge>
                        <Badge className={cfg.className}>{cfg.label}</Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {c.empreendimentos?.name} · {unidadeLabel}
                        </span>
                      </div>
                      <div className="font-medium">{c.titulo}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Aberto {new Date(c.created_at).toLocaleDateString('pt-BR')}
                        {c.updated_at !== c.created_at && (
                          <> · atualizado {new Date(c.updated_at).toLocaleDateString('pt-BR')}</>
                        )}
                      </div>
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
