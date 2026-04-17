export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Megaphone, CalendarDays } from 'lucide-react'
import NovaAtualizacaoDialog from '@/components/atualizacoes/nova-atualizacao-dialog'
import AtualizacaoDeleteButton from '@/components/atualizacoes/atualizacao-delete-button'

type Empreendimento = { id: string; name: string }

type Atualizacao = {
  id: string
  empreendimento_id: string
  titulo: string
  descricao: string | null
  fotos: unknown
  percentual_avanco: number | null
  publicado_em: string
  empreendimentos: { name: string } | null
}

export default async function AtualizacoesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const [empsRes, updatesRes] = await Promise.all([
    admin.from('empreendimentos').select('id, name').eq('org_id', profile.org_id).order('name'),
    admin.from('empreendimentos').select('id').eq('org_id', profile.org_id),
  ])
  const empreendimentos = (empsRes.data ?? []) as Empreendimento[]
  const empIds = ((updatesRes.data ?? []) as Array<{ id: string }>).map(e => e.id)

  let updates: Atualizacao[] = []
  if (empIds.length > 0) {
    const { data } = await admin
      .from('atualizacoes_obra')
      .select(`
        id, empreendimento_id, titulo, descricao, fotos, percentual_avanco, publicado_em,
        empreendimentos(name)
      `)
      .in('empreendimento_id', empIds)
      .order('publicado_em', { ascending: false })
      .limit(100)
    updates = (data ?? []) as unknown as Atualizacao[]
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Atualizações de obra
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Publique fotos e avanço da obra. Tudo que você postar aparece para os compradores no portal.
          </p>
        </div>
        <NovaAtualizacaoDialog empreendimentos={empreendimentos} />
      </div>

      {updates.length === 0 ? (
        <Card className="p-10 text-center">
          <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <div className="text-sm font-medium">Nenhuma atualização publicada</div>
          <div className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Publique semanalmente com foto do canteiro. Compradores de alto padrão valorizam ver a obra andando.
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {updates.map(u => {
            const fotos = Array.isArray(u.fotos) ? (u.fotos as string[]) : []
            return (
              <Card key={u.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {u.empreendimentos?.name ?? '—'}
                    </div>
                    <div className="font-semibold text-lg">{u.titulo}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(u.publicado_em).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                      {u.percentual_avanco !== null && (
                        <span className="ml-2 font-medium text-primary">
                          · {Number(u.percentual_avanco).toFixed(0)}% de avanço
                        </span>
                      )}
                    </div>
                  </div>
                  <AtualizacaoDeleteButton id={u.id} titulo={u.titulo} />
                </div>

                {u.descricao && (
                  <p className="text-sm whitespace-pre-wrap mb-3">{u.descricao}</p>
                )}

                {fotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {fotos.slice(0, 8).map((src, i) => (
                      <a key={`${u.id}-${i}`} href={src} target="_blank" rel="noopener" className="block aspect-square rounded overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
