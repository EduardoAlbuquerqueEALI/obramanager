export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { validateTokenAndGetAccess } from '@/lib/portal-access'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageSquare, Plus } from 'lucide-react'

type ChamadoRow = {
  id: string
  categoria: string
  titulo: string
  status: string
  created_at: string
  updated_at: string
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

export default async function ChamadosLista({ params }: { params: { token: string } }) {
  const access = await validateTokenAndGetAccess(params.token)
  if (!access) notFound()

  const { data: chamadosData } = await access.admin
    .from('chamados_assistencia')
    .select('id, categoria, titulo, status, created_at, updated_at')
    .eq('unidade_id', access.unidadeId)
    .order('updated_at', { ascending: false })

  const chamados = (chamadosData ?? []) as ChamadoRow[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Chamados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assistência técnica e dúvidas sobre sua unidade.
          </p>
        </div>
        <Link href={`/cliente/${params.token}/chamados/novo`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo
          </Button>
        </Link>
      </div>

      {chamados.length === 0 ? (
        <Card className="p-10 text-center">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <div className="text-sm font-medium">Nenhum chamado aberto</div>
          <div className="text-xs text-muted-foreground mt-1 mb-4">
            Tem algum problema na unidade? Abra um chamado que a incorporadora recebe na hora.
          </div>
          <Link href={`/cliente/${params.token}/chamados/novo`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Abrir primeiro chamado
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {chamados.map(c => {
            const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.aberto
            return (
              <Link key={c.id} href={`/cliente/${params.token}/chamados/${c.id}`}>
                <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORIA_LABEL[c.categoria] ?? c.categoria}
                        </Badge>
                        <Badge className={cfg.className}>{cfg.label}</Badge>
                      </div>
                      <div className="font-medium">{c.titulo}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Aberto em {new Date(c.created_at).toLocaleDateString('pt-BR')}
                        {c.updated_at !== c.created_at && (
                          <> · última atualização {new Date(c.updated_at).toLocaleDateString('pt-BR')}</>
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
