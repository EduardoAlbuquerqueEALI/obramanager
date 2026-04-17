'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createMedicao } from '@/actions/medicoes'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/format'

type Empreendimento = {
  id: string
  name: string
  activeOrcamento: {
    id: string
    versao: number
    status: string
    etapas_orcamento: Array<{
      id: string
      nome: string
      sort_order: number
      itens_orcamento: Array<{ quantidade: number; preco_unitario: number }>
    }>
  } | null
}

export default function NovaMedicaoForm({ empreendimentos }: { empreendimentos: Empreendimento[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [empId, setEmpId] = useState<string>('')
  const [mesRef, setMesRef] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [observacoes, setObs] = useState('')
  const [percents, setPercents] = useState<Record<string, number>>({})

  const selectedEmp = useMemo(() => empreendimentos.find(e => e.id === empId), [empId, empreendimentos])
  const stages = useMemo(() => {
    if (!selectedEmp?.activeOrcamento) return []
    return [...selectedEmp.activeOrcamento.etapas_orcamento]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(s => ({
        id: s.id,
        nome: s.nome,
        subtotal: s.itens_orcamento.reduce((acc, it) => acc + Number(it.quantidade) * Number(it.preco_unitario), 0),
      }))
  }, [selectedEmp])

  const totalBudgeted = stages.reduce((a, s) => a + s.subtotal, 0)
  const totalPhysical = stages.reduce((a, s) => a + s.subtotal * (Number(percents[s.id] || 0) / 100), 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEmp?.activeOrcamento) { toast({ title: 'Selecione um empreendimento com orçamento', variant: 'destructive' }); return }

    startTransition(async () => {
      const result = await createMedicao({
        empreendimento_id: selectedEmp.id,
        orcamento_id: selectedEmp.activeOrcamento!.id,
        mes_referencia: `${mesRef}-01`,
        observacoes,
        etapas: stages.map(s => ({
          etapa_orcamento_id: s.id,
          percentual_fisico: Number(percents[s.id] || 0),
        })),
      })
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: 'Medição criada' })
      router.push(`/admin/medicoes/${result.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Empreendimento *</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {empreendimentos.filter(e => e.activeOrcamento).map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} — v{e.activeOrcamento!.versao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mês de referência *</Label>
            <Input type="month" value={mesRef} onChange={e => setMesRef(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea rows={2} value={observacoes} onChange={e => setObs(e.target.value)} />
        </div>
      </Card>

      {stages.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Avanço por etapa</h3>
          <div className="space-y-2">
            {stages.map(s => {
              const pct = Number(percents[s.id] || 0)
              return (
                <div key={s.id} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-5 font-medium text-sm">{s.nome}</div>
                  <div className="col-span-3 text-right text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(s.subtotal)}
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      className="text-right"
                      placeholder="%"
                      value={pct || ''}
                      onChange={e => setPercents(p => ({ ...p, [s.id]: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="col-span-2 text-right text-sm tabular-nums">
                    {formatCurrency(s.subtotal * (pct / 100))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between items-center mt-4 pt-3 border-t font-semibold">
            <span>Total</span>
            <div className="flex gap-8">
              <span className="text-muted-foreground">{formatCurrency(totalBudgeted)}</span>
              <span>{formatCurrency(totalPhysical)}</span>
            </div>
          </div>
        </Card>
      )}

      {selectedEmp && stages.length === 0 && (
        <Card className="p-4 text-sm text-amber-700 bg-amber-50 border-amber-200">
          O orçamento deste empreendimento não possui etapas cadastradas. Adicione etapas no orçamento antes de criar uma medição.
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push('/admin/medicoes')}>Cancelar</Button>
        <Button type="submit" disabled={isPending || stages.length === 0}>
          {isPending ? 'Salvando...' : 'Salvar medição'}
        </Button>
      </div>
    </form>
  )
}
