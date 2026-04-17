export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { validateTokenAndGetAccess } from '@/lib/portal-access'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import ThreadChamado from '@/components/portal/thread-chamado'

type ChamadoRow = {
  id: string
  categoria: string
  titulo: string
  descricao: string
  status: string
  unidade_id: string
  created_at: string
}

type MensagemRow = {
  id: string
  autor_tipo: 'cliente' | 'empresa'
  autor_nome: string | null
  mensagem: string
  fotos: unknown
  created_at: string
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

export default async function ChamadoThread({
  params,
}: {
  params: { token: string; id: string }
}) {
  const access = await validateTokenAndGetAccess(params.token)
  if (!access) notFound()

  const { data: chamadoData } = await access.admin
    .from('chamados_assistencia')
    .select('id, categoria, titulo, descricao, status, unidade_id, created_at')
    .eq('id', params.id)
    .maybeSingle()

  const chamado = chamadoData as ChamadoRow | null
  if (!chamado || chamado.unidade_id !== access.unidadeId) notFound()

  const { data: mensagensData } = await access.admin
    .from('mensagens_chamado')
    .select('id, autor_tipo, autor_nome, mensagem, fotos, created_at')
    .eq('chamado_id', chamado.id)
    .order('created_at', { ascending: true })

  const mensagens = (mensagensData ?? []) as MensagemRow[]

  const statusCfg = STATUS_CFG[chamado.status] ?? STATUS_CFG.aberto
  const fechado = chamado.status === 'fechado'

  return (
    <div className="space-y-4">
      <Link
        href={`/cliente/${params.token}/chamados`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Chamados
      </Link>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="text-xs">
                {CATEGORIA_LABEL[chamado.categoria] ?? chamado.categoria}
              </Badge>
              <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
            </div>
            <h1 className="text-xl font-bold">{chamado.titulo}</h1>
            <div className="text-xs text-muted-foreground mt-1">
              Aberto em {new Date(chamado.created_at).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      </Card>

      {/* Thread */}
      <div className="space-y-3">
        {mensagens.map(m => {
          const fotos = Array.isArray(m.fotos) ? (m.fotos as string[]) : []
          const mine = m.autor_tipo === 'cliente'
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <Card
                className={`p-4 max-w-[85%] ${
                  mine
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background'
                }`}
              >
                <div className={`text-xs mb-1 ${mine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  <span className="font-medium">
                    {mine ? 'Você' : (m.autor_nome || 'Incorporadora')}
                  </span>
                  {' · '}
                  {new Date(m.created_at).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
                <div className="text-sm whitespace-pre-wrap">{m.mensagem}</div>
                {fotos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {fotos.map((src, i) => (
                      <a key={`${m.id}-${i}`} href={src} target="_blank" rel="noopener" className="block aspect-square rounded overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )
        })}
      </div>

      {/* Form resposta */}
      {!fechado ? (
        <ThreadChamado token={params.token} chamadoId={chamado.id} />
      ) : (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          Este chamado foi fechado. Abra um novo se precisar.
        </Card>
      )}
    </div>
  )
}
