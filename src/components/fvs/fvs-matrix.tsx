'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FvsCell from './fvs-cell'

type Etapa = { id: string; title: string }
type Unidade = { id: string; number: string; floor: number; torre_id: string; torres: { name: string } | null }
type Cell = {
  id: string
  unidade_id: string
  template_item_id: string
  template_item_title: string
  status: 'nao_inspecionado' | 'aprovado' | 'reprovado' | 'aprovado_reinspecao'
  observacao: string | null
  solucao: string | null
  foto_url: string | null
  inspecionado_em: string | null
}

interface Props {
  fvsId: string
  etapas: Etapa[]
  unidades: Unidade[]
  cells: Cell[]
  floors: number[]
}

export default function FvsMatrix({ etapas, unidades, cells, floors }: Props) {
  const [activeFloor, setActiveFloor] = useState(String(floors[0] ?? 0))

  // Index cells por (unidade_id + template_item_id)
  const cellMap = new Map<string, Cell>()
  for (const c of cells) {
    cellMap.set(`${c.unidade_id}:${c.template_item_id}`, c)
  }

  return (
    <Tabs value={activeFloor} onValueChange={setActiveFloor}>
      <TabsList className="mb-4 flex-wrap h-auto gap-1">
        {floors.map(f => {
          const unitsOnFloor = unidades.filter(u => u.floor === f)
          const cellsOnFloor = cells.filter(c => unitsOnFloor.some(u => u.id === c.unidade_id))
          const done = cellsOnFloor.filter(c => c.status !== 'nao_inspecionado').length
          const total = cellsOnFloor.length
          const pct = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <TabsTrigger key={f} value={String(f)} className="gap-1.5">
              {f}º Andar
              <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
            </TabsTrigger>
          )
        })}
      </TabsList>

      {floors.map(floor => {
        const unitsOnFloor = unidades
          .filter(u => u.floor === floor)
          .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))

        // Stats do andar
        const cellsOnFloor = cells.filter(c => unitsOnFloor.some(u => u.id === c.unidade_id))
        const aprovados = cellsOnFloor.filter(c => c.status === 'aprovado' || c.status === 'aprovado_reinspecao').length
        const reprovados = cellsOnFloor.filter(c => c.status === 'reprovado').length
        const pendentes = cellsOnFloor.length - aprovados - reprovados

        return (
          <TabsContent key={floor} value={String(floor)}>
            {/* Stats do andar */}
            <div className="flex gap-4 text-xs mb-3">
              <span className="text-emerald-600 font-medium">✓ {aprovados} aprovados</span>
              <span className="text-red-600 font-medium">✗ {reprovados} reprovados</span>
              <span className="text-muted-foreground">○ {pendentes} pendentes</span>
              <span className="text-muted-foreground ml-auto">{unitsOnFloor.length} unidades</span>
            </div>

            <Card className="p-0 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-3 pl-4 pr-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky left-0 bg-muted/40 min-w-[220px] z-10">
                      Etapa / Serviço
                    </th>
                    {unitsOnFloor.map(u => (
                      <th
                        key={u.id}
                        className="py-3 px-1 text-center font-semibold text-xs min-w-[72px]"
                      >
                        <div>Apto</div>
                        <div className="text-base font-bold">{u.number}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {etapas.map((etapa, i) => (
                    <tr key={etapa.id} className={`border-b ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                      <td className="py-3 pl-4 pr-2 sticky left-0 bg-background z-10 min-w-[220px]">
                        <div className="font-medium">{etapa.title}</div>
                      </td>
                      {unitsOnFloor.map(u => {
                        const cell = cellMap.get(`${u.id}:${etapa.id}`)
                        if (!cell) return <td key={u.id} className="py-2 px-1 text-center text-muted-foreground">—</td>
                        return (
                          <td key={u.id} className="py-2 px-1 text-center">
                            <FvsCell cell={cell} />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
