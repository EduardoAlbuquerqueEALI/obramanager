export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { validateTokenAndGetAccess } from '@/lib/portal-access'
import { Card } from '@/components/ui/card'
import { CalendarDays, Hammer } from 'lucide-react'

type AtualizacaoRow = {
  id: string
  titulo: string
  descricao: string | null
  fotos: unknown
  percentual_avanco: number | null
  publicado_em: string
}

export default async function ObraTimeline({ params }: { params: { token: string } }) {
  const access = await validateTokenAndGetAccess(params.token)
  if (!access) notFound()

  const { data: updatesData } = await access.admin
    .from('atualizacoes_obra')
    .select('id, titulo, descricao, fotos, percentual_avanco, publicado_em')
    .eq('empreendimento_id', access.empreendimentoId)
    .order('publicado_em', { ascending: false })
    .limit(100)

  const updates = (updatesData ?? []) as AtualizacaoRow[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Hammer className="h-6 w-6" />
          Andamento da obra
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atualizações publicadas pela incorporadora.
        </p>
      </div>

      {updates.length === 0 ? (
        <Card className="p-10 text-center">
          <Hammer className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <div className="text-sm font-medium">Sem atualizações ainda</div>
          <div className="text-xs text-muted-foreground mt-1">
            Volte em breve — a incorporadora publicará fotos e avanço aqui.
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {updates.map(u => {
            const fotos = Array.isArray(u.fotos) ? (u.fotos as string[]) : []
            return (
              <Card key={u.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-lg">{u.titulo}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(u.publicado_em).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </div>
                  </div>
                  {u.percentual_avanco !== null && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">avanço</div>
                      <div className="text-xl font-bold text-primary tabular-nums">
                        {Number(u.percentual_avanco).toFixed(0)}%
                      </div>
                    </div>
                  )}
                </div>

                {u.descricao && (
                  <p className="text-sm whitespace-pre-wrap mb-3">{u.descricao}</p>
                )}

                {fotos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {fotos.map((src, i) => (
                      <a
                        key={`${u.id}-${i}`}
                        href={src}
                        target="_blank"
                        rel="noopener"
                        className="block aspect-[4/3] rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={u.titulo} className="w-full h-full object-cover" />
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
