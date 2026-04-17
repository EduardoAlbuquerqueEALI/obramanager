export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Package, AlertTriangle } from 'lucide-react'
import ItemEstoqueDialog from '@/components/estoque/item-estoque-dialog'
import AlmoxarifadoDialog from '@/components/estoque/almoxarifado-dialog'
import MovimentoDialog from '@/components/estoque/movimento-dialog'
import ItemDeleteButton from '@/components/estoque/item-delete-button'
import AlmoxDeleteButton from '@/components/estoque/almox-delete-button'
import { formatNumber } from '@/lib/format'

type SaldoRow = {
  org_id: string
  item_id: string
  item_codigo: string
  item_descricao: string
  unidade: string
  estoque_minimo: number | null
  almoxarifado_id: string
  almoxarifado_nome: string
  almoxarifado_empreendimento_id: string | null
  saldo: number
}

type Almoxarifado = {
  id: string
  nome: string
  empreendimento_id: string | null
  ativo: boolean
}

type ItemEstoque = {
  id: string
  codigo: string
  descricao: string
  unidade: string
  estoque_minimo: number | null
}

type Movimento = {
  id: string
  tipo: string
  quantidade: number
  observacoes: string | null
  created_at: string
  referencia_tipo: string | null
  itens_estoque: { codigo: string; descricao: string; unidade: string } | null
  alm_origem: { nome: string } | null
  alm_destino: { nome: string } | null
  etapas_orcamento: { nome: string } | null
}

type Empreendimento = { id: string; name: string }

const MOV_LABELS: Record<string, { label: string; className: string }> = {
  entrada: { label: 'Entrada', className: 'bg-emerald-100 text-emerald-800' },
  saida: { label: 'Saída', className: 'bg-red-100 text-red-800' },
  transferencia: { label: 'Transferência', className: 'bg-blue-100 text-blue-800' },
  ajuste: { label: 'Ajuste', className: 'bg-gray-100 text-gray-800' },
}

export default async function EstoquePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const profile = profileData as { org_id: string; role: 'admin' | 'member' } | null
  if (!profile || profile.role !== 'admin') redirect('/app')

  const [saldosResult, almoxResult, itensResult, movsResult, empsResult] = await Promise.all([
    admin.from('saldos_estoque').select('*').eq('org_id', profile.org_id).order('item_descricao'),
    admin.from('almoxarifados').select('*').eq('org_id', profile.org_id).order('nome'),
    admin.from('itens_estoque').select('*').eq('org_id', profile.org_id).order('descricao'),
    admin
      .from('movimentos_estoque')
      .select(`
        id, tipo, quantidade, observacoes, created_at, referencia_tipo,
        itens_estoque(codigo, descricao, unidade),
        alm_origem:almoxarifado_origem_id(nome),
        alm_destino:almoxarifado_destino_id(nome),
        etapas_orcamento(nome)
      `)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(100),
    admin.from('empreendimentos').select('id, name').eq('org_id', profile.org_id).order('name'),
  ])

  const saldos = (saldosResult.data ?? []) as SaldoRow[]
  const almoxarifados = (almoxResult.data ?? []) as Almoxarifado[]
  const itens = (itensResult.data ?? []) as ItemEstoque[]
  const movimentos = (movsResult.data ?? []) as unknown as Movimento[]
  const empreendimentos = (empsResult.data ?? []) as Empreendimento[]

  // Agrupa saldos por item → location
  const byItem = new Map<string, { item: Pick<SaldoRow, 'item_codigo' | 'item_descricao' | 'unidade' | 'estoque_minimo'>; byAlmox: Record<string, number>; total: number }>()
  for (const s of saldos) {
    if (!byItem.has(s.item_id)) {
      byItem.set(s.item_id, {
        item: { item_codigo: s.item_codigo, item_descricao: s.item_descricao, unidade: s.unidade, estoque_minimo: s.estoque_minimo },
        byAlmox: {},
        total: 0,
      })
    }
    const entry = byItem.get(s.item_id)!
    entry.byAlmox[s.almoxarifado_id] = Number(s.saldo)
    entry.total += Number(s.saldo)
  }

  const saldoRows = Array.from(byItem.entries())

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Estoque
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Saldos por almoxarifado, itens e movimentações.
        </p>
      </div>

      <Tabs defaultValue="saldos">
        <TabsList>
          <TabsTrigger value="saldos">Saldos</TabsTrigger>
          <TabsTrigger value="itens">Itens ({itens.length})</TabsTrigger>
          <TabsTrigger value="almoxarifados">Almoxarifados ({almoxarifados.length})</TabsTrigger>
          <TabsTrigger value="movimentos">Movimentações ({movimentos.length})</TabsTrigger>
        </TabsList>

        {/* Saldos */}
        <TabsContent value="saldos" className="mt-4">
          <div className="flex justify-end mb-3">
            <MovimentoDialog
              itens={itens}
              almoxarifados={almoxarifados}
              empreendimentos={empreendimentos}
            />
          </div>

          {saldoRows.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              Nenhum item com saldo. Cadastre itens + almoxarifados + registre entradas.
            </Card>
          ) : (
            <Card className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left py-2 pl-4 pr-2 font-medium">Código</th>
                    <th className="text-left py-2 px-2 font-medium">Descrição</th>
                    <th className="text-left py-2 px-2 font-medium">Un</th>
                    {almoxarifados.map(a => (
                      <th key={a.id} className="text-right py-2 px-2 font-medium">{a.nome}</th>
                    ))}
                    <th className="text-right py-2 pr-4 pl-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {saldoRows.map(([itemId, row]) => {
                    const isLow = row.item.estoque_minimo != null && row.total < Number(row.item.estoque_minimo)
                    return (
                      <tr key={itemId} className="border-b last:border-b-0">
                        <td className="py-2 pl-4 pr-2 font-mono text-xs">{row.item.item_codigo}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            {row.item.item_descricao}
                            {isLow && (
                              <Badge className="bg-amber-100 text-amber-800 gap-1 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                Baixo
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground">{row.item.unidade}</td>
                        {almoxarifados.map(a => (
                          <td key={a.id} className="py-2 px-2 text-right tabular-nums">
                            {formatNumber(row.byAlmox[a.id] ?? 0)}
                          </td>
                        ))}
                        <td className="py-2 pr-4 pl-2 text-right font-semibold tabular-nums">
                          {formatNumber(row.total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        {/* Itens */}
        <TabsContent value="itens" className="mt-4">
          <div className="flex justify-end mb-3">
            <ItemEstoqueDialog mode="create" />
          </div>
          <div className="space-y-2">
            {itens.map(it => (
              <Card key={it.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{it.codigo}</span>
                    <span className="font-medium">{it.descricao}</span>
                    <span className="text-xs text-muted-foreground">({it.unidade})</span>
                  </div>
                  {Number(it.estoque_minimo) > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Mínimo: {formatNumber(Number(it.estoque_minimo))} {it.unidade}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <ItemEstoqueDialog mode="edit" item={it} />
                  <ItemDeleteButton id={it.id} descricao={it.descricao} />
                </div>
              </Card>
            ))}
            {itens.length === 0 && (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Nenhum item cadastrado.
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Almoxarifados */}
        <TabsContent value="almoxarifados" className="mt-4">
          <div className="flex justify-end mb-3">
            <AlmoxarifadoDialog mode="create" empreendimentos={empreendimentos} />
          </div>
          <div className="space-y-2">
            {almoxarifados.map(a => {
              const emp = empreendimentos.find(e => e.id === a.empreendimento_id)
              return (
                <Card key={a.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.nome}</span>
                      {!a.ativo && <Badge variant="outline">Inativo</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a.empreendimento_id ? `Obra: ${emp?.name ?? '—'}` : 'Almoxarifado central'}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <AlmoxarifadoDialog mode="edit" almoxarifado={a} empreendimentos={empreendimentos} />
                    <AlmoxDeleteButton id={a.id} nome={a.nome} />
                  </div>
                </Card>
              )
            })}
            {almoxarifados.length === 0 && (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Nenhum almoxarifado cadastrado.
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Movimentos */}
        <TabsContent value="movimentos" className="mt-4">
          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left py-2 pl-4 pr-2 font-medium">Data</th>
                  <th className="text-left py-2 px-2 font-medium">Tipo</th>
                  <th className="text-left py-2 px-2 font-medium">Item</th>
                  <th className="text-right py-2 px-2 font-medium">Qtd</th>
                  <th className="text-left py-2 px-2 font-medium">Origem → Destino</th>
                  <th className="text-left py-2 pr-4 pl-2 font-medium">Vínculo</th>
                </tr>
              </thead>
              <tbody>
                {movimentos.map(m => {
                  const cfg = MOV_LABELS[m.tipo] ?? MOV_LABELS.ajuste
                  return (
                    <tr key={m.id} className="border-b last:border-b-0">
                      <td className="py-2 pl-4 pr-2 text-xs whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 px-2">
                        <Badge className={cfg.className}>{cfg.label}</Badge>
                      </td>
                      <td className="py-2 px-2">
                        <div className="text-sm">{m.itens_estoque?.descricao}</div>
                        <div className="text-xs text-muted-foreground font-mono">{m.itens_estoque?.codigo}</div>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {formatNumber(Number(m.quantidade))} {m.itens_estoque?.unidade}
                      </td>
                      <td className="py-2 px-2 text-xs">
                        {m.alm_origem?.nome && <span>{m.alm_origem.nome}</span>}
                        {m.alm_origem && m.alm_destino && ' → '}
                        {m.alm_destino?.nome && <span>{m.alm_destino.nome}</span>}
                        {!m.alm_origem && !m.alm_destino && '-'}
                      </td>
                      <td className="py-2 pr-4 pl-2 text-xs text-muted-foreground">
                        {m.etapas_orcamento?.nome ? (
                          <span className="text-foreground">Etapa: {m.etapas_orcamento.nome}</span>
                        ) : (
                          m.referencia_tipo || '-'
                        )}
                      </td>
                    </tr>
                  )
                })}
                {movimentos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhuma movimentação.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
