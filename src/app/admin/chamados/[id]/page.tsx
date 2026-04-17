export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import ChamadoAdminControls from '@/components/chamados/chamado-admin-controls'
import ResponderChamadoForm from '@/components/chamados/responder-chamado-form'

type Chamado = {
  id: string
  categoria: string
  titulo: string
  descricao: string
  status: 'aberto' | 'em_andamento' | 'resolvido' | 'fechado'
  empreendimento_id: string
  unidade_id: string
  created_at: string
  empreendimentos: { name: string; org_id: string } | null
  unidades: { number: string; floor: number; torres: { name: string } | null } | null
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

export default async function ChamadoAdminThread({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role, full_name').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member'; full_name: string | null } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const { data: chamadoData } = await admin
    .from('chamados_assistencia')
    .select(`
      id, categoria, titulo, descricao, status, empreendimento_id, unidade_id, created_at,
      empreendimentos(name, org_id),
      unidades(number, floor, torres(name))
    `)
    .eq('id', params.id)
    .maybeSingle()

  const chamado = chamadoData as unknown as Chamado | null
  if (!chamado || chamado.empreendimentos?.org_id !== profile.org_id) notFound()

  const { data: mensagensData } = await admin
    .from('mensagens_chamado')
    .select('id, autor_tipo, autor_nome, mensagem, fotos, created_at')
    .eq('chamado_id', chamado.id)
    .order('created_at', { ascending: true })

  const mensagens = (mensagensData ?? []) as MensagemRow[]

  const statusCfg = STATUS_CFG[chamado.status]
  const torre = chamado.unidades?.torres
  const unidadeLabel = chamado.unidades
    ? `${torre?.name ?? ''} · Apto ${chamado.unidades.number}`
    : '—'
  const fechado = chamado.status === 'fechado'

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href="/admin/chamados"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-4 w-4" />
        Chamados
      </Link>

      <Card className="p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="text-xs">
                {CATEGORIA_LABEL[chamado.categoria] ?? chamado.categoria}
              </Badge>
              <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
            </div>
            <h1 className="text-xl font-bold">{chamado.titulo}</h1>
            <div className="text-xs text-muted-foreground mt-1">
              {chamado.empreendimentos?.name} · {unidadeLabel}
              {' · aberto em '}
              {new Date(chamado.created_at).toLocaleString('pt-BR')}
            </div>
          </div>
          <ChamadoAdminControls id={chamado.id} status={chamado.status} />
        </div>
      </Card>

      {/* Thread */}
      <div className="space-y-3 mb-4">
        {mensagens.map(m => {
          const fotos = Array.isArray(m.fotos) ? (m.fotos as string[]) : []
          const fromCompany = m.autor_tipo === 'empresa'
          return (
            <div key={m.id} className={`flex ${fromCompany ? 'justify-end' : 'justify-start'}`}>
              <Card
                className={`p-4 max-w-[85%] ${
                  fromCompany
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background'
                }`}
              >
                <div className={`text-xs mb-1 ${fromCompany ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  <span className="font-medium">
                    {fromCompany ? (m.autor_nome || 'Incorporadora') : (m.autor_nome || 'Comprador')}
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

      {!fechado && (
        <ResponderChamadoForm
          chamadoId={chamado.id}
          autorNome={profile.full_name ?? 'Incorporadora'}
        />
      )}
    </div>
  )
}
