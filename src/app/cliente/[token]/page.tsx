export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { validateTokenAndGetAccess } from '@/lib/portal-access'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquarePlus, Hammer, CalendarDays, ArrowRight } from 'lucide-react'

type AtualizacaoRow = {
  id: string
  titulo: string
  descricao: string | null
  fotos: unknown
  percentual_avanco: number | null
  publicado_em: string
}

type ChamadoRow = {
  id: string
  titulo: string
  status: string
  created_at: string
}

export default async function ClientePortalHome({ params }: { params: { token: string } }) {
  const access = await validateTokenAndGetAccess(params.token)
  if (!access) notFound()

  const [{ data: updatesData }, { data: chamadosData }] = await Promise.all([
    access.admin
      .from('atualizacoes_obra')
      .select('id, titulo, descricao, fotos, percentual_avanco, publicado_em')
      .eq('empreendimento_id', access.empreendimentoId)
      .order('publicado_em', { ascending: false })
      .limit(3),
    access.admin
      .from('chamados_assistencia')
      .select('id, titulo, status, created_at')
      .eq('unidade_id', access.unidadeId)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const updates = (updatesData ?? []) as AtualizacaoRow[]
  const chamados = (chamadosData ?? []) as ChamadoRow[]

  const saudacao = access.compradorNome
    ? `Olá, ${access.compradorNome.split(' ')[0]}!`
    : 'Olá!'

  const ultimoUpdate = updates[0]
  const avancoGeral = ultimoUpdate?.percentual_avanco

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-bold">{saudacao}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe sua unidade e tire dúvidas a qualquer momento.
        </p>
      </div>

      {/* Unidade card */}
      {access.unidade && (
        <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="text-xs uppercase tracking-widest text-primary/80 mb-2">Sua unidade</div>
          <div className="text-2xl font-bold">
            {access.unidade.torreName} · Apto {access.unidade.number}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {access.empreendimento.name}
            {access.empreendimento.city && ` · ${access.empreendimento.city}`}
            {access.empreendimento.state && ` / ${access.empreendimento.state}`}
          </div>
          {avancoGeral !== null && avancoGeral !== undefined && (
            <div className="mt-4 pt-4 border-t border-primary/20">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-muted-foreground">Avanço da obra</span>
                <span className="font-bold text-primary tabular-nums">{Number(avancoGeral).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, Number(avancoGeral)))}%` }}
                />
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={`/cliente/${params.token}/chamados/novo`}>
          <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <MessageSquarePlus className="h-6 w-6 text-primary mb-2" />
            <div className="font-semibold text-sm">Abrir chamado</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Problema na unidade ou dúvida técnica
            </div>
          </Card>
        </Link>
        <Link href={`/cliente/${params.token}/obra`}>
          <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <Hammer className="h-6 w-6 text-primary mb-2" />
            <div className="font-semibold text-sm">Ver andamento</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Fotos e atualizações da obra
            </div>
          </Card>
        </Link>
      </div>

      {/* Últimas atualizações */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Últimas atualizações</h2>
          {updates.length > 0 && (
            <Link href={`/cliente/${params.token}/obra`} className="text-xs text-primary inline-flex items-center gap-0.5">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        {updates.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            A incorporadora ainda não publicou atualizações.
          </Card>
        ) : (
          <div className="space-y-2">
            {updates.map(u => (
              <Card key={u.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.titulo}</div>
                    {u.descricao && (
                      <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {u.descricao}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(u.publicado_em).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                      {u.percentual_avanco !== null && (
                        <span className="font-medium text-primary">· {Number(u.percentual_avanco).toFixed(0)}% obra</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Meus chamados */}
      {chamados.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Meus chamados</h2>
            <Link href={`/cliente/${params.token}/chamados`} className="text-xs text-primary inline-flex items-center gap-0.5">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {chamados.map(c => (
              <Link key={c.id} href={`/cliente/${params.token}/chamados/${c.id}`}>
                <Card className="p-3 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.titulo}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    aberto:       { label: 'Aberto',        className: 'bg-blue-100 text-blue-800' },
    em_andamento: { label: 'Em andamento',  className: 'bg-amber-100 text-amber-800' },
    resolvido:    { label: 'Resolvido',     className: 'bg-emerald-100 text-emerald-800' },
    fechado:      { label: 'Fechado',       className: 'bg-gray-100 text-gray-800' },
  }
  const c = cfg[status] ?? cfg.aberto
  return <Badge className={c.className}>{c.label}</Badge>
}
