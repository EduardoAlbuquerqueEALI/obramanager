'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { getUnidadesStatusByArea, type TorreWithAreaStatus, type UnidadeAreaStatus } from '@/actions/member'
import ChecklistArea from './checklist-area'
import { cn } from '@/lib/utils'

interface AreaUnitPreviewProps {
  empreendimentoId: string
  areaId: string
  areaName: string
  orgId: string
  initialTorres: TorreWithAreaStatus[]
}

const bgForStatus: Record<UnidadeAreaStatus['status_area'], string> = {
  pending: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
  in_progress: 'bg-amber-400 hover:bg-amber-500 text-slate-900',
  completed: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  issue: 'bg-rose-500 hover:bg-rose-600 text-white',
}

export default function AreaUnitPreview({
  empreendimentoId,
  areaId,
  areaName,
  orgId,
  initialTorres,
}: AreaUnitPreviewProps) {
  const [torres, setTorres] = useState<TorreWithAreaStatus[]>(initialTorres)
  const [selectedUnit, setSelectedUnit] = useState<UnidadeAreaStatus | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [, startTransition] = useTransition()

  const reload = useCallback(() => {
    startTransition(async () => {
      const result = await getUnidadesStatusByArea(empreendimentoId, areaId)
      if (result.torres) setTorres(result.torres)
    })
  }, [empreendimentoId, areaId])

  // Realtime: any change on unidade_checklist_items → reload
  useEffect(() => {
    const sb = createClient()
    const channel = sb
      .channel(`area-preview-${empreendimentoId}-${areaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unidade_checklist_items',
        },
        () => reload(),
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [empreendimentoId, areaId, reload])

  // Totals across all torres
  const allUnits = torres.flatMap(t => t.unidades)
  const totalUnits = allUnits.length
  const completedUnits = allUnits.filter(u => u.status_area === 'completed').length

  if (torres.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-slate-400">
        Nenhuma torre cadastrada.
      </div>
    )
  }

  return (
    <>
      <Tabs defaultValue={torres[0]?.id} className="w-full">
        <div className="px-4 pt-4 pb-3 sticky top-0 bg-slate-950 z-10 border-b border-slate-800">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-base font-semibold text-white">{areaName}</h2>
            <p className="text-xs text-slate-400">
              <span className="text-emerald-400 font-semibold">{completedUnits}</span>
              <span className="text-slate-500"> / {totalUnits} unidades concluídas</span>
            </p>
          </div>

          <TabsList className="bg-slate-900 p-1 h-auto">
            {torres.map(torre => (
              <TabsTrigger
                key={torre.id}
                value={torre.id}
                className="text-xs px-3 py-1.5 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300"
              >
                {torre.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {torres.map(torre => {
          const floorMap = new Map<number, UnidadeAreaStatus[]>()
          for (const u of torre.unidades) {
            const arr = floorMap.get(u.floor) ?? []
            arr.push(u)
            floorMap.set(u.floor, arr)
          }
          const floors = Array.from(floorMap.keys()).sort((a, b) => b - a)
          const maxCols = Math.max(...Array.from(floorMap.values()).map(a => a.length), 1)

          return (
            <TabsContent key={torre.id} value={torre.id} className="mt-0">
              <div className="p-4 overflow-x-auto">
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `40px repeat(${maxCols}, minmax(56px, 1fr))` }}
                >
                  {floors.map(floor => {
                    const units = (floorMap.get(floor) ?? []).sort((a, b) =>
                      a.number.localeCompare(b.number, undefined, { numeric: true }),
                    )
                    return (
                      <FloorRow
                        key={floor}
                        floor={floor}
                        units={units}
                        maxCols={maxCols}
                        onClick={(u) => {
                          setSelectedUnit(u)
                          setSheetOpen(true)
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Legend */}
      <div className="px-4 pb-20 pt-2 flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-700 inline-block" /> Pendente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Em andamento
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Concluído
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-500 inline-block" /> Problema
        </span>
      </div>

      {/* Checklist sheet: goes directly into this area */}
      {selectedUnit && (
        <ChecklistArea
          open={sheetOpen}
          onClose={() => { setSheetOpen(false); reload() }}
          unidadeId={selectedUnit.unidade_id}
          unidadeNumber={selectedUnit.number}
          areaId={areaId}
          areaName={areaName}
          orgId={orgId}
        />
      )}
    </>
  )
}

function FloorRow({
  floor,
  units,
  maxCols,
  onClick,
}: {
  floor: number
  units: UnidadeAreaStatus[]
  maxCols: number
  onClick: (u: UnidadeAreaStatus) => void
}) {
  return (
    <>
      <div className="flex items-center justify-end pr-1 text-xs font-medium text-slate-400 min-h-[60px]">
        {floor}º
      </div>
      {units.map(u => (
        <button
          key={u.unidade_id}
          type="button"
          onClick={() => onClick(u)}
          className={cn(
            'rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center min-h-[60px]',
            bgForStatus[u.status_area],
          )}
        >
          <span className="truncate px-1">{u.number}</span>
        </button>
      ))}
      {Array.from({ length: maxCols - units.length }).map((_, idx) => (
        <div key={`empty-${floor}-${idx}`} />
      ))}
    </>
  )
}
