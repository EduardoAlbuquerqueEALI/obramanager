'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialogConfirm,
} from '@/components/ui/alert-dialog-confirm'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Snowflake,
  Copy,
} from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import {
  updateOrcamento,
  createEtapa,
  updateEtapa,
  deleteEtapa,
  createItem,
  updateItem,
  deleteItem,
  freezeOrcamento,
  reviseOrcamento,
} from '@/actions/orcamentos'

type Item = {
  id: string
  descricao: string
  unidade: string
  quantidade: number
  preco_unitario: number
  codigo_sinapi: string | null
  observacoes: string | null
  sort_order: number
}

type Etapa = {
  id: string
  nome: string
  sort_order: number
  itens_orcamento: Item[]
}

type Orcamento = {
  id: string
  empreendimento_id: string
  versao: number
  nome: string
  status: 'rascunho' | 'ativo' | 'congelado' | 'substituido'
  bdi_percent: number
  contingencia_percent: number
  total_congelado: number | null
  observacoes: string | null
  etapas_orcamento: Etapa[]
}

interface Props {
  orcamento: Orcamento
  empreendimentoId: string
}

function etapaTotal(etapa: Etapa) {
  return etapa.itens_orcamento.reduce(
    (acc, it) => acc + Number(it.quantidade) * Number(it.preco_unitario),
    0,
  )
}

export default function OrcamentoEditor({ orcamento }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const readonly = orcamento.status === 'congelado' || orcamento.status === 'substituido'

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(orcamento.etapas_orcamento[0] ? [orcamento.etapas_orcamento[0].id] : []),
  )
  const [novaEtapaOpen, setNovaEtapaOpen] = useState(false)
  const [novaEtapaNome, setNovaEtapaNome] = useState('')

  const [meta, setMeta] = useState({
    nome: orcamento.nome,
    bdi_percent: Number(orcamento.bdi_percent),
    contingencia_percent: Number(orcamento.contingencia_percent),
  })

  function toggleExpand(id: string) {
    setExpanded(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function saveMeta() {
    if (readonly) return
    const result = await updateOrcamento(orcamento.id, meta)
    if (result.error) toast({ title: result.error, variant: 'destructive' })
  }

  function handleAddEtapa() {
    if (readonly) return
    setNovaEtapaNome('')
    setNovaEtapaOpen(true)
  }

  function submitNovaEtapa(e: React.FormEvent) {
    e.preventDefault()
    const nome = novaEtapaNome.trim()
    if (!nome) return
    startTransition(async () => {
      const result = await createEtapa(orcamento.id, { nome, sort_order: orcamento.etapas_orcamento.length })
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Etapa criada' })
      setNovaEtapaOpen(false)
      setNovaEtapaNome('')
      router.refresh()
    })
  }

  async function handleRenameEtapa(etapaId: string, nome: string) {
    if (readonly || !nome.trim()) return
    await updateEtapa(etapaId, orcamento.id, { nome })
  }

  async function handleDeleteEtapa(etapaId: string) {
    if (readonly) return
    const result = await deleteEtapa(etapaId, orcamento.id)
    if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
    toast({ title: 'Etapa removida' })
    router.refresh()
  }

  async function handleAddItem(etapaId: string, position: number) {
    if (readonly) return
    startTransition(async () => {
      const result = await createItem(etapaId, {
        descricao: 'Novo serviço',
        unidade: 'un',
        quantidade: 0,
        preco_unitario: 0,
        sort_order: position,
      })
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      router.refresh()
    })
  }

  async function handleUpdateItem(itemId: string, etapaId: string, patch: Partial<Item>) {
    if (readonly) return
    const result = await updateItem(itemId, etapaId, patch)
    if (result.error) toast({ title: result.error, variant: 'destructive' })
  }

  async function handleDeleteItem(itemId: string, etapaId: string) {
    if (readonly) return
    startTransition(async () => {
      const result = await deleteItem(itemId, etapaId)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      router.refresh()
    })
  }

  async function handleFreeze() {
    startTransition(async () => {
      const result = await freezeOrcamento(orcamento.id)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Orçamento congelado' })
      router.refresh()
    })
  }

  async function handleRevise() {
    startTransition(async () => {
      const result = await reviseOrcamento(orcamento.id)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Revisão criada (nova versão)' })
      router.refresh()
    })
  }

  // Totals — BDI e Contingência são encargos paralelos sobre custo direto (padrão TCU)
  const subtotal = orcamento.etapas_orcamento.reduce((acc, et) => acc + etapaTotal(et), 0)
  const bdi = subtotal * (meta.bdi_percent / 100)
  const contingencia = subtotal * (meta.contingencia_percent / 100)
  const total = subtotal + bdi + contingencia

  return (
    <div className="space-y-6">
      {/* Meta + actions */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 min-w-0">
            <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
            <Input
              value={meta.nome}
              disabled={readonly}
              onChange={e => setMeta(m => ({ ...m, nome: e.target.value }))}
              onBlur={saveMeta}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">BDI (%)</label>
            <Input
              type="number"
              step="0.01"
              min={0}
              className="w-24"
              disabled={readonly}
              value={meta.bdi_percent}
              onChange={e => setMeta(m => ({ ...m, bdi_percent: Number(e.target.value) }))}
              onBlur={saveMeta}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Contingência (%)</label>
            <Input
              type="number"
              step="0.01"
              min={0}
              className="w-28"
              disabled={readonly}
              value={meta.contingencia_percent}
              onChange={e => setMeta(m => ({ ...m, contingencia_percent: Number(e.target.value) }))}
              onBlur={saveMeta}
            />
          </div>
          {!readonly && (
            <AlertDialogConfirm
              title="Congelar orçamento?"
              description="Depois de congelado não poderá mais ser alterado. Use 'Criar revisão' para aditivos."
              confirmLabel="Congelar"
              onConfirm={handleFreeze}
              trigger={
                <Button disabled={isPending}>
                  <Snowflake className="h-4 w-4 mr-2" />
                  Congelar
                </Button>
              }
            />
          )}
          {orcamento.status === 'congelado' && (
            <Button variant="outline" onClick={handleRevise} disabled={isPending}>
              <Copy className="h-4 w-4 mr-2" />
              Criar revisão
            </Button>
          )}
        </div>
      </Card>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Subtotal" value={formatCurrency(subtotal)} />
        <StatCard label={`BDI (${meta.bdi_percent.toFixed(2)}%)`} value={formatCurrency(bdi)} />
        <StatCard label={`Contingência (${meta.contingencia_percent.toFixed(2)}%)`} value={formatCurrency(contingencia)} />
        <StatCard label="Total geral" value={formatCurrency(total)} highlight />
      </div>

      {/* Stages */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Etapas e serviços</h2>
        {!readonly && (
          <Button size="sm" onClick={handleAddEtapa} disabled={isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Nova etapa
          </Button>
        )}
      </div>

      {orcamento.etapas_orcamento.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          Nenhuma etapa cadastrada. Comece adicionando uma (Fundação, Estrutura, Acabamento...).
        </Card>
      )}

      <div className="space-y-3">
        {orcamento.etapas_orcamento.map(etapa => {
          const isOpen = expanded.has(etapa.id)
          return (
            <Card key={etapa.id} className="p-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleExpand(etapa.id)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <Input
                  className="flex-1 font-medium"
                  defaultValue={etapa.nome}
                  disabled={readonly}
                  onBlur={e => handleRenameEtapa(etapa.id, e.target.value)}
                />
                <div className="text-sm font-semibold tabular-nums whitespace-nowrap">
                  {formatCurrency(etapaTotal(etapa))}
                </div>
                {!readonly && (
                  <AlertDialogConfirm
                    title={`Remover etapa "${etapa.nome}"?`}
                    description={`Todos os ${etapa.itens_orcamento.length} item(s) desta etapa serão apagados.`}
                    confirmLabel="Remover"
                    destructive
                    onConfirm={() => handleDeleteEtapa(etapa.id)}
                    trigger={
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                )}
              </div>

              {isOpen && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b">
                        <th className="text-left py-2 pr-2 font-medium w-[40%]">Descrição</th>
                        <th className="text-left py-2 px-2 font-medium">Un</th>
                        <th className="text-right py-2 px-2 font-medium">Qtd</th>
                        <th className="text-right py-2 px-2 font-medium">Preço unit.</th>
                        <th className="text-right py-2 px-2 font-medium">Subtotal</th>
                        <th className="text-left py-2 px-2 font-medium">SINAPI</th>
                        {!readonly && <th className="w-10" />}
                      </tr>
                    </thead>
                    <tbody>
                      {etapa.itens_orcamento.map(item => {
                        const subtotal = Number(item.quantidade) * Number(item.preco_unitario)
                        return (
                          <tr key={item.id} className="border-b last:border-b-0">
                            <td className="py-1 pr-2">
                              <Input
                                className="h-8"
                                defaultValue={item.descricao}
                                disabled={readonly}
                                onBlur={e => handleUpdateItem(item.id, etapa.id, { descricao: e.target.value })}
                              />
                            </td>
                            <td className="py-1 px-2">
                              <Input
                                className="h-8 w-16"
                                defaultValue={item.unidade}
                                disabled={readonly}
                                onBlur={e => handleUpdateItem(item.id, etapa.id, { unidade: e.target.value })}
                              />
                            </td>
                            <td className="py-1 px-2">
                              <Input
                                type="number"
                                step="0.0001"
                                className="h-8 w-24 text-right"
                                defaultValue={item.quantidade}
                                disabled={readonly}
                                onBlur={e => handleUpdateItem(item.id, etapa.id, { quantidade: Number(e.target.value) })}
                              />
                            </td>
                            <td className="py-1 px-2">
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 w-28 text-right"
                                defaultValue={item.preco_unitario}
                                disabled={readonly}
                                onBlur={e => handleUpdateItem(item.id, etapa.id, { preco_unitario: Number(e.target.value) })}
                              />
                            </td>
                            <td className="py-1 px-2 text-right font-medium tabular-nums whitespace-nowrap">
                              {formatCurrency(subtotal)}
                            </td>
                            <td className="py-1 px-2">
                              <Input
                                className="h-8 w-24"
                                defaultValue={item.codigo_sinapi ?? ''}
                                disabled={readonly}
                                onBlur={e => handleUpdateItem(item.id, etapa.id, { codigo_sinapi: e.target.value || null })}
                              />
                            </td>
                            {!readonly && (
                              <td className="py-1 px-2">
                                <Button size="icon" variant="ghost" onClick={() => handleDeleteItem(item.id, etapa.id)} className="h-7 w-7">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {!readonly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddItem(etapa.id, etapa.itens_orcamento.length)}
                      className="mt-2"
                      disabled={isPending}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Adicionar item
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Dialog nova etapa (substitui prompt() nativo) */}
      <Dialog open={novaEtapaOpen} onOpenChange={setNovaEtapaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova etapa</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitNovaEtapa} className="space-y-3">
            <div className="space-y-2">
              <Label>Nome da etapa *</Label>
              <Input
                autoFocus
                value={novaEtapaNome}
                onChange={e => setNovaEtapaNome(e.target.value)}
                placeholder="Ex: Fundação, Estrutura, Acabamento"
                required
                minLength={1}
                maxLength={100}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNovaEtapaOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending || !novaEtapaNome.trim()}>
                {isPending ? 'Criando...' : 'Criar etapa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? 'border-primary/40 bg-primary/5' : ''}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${highlight ? 'text-primary' : ''}`}>{value}</div>
    </Card>
  )
}
